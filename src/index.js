import snmp from 'net-snmp';
import Mib2System from './mib/mib2.system.js';
import Mib2Interfaces from './mib/mib2.interfaces.js';
import BatteryMib from './mib/battery.mib.js';
import BatteryModbusReader from './modbus/BatteryModbusReader.js';
import ModbusDeviceClient from './modbus/ModbusDeviceClient.js';

const port = Number(process.env.SNMP_AGENT_PORT ?? 161);
const address = process.env.SNMP_AGENT_ADDR ?? '0.0.0.0';
const readCommunity = process.env.SNMP_READ_COMMUNITY ?? 'public';
const writeCommunity = process.env.SNMP_WRITE_COMMUNITY ?? 'private';


const agentOptions = {
  port,
  address,
  accessControlModelType: snmp.AccessControlModelType.Simple
};

const agent = snmp.createAgent(agentOptions, (error, data) => {
  if (error) {
    console.error('Agent error:', error.message || error);
    return;
  }
  
  const pduType = data && data.pdu && data.pdu.type;
  const varbinds = (data && data.pdu && data.pdu.varbinds) || [];
  
  console.log(`[SNMP REQUEST] type=${pduType}, varbinds=${varbinds.length}`);
  
  // Log each varbind request
  varbinds.forEach((vb, index) => {
    console.log(`  [${index}] OID: ${vb.oid}, Type: ${vb.type}`);
  });
  
  // Handle different PDU types
  if (pduType === snmp.PduType.GetRequest || pduType === snmp.PduType.GetNextRequest) {
    console.log('Processing GET/GETNEXT request...');
  } else if (pduType === snmp.PduType.SetRequest) {
    console.log('Processing SET request...');
    // Handle write requests
    varbinds.forEach((vb, index) => {
      console.log(`  [${index}] Setting OID: ${vb.oid} = ${vb.value}`);
      // Try to handle write request in MIB modules
      mib2System.handleWriteRequest(vb.oid, vb.value);
    });
  }
});

const authorizer = agent.getAuthorizer();

// Add both read and write communities
authorizer.addCommunity(readCommunity);
authorizer.addCommunity(writeCommunity);

const acm = authorizer.getAccessControlModel();

// Set different access levels for each community
acm.setCommunityAccess(readCommunity, snmp.AccessLevel.ReadOnly);
acm.setCommunityAccess(writeCommunity, snmp.AccessLevel.ReadWrite);

// Initialize MIB-2 Groups
const mib = agent.getMib();
const mib2System = new Mib2System(agent, mib);
const mib2Interfaces = new Mib2Interfaces(agent, mib);

// Initialize Battery MIB (8 modules)
const batteryMib = new BatteryMib(agent, mib);

// sysUpTime is automatically updated by Mib2System

console.log(`[SNMP Agent] listening on ${address}:${port}`);
console.log(`  Read Community:  ${readCommunity} (read-only)`);
console.log(`  Write Community: ${writeCommunity} (read-write)`);
console.log('\nAvailable OIDs:');
console.log('System Group:');
mib2System.getAvailableOids().forEach(oid => console.log(`  ${oid}`));
console.log('Interfaces Group:');
mib2Interfaces.getAvailableOids().forEach(oid => console.log(`  ${oid}`));
console.log('\nBattery System (8 modules):');
console.log('  Sample OIDs:');
console.log(`    1.3.6.1.4.1.64016.1.1.1.1  - Module 1 Cell 1 voltage`);
console.log(`    1.3.6.1.4.1.64016.1.2.10   - Module 1 SOC`);
console.log(`    1.3.6.1.4.1.64016.1.3.1    - Module 1 Cell overvoltage alarms`);
console.log(`    1.3.6.1.4.1.64016.8.1.1    - Module 8 Cell 1 voltage`);
console.log(`    1.3.6.1.4.1.64016.8.2.10   - Module 8 SOC`);

console.log('\nRead-Write OIDs:');
mib2System.getReadWriteOids().forEach(oid => console.log(`  ${oid.oid} - ${oid.name}`));
console.log('Battery Parameters (writable):');
batteryMib.getReadWriteOids().slice(0, 5).forEach(oid => console.log(`  ${oid.oid} - ${oid.name}`));
console.log('  ... (and more for modules 1-8)');

console.log('\nTry:');
console.log(`  System: snmpget -v2c -c ${readCommunity} 127.0.0.1:${port} 1.3.6.1.2.1.1.1.0`);
console.log(`  Battery: snmpget -v2c -c ${readCommunity} 127.0.0.1:${port} 1.3.6.1.4.1.64016.1.1.1.1`);
console.log(`  Write: snmpset -v2c -c ${writeCommunity} 127.0.0.1:${port} 1.3.6.1.4.1.64016.1.4.1.0 u 4250`);

const modbusDeviceClient = new ModbusDeviceClient();
modbusDeviceClient.connect().then(() => {
    const batteryReader = new BatteryModbusReader(modbusDeviceClient);
    
    // BatteryMib에 Modbus Reader 설정 및 데이터 업데이트 시작
    setTimeout(() => {
        console.log('\n=== SNMP 배터리 데이터 업데이트 시작 ===');
        batteryMib.setModbusReader(batteryReader);
        batteryMib.startDataUpdate();
    }, 2000); // 2초 후 시작
});

process.on('SIGINT', () => {
  console.log('Shutting down SNMP agent');
  process.exit(0);
});
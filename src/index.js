import snmp from 'net-snmp';
import Mib2System from './mib/mib2.system.js';
import Mib2Interfaces from './mib/mib2.interfaces.js';
import BatteryMib from './mib/battery.mib.js';
import { dataBaseConnect } from './dataBaseConnect.js';
import loggerWinston from './loggerWinston.js';
// nodemon 테스트 주석 - 수정됨
import BatteryModbusReader from './modbus/BatteryModbusReader.js';
import ModbusDeviceClient from './modbus/ModbusDeviceClient.js';
import NaradaProtocolClient from './modbus/NaradaProtocolClient.js';
import NaradaDataParser from './modbus/NaradaDataParser.js';
import { startApiServer, setBatteryMibInstance } from './apiServer.js';
const port = Number(process.env.SNMP_AGENT_PORT ?? 1161);
const address = process.env.SNMP_AGENT_ADDR ?? '0.0.0.0';
const readCommunity = process.env.SNMP_READ_COMMUNITY ?? 'public';
const writeCommunity = process.env.SNMP_WRITE_COMMUNITY ?? 'private';



const agentOptions = {
  port,
  address,
  accessControlModelType: snmp.AccessControlModelType.Simple
};

//   
const agent = snmp.createAgent(agentOptions, (error, data) => {
  if (error) {
    loggerWinston.error('Agent error:', error.message || error);
    return;
  }
  const pduType = data && data.pdu && data.pdu.type;
  const varbinds = (data && data.pdu && data.pdu.varbinds) || [];
  
  loggerWinston.info(`[SNMP REQUEST] type=${pduType}, varbinds=${varbinds.length}`);
  // Log each varbind request
  varbinds.forEach((vb, index) => {
    loggerWinston.info(`  [${index}] OID: ${vb.oid}, Type: ${vb.type}`);
  });
  
  // Handle different PDU types
  if (pduType === snmp.PduType.GetRequest || pduType === snmp.PduType.GetNextRequest) {
    loggerWinston.info('Processing GET/GETNEXT request...');
  } else if (pduType === snmp.PduType.SetRequest) {
    loggerWinston.info('Processing SET request...');
    // Handle write requests
    varbinds.forEach((vb, index) => {
      loggerWinston.info(`  [${index}] Setting OID: ${vb.oid} = ${vb.value}`);
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

loggerWinston.info(`[SNMP Agent] listening on ${address}:${port}`);
loggerWinston.info(`  Read Community:  ${readCommunity} (read-only)`);
loggerWinston.info(`  Write Community: ${writeCommunity} (read-write)`);
loggerWinston.info('\nAvailable OIDs:');
loggerWinston.info('System Group:');
mib2System.getAvailableOids().forEach(oid => loggerWinston.info(`  ${oid}`));
loggerWinston.info('Interfaces Group:');
mib2Interfaces.getAvailableOids().forEach(oid => loggerWinston.info(`  ${oid}`));
loggerWinston.info('\nBattery System (8 modules):');
loggerWinston.info('  Sample OIDs:');
loggerWinston.info(`    1.3.6.1.4.1.64016.1.1.1.1  - Module 1 Cell 1 voltage`);
loggerWinston.info(`    1.3.6.1.4.1.64016.1.2.10   - Module 1 SOC`);
loggerWinston.info(`    1.3.6.1.4.1.64016.1.3.1    - Module 1 Cell overvoltage alarms`);
loggerWinston.info(`    1.3.6.1.4.1.64016.8.1.1    - Module 8 Cell 1 voltage`);
loggerWinston.info(`    1.3.6.1.4.1.64016.8.2.10   - Module 8 SOC`);

loggerWinston.info('\nRead-Write OIDs:');
mib2System.getReadWriteOids().forEach(oid => loggerWinston.info(`  ${oid.oid} - ${oid.name}`));
loggerWinston.info('Battery Parameters (writable):');
batteryMib.getReadWriteOids().slice(0, 5).forEach(oid => loggerWinston.info(`  ${oid.oid} - ${oid.name}`));
loggerWinston.info('  ... (and more for modules 1-8)');

loggerWinston.info('\nTry:');
loggerWinston.info(`  System: snmpget -v2c -c ${readCommunity} 127.0.0.1:${port} 1.3.6.1.2.1.1.1.0`);
loggerWinston.info(`  Battery: snmpget -v2c -c ${readCommunity} 127.0.0.1:${port} 1.3.6.1.4.1.64016.1.1.1.1`);
loggerWinston.info(`  Write: snmpset -v2c -c ${writeCommunity} 127.0.0.1:${port} 1.3.6.1.4.1.64016.1.4.1.0 u 4250`);

// 데이터베이스 초기화
await dataBaseConnect.initialize();

// 프로토콜 타입 선택 (환경변수 또는 기본값)
const protocolType = process.env.PROTOCOL_TYPE || 'modbus'; // 'modbus' 또는 'narada'
const serialPort = process.env.SERIAL_PORT || '/dev/ttyDevice485'; // 시리얼 포트 경로

let deviceClient;

if (protocolType === 'narada') {
    // Narada 프로토콜 사용
    deviceClient = new NaradaProtocolClient(serialPort, 9600);
    console.log(`Narada 프로토콜 사용 - 포트: ${serialPort}`);
} else {
    // Modbus 프로토콜 사용 (기존 방식)
    deviceClient = new ModbusDeviceClient();
    console.log('Modbus 프로토콜 사용');
}

const rackData = await dataBaseConnect.getRackData();

deviceClient.connect().then(async () => {
    console.log(`${protocolType} 연결 완료`);
    
    if (protocolType === 'modbus') {
        deviceClient.setID(39);
    }
    
    // API 서버에 BatteryMib 인스턴스 설정 (먼저 설정하여 API 서버가 즉시 시작 가능)
    setBatteryMibInstance(batteryMib);
    
    // API 서버를 먼저 시작 (초기 데이터 읽기를 기다리지 않음)
    startApiServer();
    console.log('API 서버가 시작되었습니다. 초기 데이터 읽기는 백그라운드에서 진행됩니다.');
    
    // BatteryMib에 ModbusReader 설정 및 초기 데이터 읽기 (백그라운드에서 비동기로 실행)
    batteryMib.setModbusReader(deviceClient, protocolType).then(() => {
        loggerWinston.info('[Battery MIB] 초기 데이터 읽기 완료 - API 서버가 데이터를 제공할 준비가 되었습니다.');
    }).catch((error) => {
        loggerWinston.error('[Battery MIB] 초기 데이터 읽기 실패:', error.message);
    });
    
    // 2초 후 주기적 데이터 업데이트 시작
    // setTimeout(() => {
    //     console.log('\n=== 주기적 배터리 데이터 읽기 및 SNMP 업데이트 시작 ===');
    //     batteryMib.startDataUpdate();
    // }, 2000);
});

process.on('SIGINT', () => {
  loggerWinston.info('Shutting down SNMP agent');
  process.exit(0);
});
import snmp from 'net-snmp';
import os from 'os';

/**
 * MIB-2 System Group (RFC1213-MIB)
 * OID: 1.3.6.1.2.1.1
 */
class Mib2System {
  constructor(agent, mib) {
    this.agent = agent;
    this.mib = mib;
    this.systemProviders = [];
    this.init();
  }

  init() {
    this.createSystemProviders();
    this.registerProviders();
    this.setValues();
    this.startUptimeUpdater();
  }

  createSystemProviders() {
    this.systemProviders = [
      {
        name: 'sysDescr',
        oid: '1.3.6.1.2.1.1.1',
        type: snmp.ObjectType.OctetString,
        value: process.env.SNMP_SYS_DESCR || 'Node SNMP Agent',
        access: 'read-only'
      },
      {
        name: 'sysObjectID',
        oid: '1.3.6.1.2.1.1.2',
        type: snmp.ObjectType.ObjectIdentifier,
        value: '1.3.6.1.4.1.12345.1', // Private enterprise OID
        access: 'read-only'
      },
      {
        name: 'sysUpTime',
        oid: '1.3.6.1.2.1.1.3',
        type: snmp.ObjectType.TimeTicks,
        value: () => Math.floor(process.uptime() * 100), // Convert to centiseconds
        access: 'read-only'
      },
      {
        name: 'sysContact',
        oid: '1.3.6.1.2.1.1.4',
        type: snmp.ObjectType.OctetString,
        value: process.env.SNMP_SYS_CONTACT || 'admin@localhost',
        access: 'read-write'
      },
      {
        name: 'sysName',
        oid: '1.3.6.1.2.1.1.5',
        type: snmp.ObjectType.OctetString,
        value: process.env.SNMP_SYS_NAME || os.hostname(),
        access: 'read-write'
      },
      {
        name: 'sysLocation',
        oid: '1.3.6.1.2.1.1.6',
        type: snmp.ObjectType.OctetString,
        value: process.env.SNMP_SYS_LOCATION || 'Unknown',
        access: 'read-write'
      },
      {
        name: 'sysServices',
        oid: '1.3.6.1.2.1.1.7',
        type: snmp.ObjectType.Integer,
        value: 72, // Application layer (64) + Transport layer (8)
        access: 'read-only'
      }
    ];
  }

  registerProviders() {
    this.systemProviders.forEach(provider => {
      const providerObj = {
        name: provider.name,
        type: snmp.MibProviderType.Scalar,
        oid: provider.oid,
        scalarType: provider.type,
        maxAccess: snmp.MaxAccess[provider.access]
      };
      
      this.agent.registerProvider(providerObj);
    });
  }

  setValues() {
    this.systemProviders.forEach(provider => {
      const value = typeof provider.value === 'function' ? provider.value() : provider.value;
      this.mib.setScalarValue(provider.name, value);
    });
  }

  startUptimeUpdater() {
    // Update sysUpTime every 10 seconds
    setInterval(() => {
      const uptime = Math.floor(process.uptime() * 100);
      this.mib.setScalarValue('sysUpTime', uptime);
    }, 10000);
  }

  getAvailableOids() {
    return [
      '1.3.6.1.2.1.1.1.0  - sysDescr',
      '1.3.6.1.2.1.1.2.0  - sysObjectID',
      '1.3.6.1.2.1.1.3.0  - sysUpTime',
      '1.3.6.1.2.1.1.4.0  - sysContact',
      '1.3.6.1.2.1.1.5.0  - sysName',
      '1.3.6.1.2.1.1.6.0  - sysLocation',
      '1.3.6.1.2.1.1.7.0  - sysServices'
    ];
  }

  updateValue(oidName, value) {
    this.mib.setScalarValue(oidName, value);
  }

  // Handle write requests for read-write OIDs
  handleWriteRequest(oid, value) {
    const provider = this.systemProviders.find(p => p.oid === oid);
    if (provider && provider.access === 'read-write') {
      this.mib.setScalarValue(provider.name, value);
      console.log(`[MIB2-System] Updated ${provider.name} to: ${value}`);
      return true;
    }
    return false;
  }

  // Get read-write OIDs
  getReadWriteOids() {
    return this.systemProviders
      .filter(p => p.access === 'read-write')
      .map(p => ({ name: p.name, oid: p.oid }));
  }
}

export default Mib2System;

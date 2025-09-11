const snmp = require('net-snmp');
const os = require('os');

/**
 * MIB-2 Interfaces Group (RFC1213-MIB)
 * OID: 1.3.6.1.2.1.2
 */
class Mib2Interfaces {
  constructor(agent, mib) {
    this.agent = agent;
    this.mib = mib;
    this.interfaceProviders = [];
    this.init();
  }

  init() {
    this.createInterfaceProviders();
    this.registerProviders();
    this.setValues();
    this.updateWithRealInterfaceData();
  }

  createInterfaceProviders() {
    this.interfaceProviders = [
      {
        name: 'ifNumber',
        oid: '1.3.6.1.2.1.2.1',
        type: snmp.ObjectType.Integer,
        value: 1 // We have 1 interface
      },
      {
        name: 'ifIndex',
        oid: '1.3.6.1.2.1.2.2.1.1',
        type: snmp.ObjectType.Integer,
        value: 1
      },
      {
        name: 'ifDescr',
        oid: '1.3.6.1.2.1.2.2.1.2',
        type: snmp.ObjectType.OctetString,
        value: 'eth0'
      },
      {
        name: 'ifType',
        oid: '1.3.6.1.2.1.2.2.1.3',
        type: snmp.ObjectType.Integer,
        value: 6 // ethernetCsmacd
      },
      {
        name: 'ifMtu',
        oid: '1.3.6.1.2.1.2.2.1.4',
        type: snmp.ObjectType.Integer,
        value: 1500
      },
      {
        name: 'ifSpeed',
        oid: '1.3.6.1.2.1.2.2.1.5',
        type: snmp.ObjectType.Gauge,
        value: 1000000000 // 1Gbps
      },
      {
        name: 'ifPhysAddress',
        oid: '1.3.6.1.2.1.2.2.1.6',
        type: snmp.ObjectType.OctetString,
        value: '00:00:00:00:00:00'
      },
      {
        name: 'ifAdminStatus',
        oid: '1.3.6.1.2.1.2.2.1.7',
        type: snmp.ObjectType.Integer,
        value: 1 // up
      },
      {
        name: 'ifOperStatus',
        oid: '1.3.6.1.2.1.2.2.1.8',
        type: snmp.ObjectType.Integer,
        value: 1 // up
      }
    ];
  }

  registerProviders() {
    this.interfaceProviders.forEach(provider => {
      const providerObj = {
        name: provider.name,
        type: snmp.MibProviderType.Scalar,
        oid: provider.oid,
        scalarType: provider.type,
        maxAccess: snmp.MaxAccess['read-only']
      };
      
      this.agent.registerProvider(providerObj);
    });
  }

  setValues() {
    this.interfaceProviders.forEach(provider => {
      const value = typeof provider.value === 'function' ? provider.value() : provider.value;
      this.mib.setScalarValue(provider.name, value);
    });
  }

  updateWithRealInterfaceData() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = Object.keys(networkInterfaces).filter(name => 
      !networkInterfaces[name].some(iface => iface.internal)
    );

    if (interfaces.length > 0) {
      const iface = interfaces[0];
      const ifaceData = networkInterfaces[iface].find(addr => addr.family === 'IPv4');
      
      // Update interface description with actual interface name
      this.mib.setScalarValue('ifDescr', iface);
      
      // Update MAC address if available
      if (ifaceData && ifaceData.mac) {
        this.mib.setScalarValue('ifPhysAddress', ifaceData.mac);
      }
    }
  }

  getAvailableOids() {
    return [
      '1.3.6.1.2.1.2.1.0  - ifNumber',
      '1.3.6.1.2.1.2.2.1.1  - ifIndex',
      '1.3.6.1.2.1.2.2.1.2  - ifDescr',
      '1.3.6.1.2.1.2.2.1.3  - ifType',
      '1.3.6.1.2.1.2.2.1.4  - ifMtu',
      '1.3.6.1.2.1.2.2.1.5  - ifSpeed',
      '1.3.6.1.2.1.2.2.1.6  - ifPhysAddress',
      '1.3.6.1.2.1.2.2.1.7  - ifAdminStatus',
      '1.3.6.1.2.1.2.2.1.8  - ifOperStatus'
    ];
  }

  updateValue(oidName, value) {
    this.mib.setScalarValue(oidName, value);
  }

  addInterface(interfaceData) {
    // Future: Add support for multiple interfaces
    // This would require dynamic OID generation
  }
}

module.exports = Mib2Interfaces;

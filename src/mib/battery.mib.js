/**
 * IFTECH 48V 배터리 시스템 MIB 모듈 (8개 모듈 지원)
 * SNMP 서비스에 배터리 데이터를 등록하는 클래스
 */

import snmp from 'net-snmp';
import { BatterySystemData } from '../models/BatteryData.js';
import BatteryModbusReader from '../modbus/BatteryModbusReader.js';

class BatteryMib {
    constructor(agent, mib) {
        this.agent = agent;
        this.mib = mib;
        this.batterySystem = new BatterySystemData();
        this.modbusReader = null; // 실제 Modbus 클라이언트가 연결되면 설정
        
        // 8개 모듈 초기화
        for (let i = 1; i <= 8; i++) {
            this.batterySystem.addModule(i);
        }
        
        this.initializeOids();
        this.startDataUpdate();
    }

    /**
     * OID 등록 및 핸들러 설정
     */
    initializeOids() {
        // 모듈 1-8에 대한 OID 등록
        for (let moduleId = 1; moduleId <= 8; moduleId++) {
            this.registerModuleOids(moduleId);
        }
        
        // 더미 OID 등록 (getNext 무한루프 방지)
        this.registerDummyOids();
        
        console.log(`[Battery MIB] Registered OIDs for 8 modules + dummy OIDs`);
    }

    /**
     * 특정 모듈의 OID들을 등록
     * @param {number} moduleId - 모듈 ID (1-8)
     */
    registerModuleOids(moduleId) {
        const baseOid = `1.3.6.1.4.1.64016.${moduleId}`;
        
        // 셀 전압 OID들 (16개 셀)
        for (let cellIndex = 1; cellIndex <= 16; cellIndex++) {
            const oid = `${baseOid}.1.${cellIndex}`;
            const providerName = `mod${moduleId}Cell${cellIndex}Voltage`;
            
            this.agent.registerProvider({
                name: providerName,
                type: snmp.MibProviderType.Scalar,
                oid: oid,
                scalarType: snmp.ObjectType.Unsigned32,
                maxAccess: snmp.MaxAccess['read-only']
            });
            
            // 초기 값 설정
            this.mib.setScalarValue(providerName, 0);
        }

        // 팩 정보 OID들
        const packInfoOids = [
            { index: 1, name: 'cellMaxVoltage', key: 'cellMaxVoltage' },
            { index: 2, name: 'cellMinVoltage', key: 'cellMinVoltage' },
            { index: 3, name: 'cellAvgVoltage', key: 'cellAvgVoltage' },
            { index: 4, name: 'avgTemp', key: 'avgTemp' },
            { index: 5, name: 'ambTemp', key: 'ambTemp' },
            { index: 6, name: 'totalVoltage', key: 'totalVoltage' },
            { index: 7, name: 'packVoltage', key: 'packVoltage' },
            { index: 8, name: 'chargeCurrent', key: 'chargeCurrent' },
            { index: 9, name: 'dischargeCurrent', key: 'dischargeCurrent' },
            { index: 10, name: 'soc', key: 'soc' },
            { index: 11, name: 'soh', key: 'soh' },
            { index: 12, name: 'ratedCapacity', key: 'ratedCapacity' },
            { index: 13, name: 'remainingCapacity', key: 'remainingCapacity' },
            { index: 14, name: 'runningState', key: 'runningState' }
        ];

        packInfoOids.forEach(({ index, name, key }) => {
            const oid = `${baseOid}.2.${index}`;
            const providerName = `mod${moduleId}Pack${name}`;
            
            this.agent.registerProvider({
                name: providerName,
                type: snmp.MibProviderType.Scalar,
                oid: oid,
                scalarType: snmp.ObjectType.Unsigned32,
                maxAccess: snmp.MaxAccess['read-only']
            });
            
            // 초기 값 설정
            this.mib.setScalarValue(providerName, 0);
        });

        // 알람 상태 OID들
        const alarmOids = [
            { index: 1, name: 'cellOvervoltageAlarms', key: 'cellOvervoltageAlarms' },
            { index: 2, name: 'cellUndervoltageAlarms', key: 'cellUndervoltageAlarms' },
            { index: 7, name: 'packOvervoltageAlarm', key: 'packOvervoltageAlarm' },
            { index: 8, name: 'packUndervoltageAlarm', key: 'packUndervoltageAlarm' },
            { index: 9, name: 'chargeOvercurrentAlarm', key: 'chargeOvercurrentAlarm' },
            { index: 10, name: 'dischargeOvercurrentAlarm', key: 'dischargeOvercurrentAlarm' },
            { index: 11, name: 'socLowAlarm', key: 'socLowAlarm' }
        ];

        alarmOids.forEach(({ index, name, key }) => {
            const oid = `${baseOid}.3.${index}`;
            const providerName = `mod${moduleId}Alarm${name}`;
            
            this.agent.registerProvider({
                name: providerName,
                type: snmp.MibProviderType.Scalar,
                oid: oid,
                scalarType: snmp.ObjectType.Unsigned32,
                maxAccess: snmp.MaxAccess['read-only']
            });
            
            // 초기 값 설정
            this.mib.setScalarValue(providerName, 0);
        });

        // 파라미터 OID들 (읽기/쓰기 가능)
        const parameterOids = [
            { index: 1, name: 'cellOvervoltageAlarmValue', key: 'cellOvervoltageAlarmValue' },
            { index: 2, name: 'cellOvervoltageAlarmRecovery', key: 'cellOvervoltageAlarmRecovery' },
            { index: 3, name: 'cellUndervoltageAlarmValue', key: 'cellUndervoltageAlarmValue' },
            { index: 4, name: 'cellUndervoltageAlarmRecovery', key: 'cellUndervoltageAlarmRecovery' },
            { index: 6, name: 'socLowAlarmValue', key: 'socLowAlarmValue' }
        ];

        parameterOids.forEach(({ index, name, key }) => {
            const oid = `${baseOid}.4.${index}`;
            const providerName = `mod${moduleId}Param${name}`;
            
            this.agent.registerProvider({
                name: providerName,
                type: snmp.MibProviderType.Scalar,
                oid: oid,
                scalarType: snmp.ObjectType.Unsigned32,
                maxAccess: snmp.MaxAccess['read-write']
            });
            
            // 초기 값 설정
            this.mib.setScalarValue(providerName, 0);
        });
    }

    /**
     * 더미 OID 등록 (getNext 무한루프 방지)
     */
    registerDummyOids() {
        // bmsModule8 다음에 더미 OID 추가
        const dummyOids = [
            {
                name: 'bmsDummyEnd',
                oid: '1.3.6.1.4.1.64016.9',
                type: snmp.ObjectType.OctetString,
                value: 'End of Battery MIB',
                access: 'read-only'
            },
            {
                name: 'bmsDummyEnd2',
                oid: '1.3.6.1.4.1.64017',
                type: snmp.ObjectType.OctetString,
                value: 'End of 64016 Enterprise',
                access: 'read-only'
            }
        ];

        dummyOids.forEach(provider => {
            this.agent.registerProvider({
                name: provider.name,
                type: snmp.MibProviderType.Scalar,
                oid: provider.oid,
                scalarType: provider.type,
                maxAccess: snmp.MaxAccess[provider.access]
            });
            
            // 값 설정
            this.mib.setScalarValue(provider.name, provider.value);
        });
    }

    /**
     * 데이터 업데이트 시작 (시뮬레이션)
     */
    startDataUpdate() {
        // 실제 환경에서는 Modbus를 통해 데이터를 읽어옴
        // 여기서는 시뮬레이션 데이터로 업데이트
        //this.updateSimulatedData();
        
        // 5초마다 데이터 업데이트
        setInterval(() => {
            //this.updateSimulatedData();
            this.updateFromModbus();
        }, 5000);
    }

    /**
     * 시뮬레이션 데이터 업데이트
     */
    updateSimulatedData() {
        console.log("updateSimulatedData");
        for (let moduleId = 1; moduleId <= 8; moduleId++) {
            const module = this.batterySystem.getModule(moduleId);
            if (!module) continue;

            // 셀 전압 시뮬레이션 (3800mV ± 50mV)
            const baseVoltage = 3800 + (moduleId - 1) * 10; // 모듈별로 약간씩 다름
            const cellVoltages = [];
            for (let i = 0; i < 16; i++) {
                const variation = (Math.random() - 0.5) * 100; // ±50mV 변동
                cellVoltages.push(Math.max(0, baseVoltage + variation));
            }
            module.cellVoltage.setAllCellVoltages(cellVoltages);

            // 팩 정보 시뮬레이션
            module.packInfo.avgTemp = 20 + Math.random() * 20; // 20-40°C
            module.packInfo.ambTemp = module.packInfo.avgTemp - 2;
            module.packInfo.totalVoltage = module.cellVoltage.avgVoltage * 16;
            module.packInfo.packVoltage = module.packInfo.totalVoltage;
            module.packInfo.chargeCurrent = Math.random() > 0.7 ? Math.floor(Math.random() * 2000) : 0;
            module.packInfo.dischargeCurrent = Math.random() > 0.3 ? Math.floor(Math.random() * 1500) : 0;
            module.packInfo.soc = Math.floor(20 + Math.random() * 60); // 20-80%
            module.packInfo.soh = Math.floor(80 + Math.random() * 20); // 80-100%
            module.packInfo.ratedCapacity = 10000;
            module.packInfo.remainingCapacity = Math.floor(module.packInfo.ratedCapacity * module.packInfo.soc / 100);
            module.packInfo.runningState = module.packInfo.chargeCurrent > 0 ? 1 : 
                                          module.packInfo.dischargeCurrent > 0 ? 2 : 3;

            // 알람 상태 시뮬레이션
            module.alarms.cellOvervoltageAlarms = 0;
            module.alarms.cellUndervoltageAlarms = 0;
            module.alarms.packOvervoltageAlarm = 0;
            module.alarms.packUndervoltageAlarm = 0;
            module.alarms.chargeOvercurrentAlarm = 0;
            module.alarms.dischargeOvercurrentAlarm = 0;
            module.alarms.socLowAlarm = module.packInfo.soc < 20 ? 1 : 0;

            // 파라미터 기본값 설정
            if (module.parameters.cellOvervoltageAlarmValue === 0) {
                module.parameters.cellOvervoltageAlarmValue = 4200;
                module.parameters.cellOvervoltageAlarmRecovery = 4100;
                module.parameters.cellUndervoltageAlarmValue = 3000;
                module.parameters.cellUndervoltageAlarmRecovery = 3100;
                module.parameters.socLowAlarmValue = 20;
            }

            module.updateTimestamp();
            
            // SNMP 값 업데이트
            this.updateSnmpValues(moduleId, module);
        }

        this.batterySystem.updateSystemStatus();
    }

    /**
     * SNMP 값들을 업데이트
     * @param {number} moduleId - 모듈 ID
     * @param {Object} module - 모듈 데이터
     */
    updateSnmpValues(moduleId, module) {
        const baseOid = `1.3.6.1.4.1.64016.${moduleId}`;
        
        // 셀 전압 업데이트
        for (let cellIndex = 1; cellIndex <= 16; cellIndex++) {
            const providerName = `mod${moduleId}Cell${cellIndex}Voltage`;
            const value = Math.round(module.cellVoltage.getCellVoltage(cellIndex));
            this.mib.setScalarValue(providerName, value);
        }
        
        // 팩 정보 업데이트
        const packInfoKeys = [
            'cellMaxVoltage', 'cellMinVoltage', 'cellAvgVoltage', 'avgTemp', 'ambTemp',
            'totalVoltage', 'packVoltage', 'chargeCurrent', 'dischargeCurrent', 'soc',
            'soh', 'ratedCapacity', 'remainingCapacity', 'runningState'
        ];
        
        packInfoKeys.forEach((key, index) => {
            const providerName = `mod${moduleId}Pack${key}`;
            const value = module.packInfo[key] !== undefined ? Math.round(module.packInfo[key]) : 0;
            this.mib.setScalarValue(providerName, value);
        });
        
        // 알람 상태 업데이트
        const alarmKeys = [
            'cellOvervoltageAlarms', 'cellUndervoltageAlarms', 'packOvervoltageAlarm',
            'packUndervoltageAlarm', 'chargeOvercurrentAlarm', 'dischargeOvercurrentAlarm', 'socLowAlarm'
        ];
        
        alarmKeys.forEach((key, index) => {
            const providerName = `mod${moduleId}Alarm${key}`;
            const value = module.alarms[key] !== undefined ? Math.round(module.alarms[key]) : 0;
            this.mib.setScalarValue(providerName, value);
        });
        
        // 파라미터 업데이트
        const parameterKeys = [
            'cellOvervoltageAlarmValue', 'cellOvervoltageAlarmRecovery',
            'cellUndervoltageAlarmValue', 'cellUndervoltageAlarmRecovery', 'socLowAlarmValue'
        ];
        
        parameterKeys.forEach((key, index) => {
            const providerName = `mod${moduleId}Param${key}`;
            const value = module.parameters[key] !== undefined ? Math.round(module.parameters[key]) : 0;
            this.mib.setScalarValue(providerName, value);
        });
    }

    /**
     * Modbus 리더 설정
     * @param {Object} modbusClient - Modbus 클라이언트
     */
    setModbusReader(modbusClient) {
        this.modbusReader = new BatteryModbusReader(modbusClient);
    }

    /**
     * 실제 Modbus 데이터로 업데이트
     */
    async updateFromModbus() {
        if (!this.modbusReader) {
            console.log('[Battery MIB] Modbus reader not set');
            return;
        }

        try {
            console.log('[Battery MIB] Reading Modbus data...');
            const moduleData = await this.modbusReader.readAllModulesData();
            
            // 각 모듈의 데이터를 SNMP OID에 매핑
            for (const [moduleKey, data] of Object.entries(moduleData)) {
                const moduleId = parseInt(moduleKey.replace('module', ''));
                console.log(`[Battery MIB] Updating SNMP values for module ${moduleId}`);
                this.updateModuleSnmpValues(moduleId, data);
            }
            
            console.log('[Battery MIB] SNMP values updated from Modbus');
        } catch (error) {
            console.error('[Battery MIB] Modbus update failed:', error.message);
        }
    }

    /**
     * 사용 가능한 OID 목록 반환
     */
    getAvailableOids() {
        const oids = [];
        for (let moduleId = 1; moduleId <= 8; moduleId++) {
            const baseOid = `1.3.6.1.4.1.64016.${moduleId}`;
            
            // 셀 전압
            for (let i = 1; i <= 16; i++) {
                oids.push(`${baseOid}.1.${i}`);
            }
            
            // 팩 정보
            for (let i = 1; i <= 14; i++) {
                oids.push(`${baseOid}.2.${i}`);
            }
            
            // 알람
            [1, 2, 7, 8, 9, 10, 11].forEach(i => {
                oids.push(`${baseOid}.3.${i}`);
            });
            
            // 파라미터
            [1, 2, 3, 4, 6].forEach(i => {
                oids.push(`${baseOid}.4.${i}`);
            });
        }
        return oids;
    }

    /**
     * 읽기/쓰기 가능한 OID 목록 반환
     */
    getReadWriteOids() {
        const oids = [];
        for (let moduleId = 1; moduleId <= 8; moduleId++) {
            const baseOid = `1.3.6.1.4.1.64016.${moduleId}`;
            
            // 파라미터들만 쓰기 가능
            const parameterNames = [
                'cellOvervoltageAlarmValue',
                'cellOvervoltageAlarmRecovery', 
                'cellUndervoltageAlarmValue',
                'cellUndervoltageAlarmRecovery',
                'socLowAlarmValue'
            ];
            
            [1, 2, 3, 4, 6].forEach((index, i) => {
                oids.push({
                    oid: `${baseOid}.4.${index}`,
                    name: `Module ${moduleId} ${parameterNames[i]}`
                });
            });
        }
        return oids;
    }

    /**
     * Modbus 데이터를 SNMP OID에 매핑
     * @param {number} moduleId - 모듈 ID (1-8)
     * @param {Object} moduleData - Modbus에서 읽은 모듈 데이터
     */
    updateModuleSnmpValues(moduleId, moduleData) {
        try {
            console.log(`[Battery MIB] Updating module ${moduleId} SNMP values`);
            
            // 셀 전압 업데이트
            if (moduleData.cellVoltages && Array.isArray(moduleData.cellVoltages)) {
                for (let cellIndex = 1; cellIndex <= 16; cellIndex++) {
                    const providerName = `mod${moduleId}Cell${cellIndex}Voltage`;
                    const value = moduleData.cellVoltages[cellIndex - 1] || 0;
                    this.mib.setScalarValue(providerName, value);
                }
            } else {
                console.warn(`[Battery MIB] 모듈 ${moduleId} 셀 전압 데이터가 배열이 아닙니다`);
            }

            // 팩 정보 업데이트
            if (moduleData.packInfo) {
                const packInfo = moduleData.packInfo;
                
                // 팩 전압 (0.01V 단위)
                this.mib.setScalarValue(`mod${moduleId}PackcellMaxVoltage`, packInfo.packVoltage || 0);
                
                // 전류 (0.1A 단위)
                this.mib.setScalarValue(`mod${moduleId}PackcellMinVoltage`, packInfo.CurrentValue || 0);
                
                // SOC (%)
                this.mib.setScalarValue(`mod${moduleId}PackcellAvgVoltage`, packInfo.SOC || 0);
                
                // 평균 온도 (0.1°C 단위)
                this.mib.setScalarValue(`mod${moduleId}PackavgTemp`, packInfo.AverageCellTemp || 0);
                
                // 주변 온도 (0.1°C 단위)
                this.mib.setScalarValue(`mod${moduleId}PackambTemp`, packInfo.AmbientTemp || 0);
                
                // SOH (%)
                this.mib.setScalarValue(`mod${moduleId}Packsoh`, packInfo.SOH || 0);
                
                // PCB 온도 (0.1°C 단위)
                this.mib.setScalarValue(`mod${moduleId}PackpcbTemp`, packInfo.PCBTemp || 0);
                
                // 순환 횟수
                this.mib.setScalarValue(`mod${moduleId}PackcirculateNumber`, packInfo.CirculateNumber || 0);
                
                // 설치된 셀 수
                this.mib.setScalarValue(`mod${moduleId}PackinstalledCellNumber`, packInfo.InstalledCellNumber || 0);
                
                // 온도 센서 수
                this.mib.setScalarValue(`mod${moduleId}PacktemperatureSensorNumber`, packInfo.TemperatureSensorNumber || 0);
                
                // 전체 용량
                this.mib.setScalarValue(`mod${moduleId}PackfullCapacity`, packInfo.FullCapacity || 0);
                
                // 잔여 충전 시간
                this.mib.setScalarValue(`mod${moduleId}PackremainChargeTime`, packInfo.RemainChargeTime || 0);
                
                // 잔여 방전 시간
                this.mib.setScalarValue(`mod${moduleId}PackremainDischargeTime`, packInfo.RemainDischargeTime || 0);
                
                // 실행 상태
                this.mib.setScalarValue(`mod${moduleId}PackrunningState`, packInfo.FaultStatus || 0);
            }

            // 알람 상태 업데이트
            if (moduleData.alarms) {
                const alarms = moduleData.alarms;
                
                // 경고 플래그
                this.mib.setScalarValue(`mod${moduleId}AlarmcellOvervoltageAlarms`, alarms.warningFlag || 0);
                
                // 보호 플래그
                this.mib.setScalarValue(`mod${moduleId}AlarmcellUndervoltageAlarms`, alarms.protectionFlag || 0);
                
                // 결함 상태
                this.mib.setScalarValue(`mod${moduleId}AlarmpackOvervoltageAlarm`, alarms.faultStatus || 0);
            }

            console.log(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 완료`);
        } catch (error) {
            console.error(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 실패:`, error.message);
        }
    }

    /**
     * 배터리 시스템 데이터 반환
     */
    getBatterySystem() {
        return this.batterySystem;
    }
}

export default BatteryMib;

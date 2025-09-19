/**
 * IFTECH 48V 배터리 시스템 MIB 모듈 (8개 모듈 지원)
 * SNMP 서비스에 배터리 데이터를 등록하는 클래스
 */

import snmp from 'net-snmp';
import { BatterySystemData } from '../models/BatteryData.js';
import BatteryModbusReader from '../modbus/BatteryModbusReader.js';
import { dataBaseConnect } from '../dataBaseConnect.js';
import loggerWinston from '../loggerWinston.js';
const disChargeTypes= {
    FLOATING_CHARGE:1,
    CHARGE_START:2,
    CHARGE_IN_PROGRESS:3,
    CHARGE_COMPLETE:4,
    DISCHARGE_START:5,
    DISCHARGE_IN_PROGRESS:6,
    DISCHARGE_COMPLETE:7,
}
const startDischargeCurrent = -8.0; // 방전 시작 전류
const endDischargeCurrent = -4.0; // 방전 종료 전류
const startChargeCurrent = 4.0; // 충전 시작 전류

class BatteryMib {
    constructor(agent, mib) {
        this.agent = agent;
        this.mib = mib;
        this.batterySystem = new BatterySystemData();
        this.modbusReader = null; // 실제 Modbus 클라이언트가 연결되면 설정
        this.disChargeStatus = disChargeTypes.FLOATING_CHARGE;
        // 8개 모듈 초기화
        for (let i = 1; i <= 8; i++) {
            this.batterySystem.addModule(i);
        }
        this.chargeCurrent = 0;        
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
            const providerName = `mod${moduleId}${name.charAt(0).toUpperCase() + name.slice(1)}`;
            
            // 온도 및 전류 관련 OID는 Integer32, 나머지는 Unsigned32
            const isTemperature = name === 'avgTemp' || name === 'ambTemp';
            const isCurrent = name === 'chargeCurrent' || name === 'dischargeCurrent';
            const scalarType = (isTemperature || isCurrent) ? snmp.ObjectType.Integer32 : snmp.ObjectType.Unsigned32;
            
            this.agent.registerProvider({
                name: providerName,
                type: snmp.MibProviderType.Scalar,
                oid: oid,
                scalarType: scalarType,
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
                scalarType: snmp.ObjectType.Integer32,
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

        // this.updateFromModbus();
        // 5초마다 데이터 업데이트
        setInterval(() => {
            loggerWinston.info("startDataUpdate at every 5 seconds");
            //this.updateSimulatedData();
            this.updateFromModbus();
        }, 5000);
    }

    /**
     * 시뮬레이션 데이터 업데이트
     */
    // updateSimulatedData() {
    //     console.log("updateSimulatedData");
    //     for (let moduleId = 1; moduleId <= 8; moduleId++) {
    //         const module = this.batterySystem.getModule(moduleId);
    //         if (!module) continue;

    //         // 셀 전압 시뮬레이션 (3800mV ± 50mV)
    //         const baseVoltage = 3800 + (moduleId - 1) * 10; // 모듈별로 약간씩 다름
    //         const cellVoltages = [];
    //         for (let i = 0; i < 16; i++) {
    //             const variation = (Math.random() - 0.5) * 100; // ±50mV 변동
    //             cellVoltages.push(Math.max(0, baseVoltage + variation));
    //         }
    //         module.cellVoltage.setAllCellVoltages(cellVoltages);

    //         // 팩 정보 시뮬레이션
    //         module.packInfo.avgTemp = 20 + Math.random() * 20; // 20-40°C
    //         module.packInfo.ambTemp = module.packInfo.avgTemp - 2;
    //         module.packInfo.totalVoltage = module.cellVoltage.avgVoltage * 16;
    //         module.packInfo.packVoltage = module.packInfo.totalVoltage;
    //         module.packInfo.chargeCurrent = Math.random() > 0.7 ? Math.floor(Math.random() * 2000) : 0;
    //         module.packInfo.dischargeCurrent = Math.random() > 0.3 ? Math.floor(Math.random() * 1500) : 0;
    //         module.packInfo.soc = Math.floor(20 + Math.random() * 60); // 20-80%
    //         module.packInfo.soh = Math.floor(80 + Math.random() * 20); // 80-100%
    //         module.packInfo.ratedCapacity = 10000;
    //         module.packInfo.remainingCapacity = Math.floor(module.packInfo.ratedCapacity * module.packInfo.soc / 100);
    //         module.packInfo.runningState = module.packInfo.chargeCurrent > 0 ? 1 : 
    //                                       module.packInfo.dischargeCurrent > 0 ? 2 : 3;

    //         // 알람 상태 시뮬레이션
    //         module.alarms.cellOvervoltageAlarms = 0;
    //         module.alarms.cellUndervoltageAlarms = 0;
    //         module.alarms.packOvervoltageAlarm = 0;
    //         module.alarms.packUndervoltageAlarm = 0;
    //         module.alarms.chargeOvercurrentAlarm = 0;
    //         module.alarms.dischargeOvercurrentAlarm = 0;
    //         module.alarms.socLowAlarm = module.packInfo.soc < 20 ? 1 : 0;

    //         // 파라미터 기본값 설정
    //         if (module.parameters.cellOvervoltageAlarmValue === 0) {
    //             module.parameters.cellOvervoltageAlarmValue = 4200;
    //             module.parameters.cellOvervoltageAlarmRecovery = 4100;
    //             module.parameters.cellUndervoltageAlarmValue = 3000;
    //             module.parameters.cellUndervoltageAlarmRecovery = 3100;
    //             module.parameters.socLowAlarmValue = 20;
    //         }

    //         module.updateTimestamp();
            
    //         // SNMP 값 업데이트
    //         this.updateSnmpValues(moduleId, module);
    //     }

    //     this.batterySystem.updateSystemStatus();
    // }

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
    async setModbusReader(modbusClient) {
        const rackData = await dataBaseConnect.getRackData();
            this.moduleCount = rackData[0].installedmodule;
            console.log("rackData[0]-------------->", rackData[0],this.moduleCount);
        this.modbusReader = new BatteryModbusReader(modbusClient,this.moduleCount);
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
            const moduleData = await this.modbusReader.readAllModulesData();
            
            // 각 모듈의 데이터를 SNMP OID에 매핑
            for (const [moduleKey, data] of Object.entries(moduleData)) {
              //console.log("data",data);
                const modbusModuleId = parseInt(moduleKey.replace('module', ''));
                // Modbus ID 39-46을 SNMP 모듈 ID 1-8로 변환 
                const snmpModuleId = modbusModuleId ; // 39 -> 1, 40 -> 2, ...
                this.updateModuleSnmpValues(snmpModuleId, data);
            }
            await this.checkDisChargeStatus(moduleData);
            dataBaseConnect.logBatteryData(moduleData, this.disChargeStatus);
            loggerWinston.info('[Battery MIB] SNMP values updated from Modbus');
        } catch (error) {
            loggerWinston.error('[Battery MIB] Modbus update failed:', error.message);
        }
    }
    async checkDisChargeStatus(moduleData) {
        // console.log("moduleData-------------->", moduleData);
        // console.log("checkDisChargeStatus-------------->", moduleData.module1.packInfo.CurrentValue);
        this.chargeCurrent = (moduleData.module1.packInfo.CurrentValue-10000)*0.1;
        if(this.chargeCurrent < startDischargeCurrent) {
            // 방전 전류이고, 현재 상태가 부동충전이면 방전시작 
            if(this.disChargeStatus === disChargeTypes.FLOATING_CHARGE ||
                this.disChargeStatus === disChargeTypes.CHARGE_START ||
                this.disChargeStatus === disChargeTypes.CHARGE_IN_PROGRESS
            ) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_START;
            }
            // 방전 전류이고, 현재 상태가 방전시작이면 방전중
            if(this.disChargeStatus === disChargeTypes.DISCHARGE_START) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_IN_PROGRESS;
            }
            // 방전 전류이고, 현재 상태가 방전중이면 방전중
            if(this.disChargeStatus === disChargeTypes.DISCHARGE_IN_PROGRESS) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_IN_PROGRESS;
            }
        } else if(this.chargeCurrent > endDischargeCurrent ){
            if(this.disChargeStatus === disChargeTypes.DISCHARGE_IN_PROGRESS) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_COMPLETE;
            }
            else if(this.disChargeStatus === disChargeTypes.DISCHARGE_COMPLETE) {
                this.disChargeStatus = disChargeTypes.FLOATING_CHARGE;
            }
            else {
                this.disChargeStatus = disChargeTypes.FLOATING_CHARGE;
            }
        } 
        //console.log("checkDisChargeStatus-------------->", this.disChargeStatus);
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
        //console.log("updateModuleSnmpValues------------------------------>", moduleId, moduleData.cellVoltages);
        try {
            loggerWinston.info(`[Battery MIB] Updating module ${moduleId} SNMP values`);
            
            // 셀 전압 업데이트
            //console.log("moduleData.cellVoltages", moduleData.cellVoltages);
            if (moduleData.cellVoltages && Array.isArray(moduleData.cellVoltages)) {
                for (let cellIndex = 1; cellIndex <= 16; cellIndex++) {
                    const providerName = `mod${moduleId}Cell${cellIndex}Voltage`;
                    const value = moduleData.cellVoltages[cellIndex - 1] || 0;
                    //console.log("providerName", providerName, value);
                    this.mib.setScalarValue(providerName, value);
                }
            } else {
                loggerWinston.warn(`[Battery MIB] 모듈 ${moduleId} 셀 전압 데이터가 배열이 아닙니다`);
            }

            // 팩 정보 업데이트
            if (moduleData.packInfo) {
                const packInfo = moduleData.packInfo;
                
                // 최대 셀 전압 (mV 단위) - 처음 15개만 사용
                const maxVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.max(...moduleData.cellVoltages.slice(0, 15)) 
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}CellMaxVoltage`, maxVoltage);
                
                // 최소 셀 전압 (mV 단위) - 처음 15개만 사용
                const minVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.min(...moduleData.cellVoltages.slice(0, 15)) 
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}CellMinVoltage`, minVoltage);
                
                // avg voltage 
                const aveVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.round(moduleData.cellVoltages.slice(0, 15).reduce((sum, voltage) => sum + voltage, 0) / 15)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}CellAvgVoltage`, aveVoltage);
                // avg temperature (0.1°C 단위: 25.0°C = 250)
                let avgTemperature = moduleData.packInfo.AverageCellTemp ? moduleData.packInfo.AverageCellTemp - 400 : 0;
                this.mib.setScalarValue(`mod${moduleId}AvgTemp`, avgTemperature);
                
                // amb temperature (0.1°C 단위: 25.0°C = 250)
                let ambTemperature = moduleData.packInfo.AmbientTemp ? moduleData.packInfo.AmbientTemp - 400 : 0;
                this.mib.setScalarValue(`mod${moduleId}AmbTemp`, ambTemperature);
                // total voltage
                const totalVoltage = moduleData.packInfo && moduleData.packInfo.cellVoltages && moduleData.packInfo.cellVoltages.length > 0
                    ? moduleData.packInfo.cellVoltages.slice(0, 15).reduce((sum, voltage) => sum + voltage, 0)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}TotalVoltage`, totalVoltage);
                // pack voltage
                this.mib.setScalarValue(`mod${moduleId}PackVoltage`, moduleData.packInfo ? moduleData.packInfo.packVoltage || 0 : 0);
                
                // Charge Current (0.01A 단위, -10000 오프셋)
                let chargeCurrent = moduleData.packInfo && moduleData.packInfo.CurrentValue ? moduleData.packInfo.CurrentValue - 10000 : 0;
                this.mib.setScalarValue(`mod${moduleId}ChargeCurrent`, chargeCurrent);
                // Discharge Current (0.01A 단위, -10000 오프셋)
                let dischargeCurrent = moduleData.packInfo && moduleData.packInfo.CurrentValue ? moduleData.packInfo.CurrentValue - 10000 : 0;
                this.mib.setScalarValue(`mod${moduleId}DischargeCurrent`, dischargeCurrent);
                // SOC
                this.mib.setScalarValue(`mod${moduleId}Soc`, moduleData.packInfo ? moduleData.packInfo.SOC || 0 : 0);
                // SOH
                // this.mib.setScalarValue(`mod${moduleId}PackambTemp`, packInfo.AmbientTemp || 0);
                
                // // SOH (%)
                // this.mib.setScalarValue(`mod${moduleId}Packsoh`, packInfo.SOH || 0);
                
                // // PCB 온도 (0.1°C 단위)
                // this.mib.setScalarValue(`mod${moduleId}PackpcbTemp`, packInfo.PCBTemp || 0);
                
                // // 순환 횟수
                // this.mib.setScalarValue(`mod${moduleId}PackcirculateNumber`, packInfo.CirculateNumber || 0);
                
                // // 설치된 셀 수
                // this.mib.setScalarValue(`mod${moduleId}PackinstalledCellNumber`, packInfo.InstalledCellNumber || 0);
                
                // // 온도 센서 수
                // this.mib.setScalarValue(`mod${moduleId}PacktemperatureSensorNumber`, packInfo.TemperatureSensorNumber || 0);
                
                // // 전체 용량
                // this.mib.setScalarValue(`mod${moduleId}PackfullCapacity`, packInfo.FullCapacity || 0);
                
                // // 잔여 충전 시간
                // this.mib.setScalarValue(`mod${moduleId}PackremainChargeTime`, packInfo.RemainChargeTime || 0);
                
                // // 잔여 방전 시간
                // this.mib.setScalarValue(`mod${moduleId}PackremainDischargeTime`, packInfo.RemainDischargeTime || 0);
                
                // // 실행 상태
                // this.mib.setScalarValue(`mod${moduleId}PackrunningState`, packInfo.FaultStatus || 0);
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

            loggerWinston.info(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 완료`);
        } catch (error) {
            loggerWinston.error(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 실패:`, error.message);
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

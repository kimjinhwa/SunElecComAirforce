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
// 방전 시작/종료 전류 임계값 (환경변수로 설정 가능, 기본값 사용)
const startDischargeCurrent = parseFloat(process.env.DISCHARGE_CURRENT_THRESHOLD || '-1.0'); // 방전 시작 전류 (기본 -1.0A)
const endDischargeCurrent = parseFloat(process.env.DISCHARGE_END_CURRENT_THRESHOLD || '0.0'); // 방전 종료 전류 (기본 0.0A)
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
            { index: 3, name: 'tempChargeOverheatAlarms', key: 'tempChargeOverheatAlarms' },
            { index: 4, name: 'tempChargeUnderheatAlarms', key: 'tempChargeUnderheatAlarms' },
            { index: 5, name: 'tempDischargeOverheatAlarms', key: 'tempDischargeOverheatAlarms' },
            { index: 6, name: 'tempDischargeUnderheatAlarms', key: 'tempDischargeUnderheatAlarms' },
            { index: 7, name: 'packOvervoltageAlarm', key: 'packOvervoltageAlarm' },
            { index: 8, name: 'packUndervoltageAlarm', key: 'packUndervoltageAlarm' },
            { index: 9, name: 'chargeOvercurrentAlarm', key: 'chargeOvercurrentAlarm' },
            { index: 10, name: 'dischargeOvercurrentAlarm', key: 'dischargeOvercurrentAlarm' },
            { index: 11, name: 'socLowAlarm', key: 'socLowAlarm' },
            { index: 12, name: 'ratedCapacityAlarm', key: 'ratedCapacityAlarm' },
            { index: 13, name: 'remainingCapacityAlarm', key: 'remainingCapacityAlarm' },
            { index: 14, name: 'runningStateAlarm', key: 'runningStateAlarm' }
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
            { index: 5, name: 'reserved5', key: 'reserved5' }, // 예약된 인덱스
            { index: 6, name: 'socLowAlarmValue', key: 'socLowAlarmValue' },
            { index: 7, name: 'reserved7', key: 'reserved7' }, // 예약된 인덱스
            { index: 8, name: 'reserved8', key: 'reserved8' }, // 예약된 인덱스
            { index: 9, name: 'chargeOvercurrentAlarm', key: 'chargeOvercurrentAlarm' }, // 충전 과전류 알람
            { index: 10, name: 'dischargeOvercurrentAlarm', key: 'dischargeOvercurrentAlarm' }, // 방전 과전류 알람
            { index: 11, name: 'socLowAlarm', key: 'socLowAlarm' } // SOC 저알람
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
        // 15초마다 데이터 업데이트 (존재하지 않는 모듈로 인한 지연 고려)
        setInterval(() => {
            loggerWinston.info("startDataUpdate at every 15 seconds");
            //this.updateSimulatedData();
            this.updateFromModbus();
        }, 15000);
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
     * @param {string} protocolType - 프로토콜 타입 ('modbus' 또는 'narada')
     */
    async setModbusReader(modbusClient, protocolType = 'modbus') {
        const rackData = await dataBaseConnect.getRackData();
        this.moduleCount = rackData[0].installedmodule;
        console.log("rackData[0]-------------->", rackData[0], this.moduleCount);
        this.modbusReader = new BatteryModbusReader(modbusClient, this.moduleCount, protocolType);
        
        // 초기 데이터 읽기 (API 서버가 시작되기 전에 데이터 준비)
        try {
            loggerWinston.info('[Battery MIB] 초기 데이터 읽기 시작...');
            await this.updateFromModbus();
            loggerWinston.info('[Battery MIB] 초기 데이터 읽기 완료');
        } catch (error) {
            loggerWinston.warn('[Battery MIB] 초기 데이터 읽기 실패 (기본값으로 계속):', error.message);
            // 실패해도 기본값으로 업데이트
            try {
                const defaultModuleData = this.createDefaultModuleData();
                for (const [moduleKey, data] of Object.entries(defaultModuleData)) {
                    const modbusModuleId = parseInt(moduleKey.replace('module', ''));
                    const snmpModuleId = modbusModuleId - 38;
                    this.updateModuleSnmpValues(snmpModuleId, data);
                }
            } catch (fallbackError) {
                loggerWinston.error('[Battery MIB] 기본값 업데이트도 실패:', fallbackError.message);
            }
        }
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
            let moduleData = await this.modbusReader.readAllModulesData();
            
            // readAllModulesData가 null을 반환하거나 빈 객체인 경우, multi_data.devices에서 데이터 가져오기
            if (!moduleData || Object.keys(moduleData).length === 0) {
                // multi_data.devices에서 데이터를 moduleData 형식으로 변환
                if (this.modbusReader && this.modbusReader.multi_data && this.modbusReader.multi_data.devices) {
                    moduleData = this.convertDevicesToModuleData(this.modbusReader.multi_data.devices);
                }
            }
            // moduleData가 여전히 없거나 비어있으면 기본값으로 업데이트

            if (!moduleData || Object.keys(moduleData).length === 0) {
                loggerWinston.warn('[Battery MIB] moduleData가 비어있어 기본값으로 업데이트합니다.');
                moduleData = this.createDefaultModuleData();
            }
            
            // moduleData의 키가 올바른지 확인 (module39, module40 형식이어야 함)
            const moduleKeys = Object.keys(moduleData);
            if (moduleKeys.length > 0) {
                const firstKey = moduleKeys[0];
                const modbusModuleId = parseInt(firstKey.replace('module', ''));
                if (modbusModuleId < 39 || modbusModuleId > 46) {
                    loggerWinston.error(`[Battery MIB] 잘못된 moduleData 키 발견: ${firstKey}, modbusModuleId: ${modbusModuleId}. 기본값으로 재생성합니다.`);
                    moduleData = this.createDefaultModuleData();
                }
            }
            
            // 각 모듈의 데이터를 SNMP OID에 매핑
            for (const [moduleKey, data] of Object.entries(moduleData)) {
              //console.log("data",data);
                const modbusModuleId = parseInt(moduleKey.replace('module', ''));
                // Modbus ID 39-46을 SNMP 모듈 ID 1-8로 변환 
                if (modbusModuleId < 39 || modbusModuleId > 46) {
                    loggerWinston.warn(`[Battery MIB] 잘못된 modbusModuleId: ${modbusModuleId}, 건너뜁니다.`);
                    continue;
                }
                const snmpModuleId = modbusModuleId - 38; // 39 -> 1, 40 -> 2, ...
                if (snmpModuleId < 1 || snmpModuleId > 8) {
                    loggerWinston.warn(`[Battery MIB] 잘못된 snmpModuleId: ${snmpModuleId}, 건너뜁니다.`);
                    continue;
                }
                this.updateModuleSnmpValues(snmpModuleId, data);
            }
            await this.checkDisChargeStatus(moduleData);
            // logBatteryData는 multi_data 형식을 기대하므로 moduleData를 multi_data 형식으로 변환
            const multiDataForLogging = this.convertModuleDataToMultiData(moduleData);
            dataBaseConnect.logBatteryData(multiDataForLogging, this.disChargeStatus);
            loggerWinston.info('[Battery MIB] SNMP values updated from Modbus');
        } catch (error) {
            loggerWinston.error('[Battery MIB] Modbus update failed:', error.message);
            // 에러 발생 시에도 기본값으로 업데이트
            try {
                const defaultModuleData = this.createDefaultModuleData();
                for (const [moduleKey, data] of Object.entries(defaultModuleData)) {
                    const modbusModuleId = parseInt(moduleKey.replace('module', ''));
                    const snmpModuleId = modbusModuleId - 38; // 39 -> 1, 40 -> 2, ...
                    this.updateModuleSnmpValues(snmpModuleId, data);
                }
            } catch (fallbackError) {
                loggerWinston.error('[Battery MIB] 기본값 업데이트도 실패:', fallbackError.message);
            }
        }
    }
    /**
     * multi_data.devices를 moduleData 형식으로 변환
     * @param {Object} devices - multi_data.devices 객체
     * @returns {Object} moduleData 형식의 객체
     */
    convertDevicesToModuleData(devices) {
        if (!devices || Object.keys(devices).length === 0) {
            loggerWinston.warn('[Battery MIB] convertDevicesToModuleData: devices가 비어있습니다.');
            return {};
        }
        
        const moduleData = {};
        
        for (const [moduleNo, device] of Object.entries(devices)) {
            const moduleId = parseInt(moduleNo);
            
            // moduleNo가 1-8 범위인지 확인
            if (isNaN(moduleId) || moduleId < 1 || moduleId > 8) {
                loggerWinston.warn(`[Battery MIB] convertDevicesToModuleData: 잘못된 moduleNo: ${moduleNo}, 건너뜁니다.`);
                continue;
            }
            
            const modbusModuleId = moduleId + 38; // 1 -> 39, 2 -> 40, ...
            
            if (device && device.data && Array.isArray(device.data) && device.data.length >= 51) {
                // data 배열을 parsePackInfoData로 파싱
                const result = {
                    data: device.data,
                    buffer: device.buffer || Buffer.from(device.data)
                };
                
                try {
                    const parsedData = this.modbusReader.parsePackInfoData(result);
                    // parsePackInfoData는 packInfo 객체 없이 직접 필드를 반환하므로, readModuleData 형식으로 변환
                    moduleData[`module${modbusModuleId}`] = {
                        cellVoltages: parsedData.cellVoltages || [],
                        packInfo: {
                            packVoltage: parsedData.packVoltage,
                            CurrentValue: parsedData.CurrentValue,
                            remainingCapacity: parsedData.remainingCapacity,
                            AverageCellTemp: parsedData.AverageCellTemp,
                            AmbientTemp: parsedData.AmbientTemp,
                            WarningFlag: parsedData.WarningFlag,
                            ProtectionFlag: parsedData.ProtectionFlag,
                            FaultStatus: parsedData.FaultStatus,
                            SOC: parsedData.SOC,
                            CirculateNumber: parsedData.CirculateNumber,
                            SOH: parsedData.SOH,
                            PCBTemp: parsedData.PCBTemp,
                            HistoryDischargeCapacity: parsedData.HistoryDischargeCapacity,
                            InstalledCellNumber: parsedData.InstalledCellNumber,
                            TemperatureSensorNumber: parsedData.TemperatureSensorNumber,
                            cellTemperatures: parsedData.cellTemperatures || [],
                            FullCapacity: parsedData.FullCapacity,
                            RemainChargeTime: parsedData.RemainChargeTime,
                            RemainDischargeTime: parsedData.RemainDischargeTime,
                            CellUVState: parsedData.CellUVState
                        },
                        alarms: {
                            warningFlag: parsedData.WarningFlag || 0,
                            protectionFlag: parsedData.ProtectionFlag || 0,
                            faultStatus: parsedData.FaultStatus || 0
                        },
                        parameters: {},
                        timestamp: new Date().toISOString(),
                        result: parsedData.result || device
                    };
                } catch (error) {
                    loggerWinston.warn(`[Battery MIB] 모듈 ${moduleId} 데이터 파싱 실패: ${error.message}`);
                    // 파싱 실패 시 기본값 사용
                    moduleData[`module${modbusModuleId}`] = this.createDefaultModuleDataForModule(modbusModuleId);
                }
            } else {
                // 데이터가 없거나 유효하지 않은 경우 기본값 사용
                moduleData[`module${modbusModuleId}`] = this.createDefaultModuleDataForModule(modbusModuleId);
            }
        }
        
        loggerWinston.info(`[Battery MIB] convertDevicesToModuleData: ${Object.keys(moduleData).length}개 모듈 변환 완료`);
        return moduleData;
    }

    /**
     * 기본 moduleData 생성 (모든 모듈에 대해)
     * @returns {Object} 기본 moduleData
     */
    createDefaultModuleData() {
        const moduleData = {};
        const moduleCount = this.moduleCount || 8;
        
        for (let i = 1; i <= moduleCount; i++) {
            const modbusModuleId = i + 38; // 1 -> 39, 2 -> 40, ...
            moduleData[`module${modbusModuleId}`] = this.createDefaultModuleDataForModule(modbusModuleId);
        }
        
        return moduleData;
    }

    /**
     * 특정 모듈의 기본 데이터 생성
     * @param {number} modbusModuleId - Modbus 모듈 ID (39-46)
     * @returns {Object} 기본 모듈 데이터
     */
    createDefaultModuleDataForModule(modbusModuleId) {
        return {
            cellVoltages: new Array(16).fill(0),
            packInfo: {
                packVoltage: 0,
                CurrentValue: 0,
                remainingCapacity: 0,
                AverageCellTemp: 0,
                AmbientTemp: 0,
                WarningFlag: 0,
                ProtectionFlag: 0,
                FaultStatus: 0,
                SOC: 0,
                CirculateNumber: 0,
                SOH: 0,
                PCBTemp: 0,
                HistoryDischargeCapacity: 0,
                InstalledCellNumber: 0,
                TemperatureSensorNumber: 0,
                cellTemperatures: new Array(16).fill(0),
                FullCapacity: 0,
                RemainChargeTime: 0,
                RemainDischargeTime: 0,
                CellUVState: 0
            },
            alarms: {
                warningFlag: 0,
                protectionFlag: 0,
                faultStatus: 0
            },
            parameters: {},
            timestamp: new Date().toISOString(),
            result: {
                status: 'failed',
                error: '데이터 없음',
                data: new Array(51).fill(0),
                buffer: Buffer.alloc(102)
            }
        };
    }
    /**
     * moduleData를 multi_data 형식으로 변환 (logBatteryData용)
     * @param {Object} moduleData - moduleData 형식의 객체
     * @returns {Object} multi_data 형식의 객체
     */
    convertModuleDataToMultiData(moduleData) {
        const multiData = {};
        
        for (const [moduleKey, data] of Object.entries(moduleData)) {
            // module39 -> 1, module40 -> 2, ...
            const modbusModuleId = parseInt(moduleKey.replace('module', ''));
            const moduleNo = modbusModuleId - 38; // 39 -> 1, 40 -> 2, ...
            
            if (moduleNo >= 1 && moduleNo <= 8) {
                multiData[`module${moduleNo}`] = data;
            }
        }
        
        return multiData;
    }

    async checkDisChargeStatus(moduleData) {
        // 병렬 연결된 모든 성공한 모듈의 전류 합산
        let totalCurrent = 0.0;
        
        // moduleData의 모든 모듈을 순회하며 전류 합산
        for (const [moduleKey, data] of Object.entries(moduleData)) {
            // result.status 또는 직접 status 확인
            const status = (data && data.result && data.result.status) || (data && data.status);
            if (data && data.packInfo && data.packInfo.CurrentValue !== undefined && status === 'success') {
                // CurrentValue를 전류로 변환 (toInt16 처리 후 0.1A 단위로 변환)
                let moduleCurrent = data.packInfo.CurrentValue;
                // toInt16 처리 (음수 처리)
                const int16 = moduleCurrent & 0xFFFF;
                moduleCurrent = int16 > 0x7FFF ? int16 - 0x10000 : int16;
                // 0.1A 단위로 변환
                moduleCurrent /= 10.0;
                totalCurrent += moduleCurrent;
                loggerWinston.debug(`[Battery MIB] 모듈 ${moduleKey} 전류 합산: ${moduleCurrent.toFixed(2)}A, 누적: ${totalCurrent.toFixed(2)}A`);
            }
        }
        
        this.chargeCurrent = totalCurrent;
        const previousStatus = this.disChargeStatus;
        
        // 디버그: 전류와 상태 로그 (항상 출력)
        loggerWinston.info(`[Battery MIB] checkDisChargeStatus: 전류=${this.chargeCurrent.toFixed(2)}A, 현재상태=${this.disChargeStatus}, 임계값=${startDischargeCurrent}A`);
        
        // 방전 중인지 확인 (전류가 임계값보다 작으면 방전)
        if(this.chargeCurrent < startDischargeCurrent) {
            // 방전 전류이고, 현재 상태가 부동충전/충전 상태면 방전시작
            if(this.disChargeStatus === disChargeTypes.FLOATING_CHARGE ||
                this.disChargeStatus === disChargeTypes.CHARGE_START ||
                this.disChargeStatus === disChargeTypes.CHARGE_IN_PROGRESS ||
                this.disChargeStatus === disChargeTypes.CHARGE_COMPLETE
            ) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_START;
            }
            // 방전 전류이고, 현재 상태가 방전시작이면 다음 주기에 방전중으로 변경
            // (DISCHARGE_START 상태를 최소 한 주기 유지하기 위해 else if 사용)
            else if(this.disChargeStatus === disChargeTypes.DISCHARGE_START) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_IN_PROGRESS;
            }
            // 방전 전류이고, 현재 상태가 방전중이면 방전중 유지
            else if(this.disChargeStatus === disChargeTypes.DISCHARGE_IN_PROGRESS) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_IN_PROGRESS;
            }
        } else if(this.chargeCurrent >= endDischargeCurrent ){
            // 방전 종료: 방전중이면 방전완료로 변경
            if(this.disChargeStatus === disChargeTypes.DISCHARGE_IN_PROGRESS) {
                this.disChargeStatus = disChargeTypes.DISCHARGE_COMPLETE;
            }
            // 방전완료 상태면 다음 주기에 부동충전으로 변경
            else if(this.disChargeStatus === disChargeTypes.DISCHARGE_COMPLETE) {
                this.disChargeStatus = disChargeTypes.FLOATING_CHARGE;
            }
            // 그 외 상태면 부동충전으로 변경
            else {
                this.disChargeStatus = disChargeTypes.FLOATING_CHARGE;
            }
        }
        
        // 상태가 변경되었을 때만 로그 출력
        if(previousStatus !== this.disChargeStatus) {
            loggerWinston.info(`[Battery MIB] 방전 상태 변경: ${previousStatus} -> ${this.disChargeStatus}, 전류: ${this.chargeCurrent.toFixed(2)}A`);
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
                
                // 온도 센서 1을 팩 정보 OID index 1에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.1)
                // 온도는 0.1°C 단위이고 -400 오프셋이 있으므로 (590 - 400) / 10 = 19.0°C
                const tempSensor1 = moduleData.packInfo && moduleData.packInfo.cellTemperatures && moduleData.packInfo.cellTemperatures.length > 0
                    ? (moduleData.packInfo.cellTemperatures[0] || 0) - 400  // 0.1°C 단위로 변환
                    : 0;
                const providerName1 = `mod${moduleId}CellMaxVoltage`;
                this.mib.setScalarValue(providerName1, tempSensor1);
                
                // 온도 센서 2를 팩 정보 OID index 2에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.2)
                const tempSensor2 = moduleData.packInfo && moduleData.packInfo.cellTemperatures && moduleData.packInfo.cellTemperatures.length > 1
                    ? (moduleData.packInfo.cellTemperatures[1] || 0) - 400  // 0.1°C 단위로 변환
                    : 0;
                const providerName2 = `mod${moduleId}CellMinVoltage`;
                this.mib.setScalarValue(providerName2, tempSensor2);
                
                // 온도 센서 3을 팩 정보 OID index 3에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.3)
                const tempSensor3 = moduleData.packInfo && moduleData.packInfo.cellTemperatures && moduleData.packInfo.cellTemperatures.length > 2
                    ? (moduleData.packInfo.cellTemperatures[2] || 0) - 400  // 0.1°C 단위로 변환
                    : 0;
                const providerName3 = `mod${moduleId}CellAvgVoltage`;
                this.mib.setScalarValue(providerName3, tempSensor3);
                
                // 온도 센서 4를 팩 정보 OID index 4에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.4)
                const tempSensor4 = moduleData.packInfo && moduleData.packInfo.cellTemperatures && moduleData.packInfo.cellTemperatures.length > 3
                    ? (moduleData.packInfo.cellTemperatures[3] || 0) - 400  // 0.1°C 단위로 변환
                    : 0;
                const providerName4 = `mod${moduleId}AvgTemp`;
                this.mib.setScalarValue(providerName4, tempSensor4);
                
                // MOSFET Temperature 1을 팩 정보 OID index 5에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.5)
                const mosfetTemp1 = moduleData.packInfo && moduleData.packInfo.cellTemperatures && moduleData.packInfo.cellTemperatures.length > 4
                    ? (moduleData.packInfo.cellTemperatures[4] || 0) - 400  // 0.1°C 단위로 변환
                    : (moduleData.packInfo.PCBTemp ? moduleData.packInfo.PCBTemp - 400 : 0);
                const providerName5 = `mod${moduleId}AmbTemp`;
                this.mib.setScalarValue(providerName5, mosfetTemp1);
                // Total Voltage를 팩 정보 OID index 6에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.6)
                // 셀 전압의 합계를 /10으로 나눈 값
                const totalVoltageRawForPackInfo = moduleData.cellVoltages && moduleData.cellVoltages.length > 0
                    ? moduleData.cellVoltages.slice(0, 15).reduce((sum, voltage) => sum + voltage, 0)
                    : 0;
                const totalVoltageForPackInfo = Math.round(totalVoltageRawForPackInfo / 10); // /10으로 나누기
                const providerName6 = `mod${moduleId}TotalVoltage`;
                this.mib.setScalarValue(providerName6, totalVoltageForPackInfo);
                
                // Ambient Temperature를 팩 정보 OID index 7에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.2.7)
                // AmbientTemp는 이미 0.1°C 단위이므로 -400 오프셋만 제거
                const rawAmbTemp = moduleData.packInfo ? moduleData.packInfo.AmbientTemp : 0;
                const ambTemperature = rawAmbTemp ? rawAmbTemp - 400 : 0;
                const providerName7 = `mod${moduleId}PackVoltage`;
                this.mib.setScalarValue(providerName7, ambTemperature);
                
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

            // 셀 전압 기반 OV 상태 계산 (과전압)
            let cellOVState = 0;
            // 셀 전압 기반 UV 상태 계산 (저전압)
            let cellUVState = 0;
            if (moduleData.cellVoltages && Array.isArray(moduleData.cellVoltages)) {
                const ovThreshold = 3700; // 3700mV (과전압 임계값)
                const uvThreshold = 3000; // 3000mV (저전압 임계값)
                // 실제 설치된 셀 개수 확인 (기본값 15개)
                const installedCellCount = moduleData.packInfo?.InstalledCellNumber || 15;
                // 실제 셀 개수만큼만 체크 (인덱스 0부터 installedCellCount-1까지)
                const cellCount = Math.min(installedCellCount, moduleData.cellVoltages.length);
                
                for (let index = 0; index < cellCount; index++) {
                    const voltage = moduleData.cellVoltages[index];
                    // 전압이 0이고 데이터 읽기 실패인 경우는 제외 (실제 0V가 아닌 경우)
                    if (voltage > 0) {
                        if (voltage > ovThreshold) {
                            cellOVState |= (1 << index); // 과전압: 해당 셀의 비트를 1로 설정
                        }
                        if (voltage < uvThreshold) {
                            cellUVState |= (1 << index); // 저전압: 해당 셀의 비트를 1로 설정
                        }
                    }
                }
            } else {
                // 데이터 읽기 실패 시 OV/UV 상태는 0으로 유지
            }
            // 알람 상태 업데이트
            if (moduleData.alarms) {
                const alarms = moduleData.alarms;
                
                // CellMaxVoltage를 알람 OID index 1에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.1)
                const maxVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.max(...moduleData.cellVoltages.slice(0, 15)) 
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmcellOvervoltageAlarms`, maxVoltage);
                
                // CellMinVoltage를 알람 OID index 2에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.2)
                const minVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.min(...moduleData.cellVoltages.slice(0, 15)) 
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmcellUndervoltageAlarms`, minVoltage);
                
                // CellAvgVoltage를 알람 OID index 3에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.3)
                const aveVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0 
                    ? Math.round(moduleData.cellVoltages.slice(0, 15).reduce((sum, voltage) => sum + voltage, 0) / 15)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmtempChargeOverheatAlarms`, aveVoltage);
                
                // AvgTemperature를 알람 OID index 4에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.4)
                const avgTemperature = moduleData.packInfo.AverageCellTemp ? moduleData.packInfo.AverageCellTemp - 400 : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmtempChargeUnderheatAlarms`, avgTemperature);
                
                // AmbTemperature를 알람 OID index 5에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.5)
                const ambTemperature = moduleData.packInfo.AmbientTemp ? moduleData.packInfo.AmbientTemp - 400 : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmtempDischargeOverheatAlarms`, ambTemperature);
                
                // TotalVoltage를 알람 OID index 6에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.6)
                const totalVoltage = moduleData.cellVoltages && moduleData.cellVoltages.length > 0
                    ? moduleData.cellVoltages.slice(0, 15).reduce((sum, voltage) => sum + voltage, 0)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmtempDischargeUnderheatAlarms`, totalVoltage);
                
                // PackVoltage를 알람 OID index 7에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.7)
                const packVoltage = moduleData.packInfo ? moduleData.packInfo.packVoltage || 0 : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmpackOvervoltageAlarm`, packVoltage);
                
                // ChargeCurrent를 알람 OID index 8에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.8)
                // CurrentValue가 10000보다 크면 충전, 작으면 방전 (0.01A 단위, -10000 오프셋)
                const chargeCurrent = moduleData.packInfo && moduleData.packInfo.CurrentValue 
                    ? (moduleData.packInfo.CurrentValue > 10000 ? moduleData.packInfo.CurrentValue - 10000 : 0)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmpackUndervoltageAlarm`, chargeCurrent);
                
                // DischargeCurrent를 알람 OID index 9에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.9)
                // CurrentValue가 10000보다 작으면 방전 (0.01A 단위, -10000 오프셋)
                const dischargeCurrent = moduleData.packInfo && moduleData.packInfo.CurrentValue 
                    ? (moduleData.packInfo.CurrentValue < 10000 ? 10000 - moduleData.packInfo.CurrentValue : 0)
                    : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmchargeOvercurrentAlarm`, dischargeCurrent);
                
                // SOC를 알람 OID index 10에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.10)
                // SOC는 100배 스케일링되어 있음 (10000 = 100%)
                const rawSoc = moduleData.packInfo ? moduleData.packInfo.SOC || 0 : 0;
                const soc = rawSoc >= 10000 ? Math.round(rawSoc / 100) : rawSoc; // 10000 이상이면 100으로 나누기
                this.mib.setScalarValue(`mod${moduleId}AlarmdischargeOvercurrentAlarm`, soc);
                
                // SOH를 알람 OID index 11에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.11)
                // SOH는 100배 스케일링되어 있음 (10000 = 100%)
                const rawSoh = moduleData.packInfo ? moduleData.packInfo.SOH || 0 : 0;
                const soh = rawSoh >= 10000 ? Math.round(rawSoh / 100) : rawSoh; // 10000 이상이면 100으로 나누기
                this.mib.setScalarValue(`mod${moduleId}AlarmsocLowAlarm`, soh);
                
                // RatedCapacity를 알람 OID index 12에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.12)
                const ratedCapacity = moduleData.packInfo ? moduleData.packInfo.FullCapacity || 0 : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmratedCapacityAlarm`, ratedCapacity);
                
                // RemainingCapacity를 알람 OID index 13에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.13)
                const remainingCapacity = moduleData.packInfo ? moduleData.packInfo.remainingCapacity || 0 : 0;
                this.mib.setScalarValue(`mod${moduleId}AlarmremainingCapacityAlarm`, remainingCapacity);
                
                // RunningState를 알람 OID index 14에 매핑 (.1.3.6.1.4.1.64016.{moduleId}.3.14)
                // 1=Charge, 2=Discharge, 3=Stop
                let runningState = 3; // 기본값: 정지
                if (moduleData.packInfo && moduleData.packInfo.CurrentValue) {
                    const currentValue = moduleData.packInfo.CurrentValue;
                    if (currentValue > 10000) {
                        runningState = 1; // 충전 중
                    } else if (currentValue < 10000) {
                        runningState = 2; // 방전 중
                    } else {
                        runningState = 3; // 정지 (CurrentValue == 10000)
                    }
                }
                this.mib.setScalarValue(`mod${moduleId}AlarmrunningStateAlarm`, runningState);
            }

            // 파라미터 업데이트
            if (moduleData.packInfo) {
                // 셀 OV 상태를 파라미터 index 1에 설정 (.1.3.6.1.4.1.64016.{moduleId}.4.1)
                this.mib.setScalarValue(`mod${moduleId}ParamcellOvervoltageAlarmValue`, cellOVState);
                
                // 셀 UV 상태를 파라미터 index 2에 설정 (.1.3.6.1.4.1.64016.{moduleId}.4.2)
                this.mib.setScalarValue(`mod${moduleId}ParamcellOvervoltageAlarmRecovery`, cellUVState);
                
                // 충전 과전류 알람을 파라미터 index 9에 설정 (.1.3.6.1.4.1.64016.{moduleId}.4.9)
                // 충전 전류가 100A 이상이면 1, 아니면 0 (chargeCurrent는 0.01A 단위이므로 100A = 10000)
                const chargeCurrentForAlarm = moduleData.packInfo && moduleData.packInfo.CurrentValue 
                    ? (moduleData.packInfo.CurrentValue > 10000 ? moduleData.packInfo.CurrentValue - 10000 : 0)
                    : 0;
                const chargeOvercurrentAlarm = chargeCurrentForAlarm >= 10000 ? 1 : 0; // 100A 이상이면 1
                this.mib.setScalarValue(`mod${moduleId}ParamchargeOvercurrentAlarm`, chargeOvercurrentAlarm);
                
                // 방전 과전류 알람을 파라미터 index 10에 설정 (.1.3.6.1.4.1.64016.{moduleId}.4.10)
                // 방전 전류가 -100A 이하(절댓값 100A 이상)이면 1, 아니면 0
                // CurrentValue < 10000일 때 방전, dischargeCurrent = 10000 - CurrentValue (0.01A 단위)
                const dischargeCurrentForAlarm = moduleData.packInfo && moduleData.packInfo.CurrentValue 
                    ? (moduleData.packInfo.CurrentValue < 10000 ? 10000 - moduleData.packInfo.CurrentValue : 0)
                    : 0;
                const dischargeOvercurrentAlarm = dischargeCurrentForAlarm >= 10000 ? 1 : 0; // 100A 이상이면 1 (방전 전류가 -100A 이하)
                this.mib.setScalarValue(`mod${moduleId}ParamdischargeOvercurrentAlarm`, dischargeOvercurrentAlarm);
                
                // SOC 저알람을 파라미터 index 11에 설정 (.1.3.6.1.4.1.64016.{moduleId}.4.11)
                // SOC가 10% 미만이면 1, 아니면 0
                const rawSoc = moduleData.packInfo ? moduleData.packInfo.SOC || 0 : 0;
                const soc = rawSoc >= 10000 ? Math.round(rawSoc / 100) : rawSoc; // 10000 이상이면 100으로 나누기
                // 이 부분은 처리하지 말자.
                const socLowAlarm = soc < 0 ? 1 : 0; // 10% 미만이면 1
                this.mib.setScalarValue(`mod${moduleId}ParamsocLowAlarm`, socLowAlarm);
            }

            loggerWinston.info(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 완료`);
        } catch (error) {
            loggerWinston.error(`[Battery MIB] 모듈 ${moduleId} SNMP 값 업데이트 실패:`, error.message || error.toString() || '알 수 없는 에러');
            loggerWinston.error(`[Battery MIB] 에러 상세:`, error);
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

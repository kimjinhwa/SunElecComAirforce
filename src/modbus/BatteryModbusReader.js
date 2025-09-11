/**
 * 배터리 데이터를 Modbus를 통해 읽어오는 클래스 (8개 모듈 지원)
 * IFTECH 48V 배터리 시스템용
 */

const { BatterySystemData } = require('../models/BatteryData');

class BatteryModbusReader {
    constructor(modbusClient) {
        this.modbusClient = modbusClient;
        this.batterySystem = new BatterySystemData();
        this.registerMappings = this.initializeRegisterMappings();
    }

    /**
     * Modbus 레지스터 매핑 초기화
     * MIB 파일의 OID를 Modbus 레지스터 주소로 매핑
     */
    initializeRegisterMappings() {
        return {
            // 모듈 1 레지스터 매핑
            module1: {
                cellVoltages: {
                    startAddress: 0x0000, // 0-15: 셀 1-16 전압
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0010,    // 최대 셀 전압
                    cellMinVoltage: 0x0011,    // 최소 셀 전압
                    cellAvgVoltage: 0x0012,    // 평균 셀 전압
                    avgTemp: 0x0013,           // 평균 온도
                    ambTemp: 0x0014,           // 주변 온도
                    totalVoltage: 0x0015,      // 총 전압
                    packVoltage: 0x0016,       // 팩 전압
                    chargeCurrent: 0x0017,     // 충전 전류
                    dischargeCurrent: 0x0018,  // 방전 전류
                    soc: 0x0019,               // SOC
                    soh: 0x001A,               // SOH
                    ratedCapacity: 0x001B,     // 정격 용량
                    remainingCapacity: 0x001C, // 잔여 용량
                    runningState: 0x001D       // 운전 상태
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0020,     // 셀 과전압 알람
                    cellUndervoltageAlarms: 0x0021,    // 셀 저전압 알람
                    packOvervoltageAlarm: 0x0027,      // 팩 과전압 알람
                    packUndervoltageAlarm: 0x0028,     // 팩 저전압 알람
                    chargeOvercurrentAlarm: 0x0029,    // 충전 과전류 알람
                    dischargeOvercurrentAlarm: 0x002A, // 방전 과전류 알람
                    socLowAlarm: 0x002B                // SOC 저알람
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0030,     // 셀 과전압 알람 임계값
                    cellOvervoltageAlarmRecovery: 0x0031,  // 셀 과전압 알람 복구 임계값
                    cellUndervoltageAlarmValue: 0x0032,    // 셀 저전압 알람 임계값
                    cellUndervoltageAlarmRecovery: 0x0033, // 셀 저전압 알람 복구 임계값
                    socLowAlarmValue: 0x0035               // SOC 저알람 임계값
                }
            },
            // 모듈 2-8도 동일한 패턴으로 매핑 (주소 오프셋: +100, +200, +300, +400, +500, +600, +700)
            module2: {
                cellVoltages: {
                    startAddress: 0x0100,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0110,
                    cellMinVoltage: 0x0111,
                    cellAvgVoltage: 0x0112,
                    avgTemp: 0x0113,
                    ambTemp: 0x0114,
                    totalVoltage: 0x0115,
                    packVoltage: 0x0116,
                    chargeCurrent: 0x0117,
                    dischargeCurrent: 0x0118,
                    soc: 0x0119,
                    soh: 0x011A,
                    ratedCapacity: 0x011B,
                    remainingCapacity: 0x011C,
                    runningState: 0x011D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0120,
                    cellUndervoltageAlarms: 0x0121,
                    packOvervoltageAlarm: 0x0127,
                    packUndervoltageAlarm: 0x0128,
                    chargeOvercurrentAlarm: 0x0129,
                    dischargeOvercurrentAlarm: 0x012A,
                    socLowAlarm: 0x012B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0130,
                    cellOvervoltageAlarmRecovery: 0x0131,
                    cellUndervoltageAlarmValue: 0x0132,
                    cellUndervoltageAlarmRecovery: 0x0133,
                    socLowAlarmValue: 0x0135
                }
            },
            module3: {
                cellVoltages: {
                    startAddress: 0x0200,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0210,
                    cellMinVoltage: 0x0211,
                    cellAvgVoltage: 0x0212,
                    avgTemp: 0x0213,
                    ambTemp: 0x0214,
                    totalVoltage: 0x0215,
                    packVoltage: 0x0216,
                    chargeCurrent: 0x0217,
                    dischargeCurrent: 0x0218,
                    soc: 0x0219,
                    soh: 0x021A,
                    ratedCapacity: 0x021B,
                    remainingCapacity: 0x021C,
                    runningState: 0x021D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0220,
                    cellUndervoltageAlarms: 0x0221,
                    packOvervoltageAlarm: 0x0227,
                    packUndervoltageAlarm: 0x0228,
                    chargeOvercurrentAlarm: 0x0229,
                    dischargeOvercurrentAlarm: 0x022A,
                    socLowAlarm: 0x022B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0230,
                    cellOvervoltageAlarmRecovery: 0x0231,
                    cellUndervoltageAlarmValue: 0x0232,
                    cellUndervoltageAlarmRecovery: 0x0233,
                    socLowAlarmValue: 0x0235
                }
            },
            module4: {
                cellVoltages: {
                    startAddress: 0x0300,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0310,
                    cellMinVoltage: 0x0311,
                    cellAvgVoltage: 0x0312,
                    avgTemp: 0x0313,
                    ambTemp: 0x0314,
                    totalVoltage: 0x0315,
                    packVoltage: 0x0316,
                    chargeCurrent: 0x0317,
                    dischargeCurrent: 0x0318,
                    soc: 0x0319,
                    soh: 0x031A,
                    ratedCapacity: 0x031B,
                    remainingCapacity: 0x031C,
                    runningState: 0x031D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0320,
                    cellUndervoltageAlarms: 0x0321,
                    packOvervoltageAlarm: 0x0327,
                    packUndervoltageAlarm: 0x0328,
                    chargeOvercurrentAlarm: 0x0329,
                    dischargeOvercurrentAlarm: 0x032A,
                    socLowAlarm: 0x032B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0330,
                    cellOvervoltageAlarmRecovery: 0x0331,
                    cellUndervoltageAlarmValue: 0x0332,
                    cellUndervoltageAlarmRecovery: 0x0333,
                    socLowAlarmValue: 0x0335
                }
            },
            module5: {
                cellVoltages: {
                    startAddress: 0x0400,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0410,
                    cellMinVoltage: 0x0411,
                    cellAvgVoltage: 0x0412,
                    avgTemp: 0x0413,
                    ambTemp: 0x0414,
                    totalVoltage: 0x0415,
                    packVoltage: 0x0416,
                    chargeCurrent: 0x0417,
                    dischargeCurrent: 0x0418,
                    soc: 0x0419,
                    soh: 0x041A,
                    ratedCapacity: 0x041B,
                    remainingCapacity: 0x041C,
                    runningState: 0x041D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0420,
                    cellUndervoltageAlarms: 0x0421,
                    packOvervoltageAlarm: 0x0427,
                    packUndervoltageAlarm: 0x0428,
                    chargeOvercurrentAlarm: 0x0429,
                    dischargeOvercurrentAlarm: 0x042A,
                    socLowAlarm: 0x042B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0430,
                    cellOvervoltageAlarmRecovery: 0x0431,
                    cellUndervoltageAlarmValue: 0x0432,
                    cellUndervoltageAlarmRecovery: 0x0433,
                    socLowAlarmValue: 0x0435
                }
            },
            module6: {
                cellVoltages: {
                    startAddress: 0x0500,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0510,
                    cellMinVoltage: 0x0511,
                    cellAvgVoltage: 0x0512,
                    avgTemp: 0x0513,
                    ambTemp: 0x0514,
                    totalVoltage: 0x0515,
                    packVoltage: 0x0516,
                    chargeCurrent: 0x0517,
                    dischargeCurrent: 0x0518,
                    soc: 0x0519,
                    soh: 0x051A,
                    ratedCapacity: 0x051B,
                    remainingCapacity: 0x051C,
                    runningState: 0x051D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0520,
                    cellUndervoltageAlarms: 0x0521,
                    packOvervoltageAlarm: 0x0527,
                    packUndervoltageAlarm: 0x0528,
                    chargeOvercurrentAlarm: 0x0529,
                    dischargeOvercurrentAlarm: 0x052A,
                    socLowAlarm: 0x052B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0530,
                    cellOvervoltageAlarmRecovery: 0x0531,
                    cellUndervoltageAlarmValue: 0x0532,
                    cellUndervoltageAlarmRecovery: 0x0533,
                    socLowAlarmValue: 0x0535
                }
            },
            module7: {
                cellVoltages: {
                    startAddress: 0x0600,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0610,
                    cellMinVoltage: 0x0611,
                    cellAvgVoltage: 0x0612,
                    avgTemp: 0x0613,
                    ambTemp: 0x0614,
                    totalVoltage: 0x0615,
                    packVoltage: 0x0616,
                    chargeCurrent: 0x0617,
                    dischargeCurrent: 0x0618,
                    soc: 0x0619,
                    soh: 0x061A,
                    ratedCapacity: 0x061B,
                    remainingCapacity: 0x061C,
                    runningState: 0x061D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0620,
                    cellUndervoltageAlarms: 0x0621,
                    packOvervoltageAlarm: 0x0627,
                    packUndervoltageAlarm: 0x0628,
                    chargeOvercurrentAlarm: 0x0629,
                    dischargeOvercurrentAlarm: 0x062A,
                    socLowAlarm: 0x062B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0630,
                    cellOvervoltageAlarmRecovery: 0x0631,
                    cellUndervoltageAlarmValue: 0x0632,
                    cellUndervoltageAlarmRecovery: 0x0633,
                    socLowAlarmValue: 0x0635
                }
            },
            module8: {
                cellVoltages: {
                    startAddress: 0x0700,
                    count: 16
                },
                packInfo: {
                    cellMaxVoltage: 0x0710,
                    cellMinVoltage: 0x0711,
                    cellAvgVoltage: 0x0712,
                    avgTemp: 0x0713,
                    ambTemp: 0x0714,
                    totalVoltage: 0x0715,
                    packVoltage: 0x0716,
                    chargeCurrent: 0x0717,
                    dischargeCurrent: 0x0718,
                    soc: 0x0719,
                    soh: 0x071A,
                    ratedCapacity: 0x071B,
                    remainingCapacity: 0x071C,
                    runningState: 0x071D
                },
                alarms: {
                    cellOvervoltageAlarms: 0x0720,
                    cellUndervoltageAlarms: 0x0721,
                    packOvervoltageAlarm: 0x0727,
                    packUndervoltageAlarm: 0x0728,
                    chargeOvercurrentAlarm: 0x0729,
                    dischargeOvercurrentAlarm: 0x072A,
                    socLowAlarm: 0x072B
                },
                parameters: {
                    cellOvervoltageAlarmValue: 0x0730,
                    cellOvervoltageAlarmRecovery: 0x0731,
                    cellUndervoltageAlarmValue: 0x0732,
                    cellUndervoltageAlarmRecovery: 0x0733,
                    socLowAlarmValue: 0x0735
                }
            }
        };
    }

    /**
     * 특정 모듈의 셀 전압 데이터 읽기
     * @param {number} moduleId - 모듈 ID (1-3)
     * @returns {Promise<Array<number>>} 셀 전압 배열
     */
    async readCellVoltages(moduleId) {
        try {
            const mapping = this.registerMappings[`module${moduleId}`];
            if (!mapping) {
                throw new Error(`모듈 ${moduleId}의 매핑을 찾을 수 없습니다.`);
            }

            const result = await this.modbusClient.readHoldingRegisters(
                mapping.cellVoltages.startAddress,
                mapping.cellVoltages.count
            );

            // Modbus 레지스터 값(mV)을 배열로 변환
            return result.data.map(value => value);
        } catch (error) {
            console.error(`모듈 ${moduleId} 셀 전압 읽기 실패:`, error.message);
            return new Array(16).fill(0);
        }
    }

    /**
     * 특정 모듈의 팩 정보 읽기
     * @param {number} moduleId - 모듈 ID (1-3)
     * @returns {Promise<Object>} 팩 정보 객체
     */
    async readPackInfo(moduleId) {
        try {
            const mapping = this.registerMappings[`module${moduleId}`];
            if (!mapping) {
                throw new Error(`모듈 ${moduleId}의 매핑을 찾을 수 없습니다.`);
            }

            const packInfo = {};
            const packInfoMapping = mapping.packInfo;

            // 각 팩 정보 레지스터를 개별적으로 읽기
            for (const [key, address] of Object.entries(packInfoMapping)) {
                try {
                    const result = await this.modbusClient.readHoldingRegisters(address, 1);
                    packInfo[key] = result.data[0];
                } catch (error) {
                    console.warn(`모듈 ${moduleId} ${key} 읽기 실패:`, error.message);
                    packInfo[key] = 0;
                }
            }

            return packInfo;
        } catch (error) {
            console.error(`모듈 ${moduleId} 팩 정보 읽기 실패:`, error.message);
            return {};
        }
    }

    /**
     * 특정 모듈의 알람 상태 읽기
     * @param {number} moduleId - 모듈 ID (1-3)
     * @returns {Promise<Object>} 알람 상태 객체
     */
    async readAlarms(moduleId) {
        try {
            const mapping = this.registerMappings[`module${moduleId}`];
            if (!mapping) {
                throw new Error(`모듈 ${moduleId}의 매핑을 찾을 수 없습니다.`);
            }

            const alarms = {};
            const alarmMapping = mapping.alarms;

            // 각 알람 레지스터를 개별적으로 읽기
            for (const [key, address] of Object.entries(alarmMapping)) {
                try {
                    const result = await this.modbusClient.readHoldingRegisters(address, 1);
                    alarms[key] = result.data[0];
                } catch (error) {
                    console.warn(`모듈 ${moduleId} ${key} 읽기 실패:`, error.message);
                    alarms[key] = 0;
                }
            }

            return alarms;
        } catch (error) {
            console.error(`모듈 ${moduleId} 알람 상태 읽기 실패:`, error.message);
            return {};
        }
    }

    /**
     * 특정 모듈의 파라미터 읽기
     * @param {number} moduleId - 모듈 ID (1-3)
     * @returns {Promise<Object>} 파라미터 객체
     */
    async readParameters(moduleId) {
        try {
            const mapping = this.registerMappings[`module${moduleId}`];
            if (!mapping) {
                throw new Error(`모듈 ${moduleId}의 매핑을 찾을 수 없습니다.`);
            }

            const parameters = {};
            const parameterMapping = mapping.parameters;

            // 각 파라미터 레지스터를 개별적으로 읽기
            for (const [key, address] of Object.entries(parameterMapping)) {
                try {
                    const result = await this.modbusClient.readHoldingRegisters(address, 1);
                    parameters[key] = result.data[0];
                } catch (error) {
                    console.warn(`모듈 ${moduleId} ${key} 읽기 실패:`, error.message);
                    // 기본값 설정
                    if (key.includes('Overvoltage')) parameters[key] = 4200;
                    else if (key.includes('Undervoltage')) parameters[key] = 3000;
                    else if (key.includes('socLow')) parameters[key] = 20;
                }
            }

            return parameters;
        } catch (error) {
            console.error(`모듈 ${moduleId} 파라미터 읽기 실패:`, error.message);
            return {};
        }
    }

    /**
     * 특정 모듈의 전체 데이터 읽기
     * @param {number} moduleId - 모듈 ID (1-3)
     * @returns {Promise<BatteryModuleData>} 모듈 데이터
     */
    async readModuleData(moduleId) {
        try {
            // 모듈이 없으면 생성
            let module = this.batterySystem.getModule(moduleId);
            if (!module) {
                module = this.batterySystem.addModule(moduleId);
            }

            // 병렬로 모든 데이터 읽기
            const [cellVoltages, packInfo, alarms, parameters] = await Promise.all([
                this.readCellVoltages(moduleId),
                this.readPackInfo(moduleId),
                this.readAlarms(moduleId),
                this.readParameters(moduleId)
            ]);

            // 셀 전압 데이터 설정
            module.cellVoltage.setAllCellVoltages(cellVoltages);

            // 팩 정보 설정
            Object.assign(module.packInfo, packInfo);

            // 알람 상태 설정
            Object.assign(module.alarms, alarms);

            // 파라미터 설정
            Object.assign(module.parameters, parameters);

            // 타임스탬프 업데이트
            module.updateTimestamp();

            return module;
        } catch (error) {
            console.error(`모듈 ${moduleId} 데이터 읽기 실패:`, error.message);
            return null;
        }
    }

    /**
     * 모든 모듈의 데이터 읽기 (8개 모듈)
     * @returns {Promise<BatterySystemData>} 배터리 시스템 데이터
     */
    async readAllModulesData() {
        try {
            console.log('배터리 시스템 데이터 읽기 시작... (8개 모듈)');

            // 모든 모듈 데이터를 병렬로 읽기
            const modulePromises = [1, 2, 3, 4, 5, 6, 7, 8].map(moduleId => 
                this.readModuleData(moduleId)
            );

            const modules = await Promise.all(modulePromises);

            // 시스템 상태 업데이트
            this.batterySystem.updateSystemStatus();

            console.log(`배터리 시스템 데이터 읽기 완료. 활성 모듈: ${this.batterySystem.systemInfo.activeModules}`);

            return this.batterySystem;
        } catch (error) {
            console.error('배터리 시스템 데이터 읽기 실패:', error.message);
            return this.batterySystem;
        }
    }

    /**
     * 특정 모듈의 파라미터 쓰기
     * @param {number} moduleId - 모듈 ID (1-8)
     * @param {string} parameterName - 파라미터 이름
     * @param {number} value - 설정할 값
     * @returns {Promise<boolean>} 성공 여부
     */
    async writeParameter(moduleId, parameterName, value) {
        try {
            const mapping = this.registerMappings[`module${moduleId}`];
            if (!mapping || !mapping.parameters[parameterName]) {
                throw new Error(`모듈 ${moduleId}의 ${parameterName} 파라미터를 찾을 수 없습니다.`);
            }

            const address = mapping.parameters[parameterName];
            await this.modbusClient.writeRegister(address, value);

            console.log(`모듈 ${moduleId} ${parameterName} = ${value} 설정 완료`);
            return true;
        } catch (error) {
            console.error(`모듈 ${moduleId} ${parameterName} 설정 실패:`, error.message);
            return false;
        }
    }

    /**
     * 배터리 시스템 데이터 가져오기
     * @returns {BatterySystemData} 배터리 시스템 데이터
     */
    getBatterySystem() {
        return this.batterySystem;
    }
}

module.exports = BatteryModbusReader;

/**
 * 배터리 시스템 Modbus 통신 클래스 (8개 모듈 지원)
 * MIB OID를 Modbus 레지스터 주소로 매핑하여 데이터를 읽고 씁니다.
 */

const startModuleId = 39;
const installedModuleCount = 1;
class BatteryModbusReader {
    constructor(modbusClient) {
        this.modbusClient = modbusClient;
        this.registerMappings = this.initializeRegisterMappings();
        this.isReading = false;
        this.readInterval = null;
        this.readIntervalMs = 1000; // 1초마다 읽기
        this.simulationMode = process.env.SIMULATION_MODE === 'true' || false;
    }

    /**
     * Modbus 레지스터 매핑 초기화
     * MIB 파일의 OID를 Modbus 레지스터 주소로 매핑
     */
    initializeRegisterMappings() {
        return {
            // 공통 레지스터 매핑 (모든 모듈이 동일한 주소 사용, Modbus ID만 다름)
            cellVoltages: {
                startAddress: 0x100D,// 0-15: 셀 1-16 전압
                count: 16
            },
            packInfo: {
                startAddress: 0x0fff,// 0-15: 셀 1-16 전압
                packVoltage: 0x0fff,       // 팩 전압
                CurrentValue: 0x1000,      // 전류값
                remainingCapacity: 0x1001, // 잔여 용량
                AverageCellTemp: 0x1002,   // 평균 셀 온도
                AmbientTemp: 0x1003,       // 주변 온도
                WarnningFlag: 0x1004,      // 경고 플래그
                ProtechtionFlag: 0x1005,   // 보호 플래그
                FaultStatus: 0x1006,       // 오류 상태
                SOC: 0x1007,               // SOC
                CirculateNumber: 0x1008,   // 순환 번호
                SOH: 0x1009,               // SOH
                PCBTemp: 0x100A,           // PCB 온도
                HistoryDischargeCapacity: 0x100B, // 방전 용량
                InstalledCellNumber: 0x100C, // 설치된 셀 수
                CellVoltage0: 0x100D,       // 셀 전압 0
                CellVoltage1: 0x100E,       // 셀 전압 1
                CellVoltage2: 0x100F,       // 셀 전압 2
                CellVoltage3: 0x1010,       // 셀 전압 3
                CellVoltage4: 0x1011,       // 셀 전압 4
                CellVoltage5: 0x1012,       // 셀 전압 5
                CellVoltage6: 0x1013,       // 셀 전압 6
                CellVoltage7: 0x1014,       // 셀 전압 7
                CellVoltage8: 0x1015,       // 셀 전압 8
                CellVoltage9: 0x1016,       // 셀 전압 9
                CellVoltage10: 0x1017,      // 셀 전압 10
                CellVoltage11: 0x1018,      // 셀 전압 11
                CellVoltage12: 0x1019,      // 셀 전압 12
                CellVoltage13: 0x101A,      // 셀 전압 13
                CellVoltage14: 0x101B,      // 셀 전압 14
                CellVoltage15: 0x101C,      // 셀 전압 15
                TemperatureSensorNumber: 0x101D, // 온도 센서 수
                TempCell0: 0x101E,          // 셀 온도 0
                TempCell1: 0x101F,          // 셀 온도 1
                TempCell2: 0x1020,          // 셀 온도 2
                TempCell3: 0x1021,          // 셀 온도 3
                TempCell4: 0x1022,          // 셀 온도 4
                TempCell5: 0x1023,          // 셀 온도 5
                TempCell6: 0x1024,          // 셀 온도 6
                TempCell7: 0x1025,          // 셀 온도 7
                TempCell8: 0x1026,          // 셀 온도 8
                TempCell9: 0x1027,          // 셀 온도 9
                TempCell10: 0x1028,         // 셀 온도 10
                TempCell11: 0x1029,         // 셀 온도 11
                TempCell12: 0x102A,         // 셀 온도 12
                TempCell13: 0x102B,         // 셀 온도 13
                TempCell14: 0x102C,         // 셀 온도 14
                TempCell15: 0x102D,         // 셀 온도 15
                FullCapacity: 0x102E,   //  최대전류용량(A)
                RemainChargeTime: 0x102F,   // 잔여 충전 시간
                RemainDischargeTime: 0x1030, // 잔여 방전 시간
                CellUVState: 0x1031,         // 셀 UV 상태
                count:51
            },
            alarms: {
                // Warning Flag (0x1004) 비트 매핑
                warningFlag: 0x1004,
                cellOvervoltageAlarms: 0,    // Bit0: 셀 과전압 알람
                cellUndervoltageAlarms: 1,   // Bit1: 셀 저전압 알람
                packOvervoltageAlarm: 2,     // Bit2: 팩 과전압 알람
                packUndervoltageAlarm: 3,    // Bit3: 팩 저전압 알람
                chargeOvercurrentAlarm: 4,   // Bit4: 충전 과전류 알람
                dischargeOvercurrentAlarm: 5, // Bit5: 방전 과전류 알람
                cellOverTemperatureAlarm: 6, // Bit6: 셀 과온도 알람
                cellUnderTemperatureAlarm: 7, // Bit7: 셀 저온도 알람
                envOverTemperatureAlarm: 8,  // Bit8: 환경 과온도 알람
                envUnderTemperatureAlarm: 9, // Bit9: 환경 저온도 알람
                pcbOverTemperatureAlarm: 10, // Bit10: PCB 과온도 알람
                socLowAlarm: 11,             // Bit11: SOC 저알람
                diffVoltAlarm: 12,           // Bit12: 차압 알람
                reserve_1: 13,               // Bit13: 예약
                reserve_2: 14,               // Bit14: 예약
                reserve_3: 15,               // Bit15: 예약
                
                // Protection Flag (0x1005) 비트 매핑
                protectionFlag: 0x1005,
                cellOvervoltageProtect: 0,   // Bit0: 셀 과전압 보호
                cellUndervoltageProtect: 1,  // Bit1: 셀 저전압 보호
                packOvervoltageProtect: 2,   // Bit2: 팩 과전압 보호
                packUndervoltageProtect: 3,  // Bit3: 팩 저전압 보호
                scProtect: 4,                // Bit4: 단락 보호
                chgOverTemperatureProtect: 6, // Bit6: 충전 과온도 보호
                chgUnderTemperatureProtect: 7, // Bit7: 충전 저온도 보호
                disgOverTemperatureProtect: 8, // Bit8: 방전 과온도 보호
                disgUnderTemperatureProtect: 9, // Bit9: 방전 저온도 보호
                cocProtect: 10,              // Bit10: 충전 과전류 보호
                docProtect: 11,              // Bit11: 방전 과전류 보호
                antiTheftLock: 12,           // Bit12: 방도락
                
                // Fault Status (0x1006) 비트 매핑
                faultStatus: 0x1006,
                frontEndSampleError: 0,      // Bit0: 프론트엔드 샘플 에러
                tempSenseDisconnect: 1,      // Bit1: 온도 센서 연결 끊김
                inversedGraftError: 2,       // Bit2: 역접속 에러
                charging: 8,                 // Bit8: 충전 중
                discharging: 9,              // Bit9: 방전 중
                chgMosConnect: 10,           // Bit10: 충전 MOS 연결
                disgMosConnect: 11,          // Bit11: 방전 MOS 연결
                limitCurrentEnable: 12,      // Bit12: 제한 전류 활성화
                fullyCharged: 13,            // Bit13: 완전 충전
                moduleFailureInOperation: 14, // Bit14: 모듈 고장이지만 동작 중
                moduleOutOfOperation: 15,    // Bit15: 모듈 동작 중단
                
                // Cell UV State (0x1031) 비트 매핑
                cellUVState: 0x1031,
                cellUV0: 0,                  // Bit0: 셀 0 UV
                cellUV1: 1,                  // Bit1: 셀 1 UV
                cellUV2: 2,                  // Bit2: 셀 2 UV
                cellUV3: 3,                  // Bit3: 셀 3 UV
                cellUV4: 4,                  // Bit4: 셀 4 UV
                cellUV5: 5,                  // Bit5: 셀 5 UV
                cellUV6: 6,                  // Bit6: 셀 6 UV
                cellUV7: 7,                  // Bit7: 셀 7 UV
                cellUV8: 8,                  // Bit8: 셀 8 UV
                cellUV9: 9,                  // Bit9: 셀 9 UV
                cellUV10: 10,                // Bit10: 셀 10 UV
                cellUV11: 11,                // Bit11: 셀 11 UV
                cellUV12: 12,                // Bit12: 셀 12 UV
                cellUV13: 13,                // Bit13: 셀 13 UV
                cellUV14: 14,                // Bit14: 셀 14 UV
                cellUV15: 15,                // Bit15: 셀 15 UV
            },
            parameters: {
                cellOvervoltageAlarmValue: 0x0030,     // 셀 과전압 알람 임계값
                cellOvervoltageAlarmRecovery: 0x0031,  // 셀 과전압 알람 복구 임계값
                cellUndervoltageAlarmValue: 0x0032,    // 셀 저전압 알람 임계값
                cellUndervoltageAlarmRecovery: 0x0033, // 셀 저전압 알람 복구 임계값
                socLowAlarmValue: 0x0035               // SOC 저알람 임계값
            }
        };
    }

    /**
     * 비트 연산 헬퍼 함수들
     */
    
    /**
     * 특정 비트가 설정되어 있는지 확인
     * @param {number} value - 확인할 값
     * @param {number} bitPosition - 비트 위치 (0-15)
     * @returns {boolean} 비트가 설정되어 있으면 true
     */
    isBitSet(value, bitPosition) {
        return (value & (1 << bitPosition)) !== 0;
    }

    /**
     * 16비트 값을 2개의 8비트 값으로 분해
     * @param {number} value - 16비트 값
     * @returns {Object} { lowByte, highByte }
     */
    split16Bit(value) {
        return {
            lowByte: value & 0xFF,      // 하위 8비트
            highByte: (value >> 8) & 0xFF  // 상위 8비트
        };
    }

    /**
     * 2개의 8비트 값을 16비트 값으로 결합
     * @param {number} lowByte - 하위 8비트
     * @param {number} highByte - 상위 8비트
     * @returns {number} 16비트 값
     */
    combine16Bit(lowByte, highByte) {
        return (highByte << 8) | lowByte;
    }

    /**
     * 모든 모듈의 데이터를 병렬로 읽기
     * @returns {Promise<Object>} 모든 모듈의 데이터
     */
    async readAllModulesData() {
        const promises = [];
        
        // 모듈 39-46에 대한 데이터 읽기 Promise 생성
        for (let moduleId = startModuleId; moduleId <= startModuleId + installedModuleCount; moduleId++) {
            promises.push(this.readModuleData(moduleId));
        }
        
        try {
            const results = await Promise.all(promises);
            const moduleData = {};
            
            // 결과를 모듈별로 정리
            results.forEach((data, index) => {
                const moduleId = index + startModuleId; // 39부터 시작
                moduleData[`module${moduleId}`] = data;
            });
            
            return moduleData;
        } catch (error) {
            console.error('모든 모듈 데이터 읽기 실패:', error.message);
            throw error;
        }
    }

    /**
     * 특정 모듈의 모든 데이터 읽기
     * @param {number} moduleId - 모듈 ID (39-46)
     * @returns {Promise<Object>} 모듈 데이터
     */
    async readModuleData(moduleId) {
        try {
            // Modbus ID 설정 (모듈 ID와 동일)
            this.modbusClient.setID(moduleId);
            
            const packData = await this.readPackDataAll(moduleId);

            return {
                cellVoltages: packData, // readPackDataAll에서 반환된 데이터를 cellVoltages로 사용
                packInfo: {}, // 추후 구현
                alarms: {}, // 추후 구현
                parameters: {}, // 추후 구현
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`모듈 ${moduleId} 데이터 읽기 실패:`, error.message);
            throw error;
        }
    }

    /**
     * 특정 모듈의 셀 전압 읽기
     * @param {number} moduleId - 모듈 ID (39-46)
     * @returns {Promise<Array>} 셀 전압 배열
     */
    async readPackDataAll(moduleId) {
        // 시뮬레이션 모드인 경우 가짜 데이터 반환
        if (this.simulationMode) {
            return this.generateSimulatedCellVoltages(moduleId);
        }

        try {
            const mapping = this.registerMappings.packInfo;
            //const mapping = this.registerMappings.packInfo;
            console.log("mapping.startAddress",mapping.startAddress, "mapping.count", mapping.count);
            const result = await this.modbusClient.readInputRegister(
                moduleId,
                mapping.startAddress, 
                mapping.count
            );
            console.log("result.data", result.data);
            
            return result.data.map(voltage => Math.round(voltage * 0.1)); // mV 단위로 변환
        } catch (error) {
            console.error(`모듈 ${moduleId} 셀 전압 읽기 실패:`, error.message);
            return new Array(16).fill(0);
        }
    }

    /**
     * 시뮬레이션 모드용 셀 전압 데이터 생성
     * @param {number} moduleId - 모듈 ID
     * @returns {Array} 시뮬레이션 셀 전압 배열
     */
    generateSimulatedCellVoltages(moduleId) {
        const baseVoltage = 3800 + (moduleId * 10); // 모듈별 기본 전압
        const voltages = [];
        
        for (let i = 0; i < 16; i++) {
            // 각 셀마다 약간의 변동 추가 (±50mV)
            const variation = Math.floor(Math.random() * 100) - 50;
            const voltage = Math.max(3500, Math.min(4200, baseVoltage + variation));
            voltages.push(voltage);
        }
        
        return voltages;
    }


    async writeParameter(moduleId, parameterKey, value) {
        try {
            const parameterMapping = this.registerMappings.parameters;
            const address = parameterMapping[parameterKey];
            
            if (address === undefined) {
                throw new Error(`파라미터 ${parameterKey}를 찾을 수 없습니다.`);
            }

            // Modbus ID 설정
            this.modbusClient.setID(moduleId);
            
            // 단일 레지스터 쓰기
            await this.modbusClient.writeRegister(address, value);
            
            console.log(`모듈 ${moduleId} ${parameterKey} = ${value} 설정 완료`);
            return true;
        } catch (error) {
            console.error(`모듈 ${moduleId} ${parameterKey} 쓰기 실패:`, error.message);
            return false;
        }
    }

    /**
     * OID를 Modbus 주소로 변환
     * @param {string} oid - SNMP OID
     * @returns {Object} Modbus 주소 정보
     */
    parseOID(oid) {
        const parts = oid.split('.');
        
        if (parts.length < 6) {
            throw new Error('잘못된 OID 형식입니다.');
        }
        
        const moduleId = parseInt(parts[5]);
        const dataType = parseInt(parts[6]);
        const index = parseInt(parts[7]);
        
        if (moduleId < 1 || moduleId > 8) {
            throw new Error(`지원하지 않는 모듈 ID: ${moduleId}`);
        }
        
        let address;
        let key;
        
        switch (dataType) {
            case 1: // 셀 전압
                if (index < 1 || index > 16) {
                    throw new Error(`잘못된 셀 인덱스: ${index}`);
                }
                address = this.registerMappings.cellVoltages.startAddress + index - 1;
                key = `cell${index}Voltage`;
                break;
                
            case 2: // 팩 정보
                const packInfoKeys = Object.keys(this.registerMappings.packInfo);
                if (index < 1 || index > packInfoKeys.length) {
                    throw new Error(`잘못된 팩 정보 인덱스: ${index}`);
                }
                key = packInfoKeys[index - 1];
                address = this.registerMappings.packInfo[key];
                break;
                
            case 3: // 알람
                const alarmKeys = Object.keys(this.registerMappings.alarms);
                if (index < 1 || index > alarmKeys.length) {
                    throw new Error(`잘못된 알람 인덱스: ${index}`);
                }
                key = alarmKeys[index - 1];
                address = this.registerMappings.alarms[key];
                break;
                
            case 4: // 파라미터
                const parameterKeys = Object.keys(this.registerMappings.parameters);
                if (index < 1 || index > parameterKeys.length) {
                    throw new Error(`잘못된 파라미터 인덱스: ${index}`);
                }
                key = parameterKeys[index - 1];
                address = this.registerMappings.parameters[key];
                break;
                
            default:
                throw new Error(`지원하지 않는 데이터 타입: ${dataType}`);
        }
        
        return {
            moduleId,
            dataType,
            index,
            address,
            key
        };
    }

    /**
     * 사용 가능한 OID 목록 반환
     * @returns {Array} OID 목록
     */
    getAvailableOIDs() {
        const oids = [];
        
        for (let moduleId = 1; moduleId <= 8; moduleId++) {
            const baseOid = `1.3.6.1.4.1.64016.${moduleId}`;
            
            // 셀 전압 OID들
            for (let i = 1; i <= 16; i++) {
                oids.push(`${baseOid}.1.${i}`);
            }
            
            // 팩 정보 OID들
            const packInfoKeys = Object.keys(this.registerMappings.packInfo);
            packInfoKeys.forEach((key, index) => {
                oids.push(`${baseOid}.2.${index + 1}`);
            });
            
            // 알람 OID들
            const alarmKeys = Object.keys(this.registerMappings.alarms);
            alarmKeys.forEach((key, index) => {
                oids.push(`${baseOid}.3.${index + 1}`);
            });
            
            // 파라미터 OID들
            const parameterKeys = Object.keys(this.registerMappings.parameters);
            parameterKeys.forEach((key, index) => {
                oids.push(`${baseOid}.4.${index + 1}`);
            });
        }
        
        return oids;
    }

    /**
     * 주기적 데이터 읽기 시작
     * @param {number} intervalMs - 읽기 간격 (밀리초, 기본값: 1000ms)
     */
    startPeriodicReading(intervalMs = 1000) {
        if (this.isReading) {
            console.log('이미 주기적 읽기가 실행 중입니다.');
            return;
        }

        this.readIntervalMs = intervalMs;
        this.isReading = true;
        
        console.log(`주기적 배터리 데이터 읽기 시작 (${intervalMs}ms 간격)`);
        
        // 즉시 한 번 실행
        this.readAllModulesData().catch(error => {
            console.error('초기 데이터 읽기 실패:', error.message);
        });

        // 주기적 실행
        this.readInterval = setInterval(async () => {
            try {
                await this.readAllModulesData();
            } catch (error) {
                console.error('주기적 데이터 읽기 실패:', error.message);
            }
        }, this.readIntervalMs);
    }

    /**
     * 주기적 데이터 읽기 중지
     */
    stopPeriodicReading() {
        if (!this.isReading) {
            console.log('주기적 읽기가 실행되지 않고 있습니다.');
            return;
        }

        if (this.readInterval) {
            clearInterval(this.readInterval);
            this.readInterval = null;
        }
        
        this.isReading = false;
        console.log('주기적 배터리 데이터 읽기 중지');
    }

    /**
     * 읽기 상태 확인
     * @returns {boolean} 읽기 실행 중 여부
     */
    isPeriodicReadingActive() {
        return this.isReading;
    }

    /**
     * 읽기 간격 설정
     * @param {number} intervalMs - 새로운 읽기 간격 (밀리초)
     */
    setReadInterval(intervalMs) {
        this.readIntervalMs = intervalMs;
        
        if (this.isReading) {
            // 실행 중이면 재시작
            this.stopPeriodicReading();
            this.startPeriodicReading(intervalMs);
        }
    }

    /**
     * 특정 모듈의 셀 전압만 주기적으로 읽기
     * @param {number} moduleId - 모듈 ID (39-46)
     * @param {number} intervalMs - 읽기 간격 (밀리초)
     */
    startCellVoltageReading(moduleId, intervalMs = 1000) {
        if (this.isReading) {
            console.log('이미 주기적 읽기가 실행 중입니다. 먼저 중지하세요.');
            return;
        }

        this.isReading = true;
        console.log(`모듈 ${moduleId} 셀 전압 주기적 읽기 시작 (${intervalMs}ms 간격)`);

        // 즉시 한 번 실행
        this.readPackDataAll(moduleId).then(data => {
            console.log(`모듈 ${moduleId} 셀 전압:`, data);
        }).catch(error => {
            console.error(`모듈 ${moduleId} 초기 셀 전압 읽기 실패:`, error.message);
        });

        // 주기적 실행
        this.readInterval = setInterval(async () => {
            try {
                const data = await this.readPackDataAll(moduleId);
                console.log(`[${new Date().toISOString()}] 모듈 ${moduleId} 셀 전압:`, data);
            } catch (error) {
                console.error(`모듈 ${moduleId} 셀 전압 읽기 실패:`, error.message);
            }
        }, intervalMs);
    }
}

export default BatteryModbusReader;
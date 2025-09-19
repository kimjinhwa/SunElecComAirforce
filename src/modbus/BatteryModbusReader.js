/**
 * 배터리 시스템 Modbus 통신 클래스 (8개 모듈 지원)
 * MIB OID를 Modbus 레지스터 주소로 매핑하여 데이터를 읽고 씁니다.
 */

const startModuleId = 39;
let installedModuleCount = 1;
class BatteryModbusReader {
    constructor(modbusClient,moduleCount) {
        this.multi_data= {
            timestamp: new Date(),
            devices: {},
            summary: { 
                total: moduleCount,
                success: 0, 
                failed: 0 
            },
        };
        installedModuleCount = moduleCount;

        console.log("moduleCount-------------->", moduleCount);

        this.modbusClient = modbusClient;
        this.registerMappings = this.initializeRegisterMappings();
        this.isReading = false;
        this.readInterval = null;
        this.readIntervalMs = 1000; // 1초마다 읽기
        this.simulationMode = process.env.SIMULATION_MODE === 'true' || false;
        this.stats = {
            totalReads: 0,
            successfulReads: 0,
            failedReads: 0,
            lastReadTime: null,
            lastSuccessTime: null,
            lastFailureTime: null,
            consecutiveFailures: 0,
            maxConsecutiveFailures: 0
        };
        this.startStatsMonitoring();
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
        const batchId = Math.random().toString(36).substring(2, 11);
        const startTime = Date.now();
        
        //console.log(`[BATCH-${batchId}] 모든 모듈 데이터 읽기 시작 - 모듈 수: ${installedModuleCount}`);
        
        const promises = [];
        
        // 모듈 39-46에 대한 데이터 읽기 Promise 생성
        for (let moduleId = startModuleId; moduleId < startModuleId + installedModuleCount; moduleId++) {

            //console.log(`[BATCH-${batchId}] 모듈 ${moduleId} 읽기 Promise 생성`);
            promises.push(this.readModuleData(moduleId));
            // 배열을 테스트하기 위해 한번 더 해 보자
            //console.log(`[BATCH-${batchId}] 모듈 ${moduleId} 읽기 Promise 생성`);
            //promises.push(this.readModuleData(moduleId));
        }
        
        try {
            //console.log(`[BATCH-${batchId}] ${promises.length}개 모듈 병렬 읽기 시작`);
            const results = await Promise.all(promises);
            const duration = Date.now() - startTime;
            
            //console.log(`[BATCH-${batchId}] 모든 모듈 읽기 완료 - 소요시간: ${duration}ms`);
            
            const moduleData = {};
            
            // 결과를 모듈별로 정리
            results.forEach((data, index) => {
                const moduleId = index + startModuleId -38; // 39부터 시작
                moduleData[`module${moduleId}`] = data;
                //console.log(`[BATCH-${batchId}] 모듈 ${moduleId} 데이터 정리 완료`);
                this.multi_data.summary.total = installedModuleCount;
            });
            this.multi_data.summary.success = 0;
            results.forEach((data, index) => {
                data.result.status = 'success';
                const moduleId = index + startModuleId -38; // 39부터 시작
                this.multi_data.timestamp = data.timestamp;
                this.multi_data.devices[`${moduleId}`] = data.result;
                this.multi_data.summary.success++;
            });
            //console.log("moduleData-------------->", this.multi_data);
            //console.log(`[BATCH-${batchId}] 모든 모듈 데이터 정리 완료 - 총 소요시간: ${Date.now() - startTime}ms`);
            
            // 통계 업데이트
            this.updateStats(true);
            
            return moduleData;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[BATCH-${batchId}] 모든 모듈 데이터 읽기 실패 - 소요시간: ${duration}ms, 에러: ${error.message}`);
            
            // 부분적 실패 처리 - 성공한 모듈들만 반환
            console.log(`[BATCH-${batchId}] 부분적 실패 처리 시도`);
            const partialResults = [];
            const moduleData = {};
            
            for (let i = 0; i < promises.length; i++) {
                try {
                    const result = await promises[i];
                    const moduleId = i + startModuleId - 38;
                    moduleData[`module${moduleId}`] = result;
                    console.log(`[BATCH-${batchId}] 모듈 ${moduleId} 부분 성공`);
                } catch (moduleError) {
                    const moduleId = i + startModuleId - 38;
                    console.error(`[BATCH-${batchId}] 모듈 ${moduleId} 부분 실패: ${moduleError.message}`);
                }
            }
            
            if (Object.keys(moduleData).length > 0) {
                console.log(`[BATCH-${batchId}] 부분적 데이터 반환 - 성공한 모듈: ${Object.keys(moduleData).length}개`);
                // 부분적 성공으로 간주
                this.updateStats(true);
                return moduleData;
            } else {
                // 완전 실패
                this.updateStats(false);
                throw error;
            }
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
            
            const packData= await this.readPackDataInputRegister(moduleId);
            //여기에서 이미 modbusResultData에 데이터가 추가되어 있음

            return {
                cellVoltages: packData.cellVoltages || [], // 셀 전압 배열
                packInfo: {
                    packVoltage: packData.packVoltage,
                    CurrentValue: packData.CurrentValue,
                    remainingCapacity: packData.remainingCapacity,
                    AverageCellTemp: packData.AverageCellTemp,
                    AmbientTemp: packData.AmbientTemp,
                    WarningFlag: packData.WarningFlag,
                    ProtectionFlag: packData.ProtectionFlag,
                    FaultStatus: packData.FaultStatus,
                    SOC: packData.SOC,
                    CirculateNumber: packData.CirculateNumber,
                    SOH: packData.SOH,
                    PCBTemp: packData.PCBTemp,
                    HistoryDischargeCapacity: packData.HistoryDischargeCapacity,
                    InstalledCellNumber: packData.InstalledCellNumber,
                    TemperatureSensorNumber: packData.TemperatureSensorNumber,
                    cellTemperatures: packData.cellTemperatures || [],
                    FullCapacity: packData.FullCapacity,
                    RemainChargeTime: packData.RemainChargeTime,
                    RemainDischargeTime: packData.RemainDischargeTime,
                    CellUVState: packData.CellUVState
                },
                alarms: {
                    warningFlag: packData.WarningFlag,
                    protectionFlag: packData.ProtectionFlag,
                    faultStatus: packData.FaultStatus
                },
                parameters: {}, // 추후 구현
                timestamp: new Date().toISOString(),
                result: packData.result
            };
        } catch (error) {
            console.error(`모듈 ${moduleId} 데이터 읽기 실패:`, error.message);
            throw error;
        }
    }

    /**
     * 특정 모듈의 PackInfo 데이터 읽기 (51개 레지스터)
     * @param {number} moduleId - 모듈 ID (39-46)
     * @returns {Promise<Object>} 파싱된 PackInfo 데이터
     */
    async readPackDataInputRegister(moduleId) {
        const sessionId = Math.random().toString(36).substring(2, 11);
        const startTime = Date.now();
        
        //console.log(`[SESSION-${sessionId}] 모듈 ${moduleId} PackInfo 읽기 세션 시작`);
        
        // 시뮬레이션 모드인 경우 가짜 데이터 반환
        if (this.simulationMode) {
            //console.log(`[SESSION-${sessionId}] 시뮬레이션 모드 - 가짜 데이터 반환`);
            return this.generateSimulatedPackInfo(moduleId);
        }

        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
            try {
                const mapping = this.registerMappings.packInfo;
                //console.log(`[SESSION-${sessionId}] 모듈 ${moduleId} PackInfo 읽기 시도 ${retryCount + 1}/${maxRetries + 1} - 주소: 0x${mapping.startAddress.toString(16)}, 개수: ${mapping.count}`);
                
                const result = await this.modbusClient.readInputRegister(
                    moduleId,
                    mapping.startAddress, 
                    mapping.count
                );
                
                const duration = Date.now() - startTime;
                //console.log(`[SESSION-${sessionId}] 모듈 ${moduleId} PackInfo 읽기 성공 - 소요시간: ${duration}ms, 데이터 개수: ${result.data ? result.data.length : 0}`);
                
                // 데이터 유효성 검사
                if (!result || !result.data || result.data.length !== mapping.count) {
                    throw new Error(`데이터 길이 불일치 - 예상: ${mapping.count}, 실제: ${result.data ? result.data.length : 0}`);
                }
                // 
                // 51개 레지스터 데이터를 파싱
                const parsedData = this.parsePackInfoData(result);
                //console.log(`[SESSION-${sessionId}] 모듈 ${moduleId} 데이터 파싱 완료`);
                
                return parsedData;
                
            } catch (error) {
                retryCount++;
                const duration = Date.now() - startTime;
                //console.error(`[SESSION-${sessionId}] 모듈 ${moduleId} PackInfo 읽기 실패 (시도 ${retryCount}/${maxRetries + 1}) - 소요시간: ${duration}ms, 에러: ${error.message}`);
                
                if (retryCount <= maxRetries) {
                    const retryDelay = Math.min(1000 * retryCount, 3000); // 1초, 2초, 3초 대기
                    //console.log(`[SESSION-${sessionId}] ${retryDelay}ms 후 재시도...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    //console.error(`[SESSION-${sessionId}] 모듈 ${moduleId} 최대 재시도 횟수 초과 - 기본값 반환`);
                    return this.generateResetPackInfo(moduleId);
                }
            }
        }
    }

    /**
     * 실패시 Reset 셀 전압 데이터 생성
     * @param {number} moduleId - 모듈 ID
     * @returns {Array} 실패시 Reset 셀 전압 배열
     */
    generateResetCellVoltages(moduleId) {
        const baseVoltage = 0; // 0V + 모듈별 변동
        const voltages = [];
        
        for (let i = 0; i < 16; i++) {
            const voltage = 0;
            voltages.push(voltage);
        }
        
        return voltages;
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

    /**
     * 실패시 Reset PackInfo 데이터 생성
     * @param {number} moduleId - 모듈 ID
     * @returns {Object} 실패시 Reset PackInfo 데이터
     */
    generateResetPackInfo(moduleId) {
        const baseVoltage = 0; // 0V + 모듈별 변동
        const baseCurrent = 0; // 0A + 모듈별 변동
        
        return {
            packVoltage: 0, // 0.01V 단위
            CurrentValue: 0, // 0.1A 단위
            remainingCapacity: 0, // 80-99%
            AverageCellTemp: 0, // 25.0°C + 변동
            AmbientTemp: 0, // 20.0°C + 변동
            WarningFlag: 0,
            ProtectionFlag: 0,
            FaultStatus: 0,
            SOC: 0, // 85-99%
            CirculateNumber: 0,
            SOH: 0, // 95-99%
            PCBTemp: 0, // 30.0°C + 변동
            HistoryDischargeCapacity: 0,
            InstalledCellNumber: 0,
            cellVoltages: this.generateResetCellVoltages(moduleId),
            TemperatureSensorNumber: 0,
            cellTemperatures: 0,
            FullCapacity: 0,
            RemainChargeTime: 0,
            RemainDischargeTime: 0,
            CellUVState: 0
        };
    }
    /**
     * 시뮬레이션 모드용 PackInfo 데이터 생성
     * @param {number} moduleId - 모듈 ID
     * @returns {Object} 시뮬레이션 PackInfo 데이터
     */
    generateSimulatedPackInfo(moduleId) {
        const baseVoltage = 48000 + (moduleId * 100); // 48V + 모듈별 변동
        const baseCurrent = 1000 + (moduleId * 50); // 1A + 모듈별 변동
        
        return {
            packVoltage: Math.round(baseVoltage * 0.1), // 0.01V 단위
            CurrentValue: Math.round(baseCurrent * 0.1), // 0.1A 단위
            remainingCapacity: 80 + (moduleId % 20), // 80-99%
            AverageCellTemp: 250 + (moduleId * 5), // 25.0°C + 변동
            AmbientTemp: 200 + (moduleId * 3), // 20.0°C + 변동
            WarningFlag: 0,
            ProtectionFlag: 0,
            FaultStatus: 0,
            SOC: 85 + (moduleId % 15), // 85-99%
            CirculateNumber: moduleId * 100,
            SOH: 95 + (moduleId % 5), // 95-99%
            PCBTemp: 300 + (moduleId * 2), // 30.0°C + 변동
            HistoryDischargeCapacity: moduleId * 1000,
            InstalledCellNumber: 16,
            cellVoltages: this.generateSimulatedCellVoltages(moduleId),
            TemperatureSensorNumber: 4,
            cellTemperatures: [250, 255, 245, 260].map(temp => temp + (moduleId * 2)),
            FullCapacity: 10000 + (moduleId * 100),
            RemainChargeTime: 120 + (moduleId * 10),
            RemainDischargeTime: 300 + (moduleId * 20),
            CellUVState: 0
        };
    }

    /**
     * 51개 레지스터 데이터를 PackInfo 객체로 파싱
     * @param {Array} data - 51개 레지스터 데이터
     * @returns {Object} 파싱된 PackInfo 데이터
     */
    parsePackInfoData(result) {
        const data = result.data;
        if (!data || data.length < 51) {
            console.warn('[Modbus] PackInfo 데이터가 부족합니다. 시뮬레이션 데이터를 사용합니다.');
            return this.generateSimulatedPackInfo(39); // 기본 모듈 ID
        }

        return {
            packVoltage: data[0] , // 0.01V 단위
            CurrentValue: data[1] , // 0.1A 단위
            remainingCapacity: data[2],
            AverageCellTemp: data[3],
            AmbientTemp: data[4],
            WarningFlag: data[5],
            ProtectionFlag: data[6],
            FaultStatus: data[7],
            SOC: data[8],
            CirculateNumber: data[9],
            SOH: data[10],
            PCBTemp: data[11],
            HistoryDischargeCapacity: data[12],
            InstalledCellNumber: data[13],
            cellVoltages: data.slice(14, 30),//.map(voltage => Math.round(voltage * 0.1)), // 셀 전압 16개
            TemperatureSensorNumber: data[30],
            cellTemperatures: data.slice(31, 47), // 온도 센서 16개
            FullCapacity: data[47],
            RemainChargeTime: data[48],
            RemainDischargeTime: data[49],
            CellUVState: data[50],
            result: result
        };
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
        this.readPackDataInputRegister(moduleId).then(data => {
            console.log(`모듈 ${moduleId} 셀 전압:`, data);
        }).catch(error => {
            console.error(`모듈 ${moduleId} 초기 셀 전압 읽기 실패:`, error.message);
        });

        // 주기적 실행
        this.readInterval = setInterval(async () => {
            try {
                const data = await this.readPackDataInputRegister(moduleId);
                console.log(`[${new Date().toISOString()}] 모듈 ${moduleId} 셀 전압:`, data);

            } catch (error) {
                console.error(`모듈 ${moduleId} 셀 전압 읽기 실패:`, error.message);
            }
        }, intervalMs);
    }

    /**
     * 통계 업데이트
     */
    updateStats(success) {
        this.stats.totalReads++;
        this.stats.lastReadTime = new Date();
        
        if (success) {
            this.stats.successfulReads++;
            this.stats.lastSuccessTime = new Date();
            this.stats.consecutiveFailures = 0;
        } else {
            this.stats.failedReads++;
            this.stats.lastFailureTime = new Date();
            this.stats.consecutiveFailures++;
            this.stats.maxConsecutiveFailures = Math.max(this.stats.maxConsecutiveFailures, this.stats.consecutiveFailures);
        }
    }

    /**
     * 통계 조회
     */
    getStats() {
        const successRate = this.stats.totalReads > 0 
            ? (this.stats.successfulReads / this.stats.totalReads * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            successRate: `${successRate}%`
        };
    }

    /**
     * 통계 모니터링 시작
     */
    startStatsMonitoring() {
        // 5분마다 통계 출력
        setInterval(() => {
            const stats = this.getStats();
            const memUsage = process.memoryUsage();
            
            console.log(`[BATTERY-STATS] 배터리 데이터 읽기 통계:`);
            console.log(`  총 읽기: ${stats.totalReads}, 성공: ${stats.successfulReads}, 실패: ${stats.failedReads}`);
            console.log(`  성공률: ${stats.successRate}, 연속 실패: ${stats.consecutiveFailures}, 최대 연속 실패: ${stats.maxConsecutiveFailures}`);
            console.log(`  마지막 성공: ${stats.lastSuccessTime ? stats.lastSuccessTime.toISOString() : '없음'}`);
            console.log(`  마지막 실패: ${stats.lastFailureTime ? stats.lastFailureTime.toISOString() : '없음'}`);
            console.log(`  메모리 사용량: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
            
            // 연속 실패 경고
            if (stats.consecutiveFailures >= 5) {
                console.warn(`[BATTERY-STATS] 경고: ${stats.consecutiveFailures}회 연속 실패 - 통신 상태 확인 필요`);
            }
            
            // 장시간 실패 경고
            if (stats.lastFailureTime && stats.lastSuccessTime) {
                const timeSinceLastSuccess = Date.now() - stats.lastSuccessTime.getTime();
                if (timeSinceLastSuccess > 60000) { // 1분 이상
                    console.warn(`[BATTERY-STATS] 경고: 1분 이상 성공한 읽기가 없음 - 연결 상태 확인 필요`);
                }
            }
        }, 300000); // 5분마다
    }
}

export default BatteryModbusReader;
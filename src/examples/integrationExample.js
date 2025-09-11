/**
 * 배터리 시스템 통합 사용 예제 (8개 모듈 지원)
 * Modbus 통신과 SNMP 서비스를 통합한 예제
 */

const { BatterySystemData } = require('../models/BatteryData');
const BatteryModbusReader = require('../modbus/BatteryModbusReader');

// Modbus 클라이언트 시뮬레이션 (실제로는 modbus-serial 등을 사용)
class MockModbusClient {
    constructor() {
        this.registers = new Map();
        this.initializeMockData();
    }

    initializeMockData() {
        // 모듈 1 데이터 초기화
        const module1Data = {
            // 셀 전압 (0x0000-0x000F)
            0x0000: 3800, 0x0001: 3810, 0x0002: 3795, 0x0003: 3805,
            0x0004: 3820, 0x0005: 3815, 0x0006: 3800, 0x0007: 3810,
            0x0008: 3790, 0x0009: 3800, 0x000A: 3815, 0x000B: 3805,
            0x000C: 3820, 0x000D: 3810, 0x000E: 3805, 0x000F: 3800,
            
            // 팩 정보 (0x0010-0x001D)
            0x0010: 3820, // 최대 셀 전압
            0x0011: 3790, // 최소 셀 전압
            0x0012: 3805, // 평균 셀 전압
            0x0013: 25,   // 평균 온도
            0x0014: 23,   // 주변 온도
            0x0015: 6080, // 총 전압 (60.8V)
            0x0016: 6080, // 팩 전압
            0x0017: 0,    // 충전 전류
            0x0018: 1500, // 방전 전류 (15A)
            0x0019: 85,   // SOC
            0x001A: 95,   // SOH
            0x001B: 10000, // 정격 용량 (100AH)
            0x001C: 8500, // 잔여 용량 (85AH)
            0x001D: 2,    // 운전 상태 (방전)
            
            // 알람 상태 (0x0020-0x002B)
            0x0020: 0,    // 셀 과전압 알람
            0x0021: 0,    // 셀 저전압 알람
            0x0027: 0,    // 팩 과전압 알람
            0x0028: 0,    // 팩 저전압 알람
            0x0029: 0,    // 충전 과전류 알람
            0x002A: 0,    // 방전 과전류 알람
            0x002B: 0,    // SOC 저알람
            
            // 파라미터 (0x0030-0x0035)
            0x0030: 4200, // 셀 과전압 알람 임계값
            0x0031: 4100, // 셀 과전압 알람 복구 임계값
            0x0032: 3000, // 셀 저전압 알람 임계값
            0x0033: 3100, // 셀 저전압 알람 복구 임계값
            0x0035: 20    // SOC 저알람 임계값
        };

        // 모듈 2 데이터 (일부 셀 문제)
        const module2Data = {
            // 셀 전압 (0x0100-0x010F) - 3번 셀 저전압
            0x0100: 3800, 0x0101: 3810, 0x0102: 2900, 0x0103: 3805,
            0x0104: 3820, 0x0105: 3815, 0x0106: 3800, 0x0107: 3810,
            0x0108: 3790, 0x0109: 3800, 0x010A: 3815, 0x010B: 3805,
            0x010C: 3820, 0x010D: 3810, 0x010E: 3805, 0x010F: 3800,
            
            // 팩 정보 (0x0110-0x011D)
            0x0110: 3820, // 최대 셀 전압
            0x0111: 2900, // 최소 셀 전압
            0x0112: 3750, // 평균 셀 전압
            0x0113: 28,   // 평균 온도
            0x0114: 25,   // 주변 온도
            0x0115: 5950, // 총 전압 (59.5V)
            0x0116: 5950, // 팩 전압
            0x0117: 0,    // 충전 전류
            0x0118: 1200, // 방전 전류 (12A)
            0x0119: 75,   // SOC
            0x011A: 90,   // SOH
            0x011B: 10000, // 정격 용량
            0x011C: 7500, // 잔여 용량
            0x011D: 2,    // 운전 상태 (방전)
            
            // 알람 상태 (0x0120-0x012B) - 3번 셀 저전압 알람
            0x0120: 0,    // 셀 과전압 알람
            0x0121: 4,    // 셀 저전압 알람 (3번 셀)
            0x0127: 0,    // 팩 과전압 알람
            0x0128: 0,    // 팩 저전압 알람
            0x0129: 0,    // 충전 과전류 알람
            0x012A: 0,    // 방전 과전류 알람
            0x012B: 0,    // SOC 저알람
            
            // 파라미터 (0x0130-0x0135)
            0x0130: 4200, 0x0131: 4100, 0x0132: 3000, 0x0133: 3100, 0x0135: 20
        };

        // 모듈 3 데이터 (충전 중)
        const module3Data = {
            // 셀 전압 (0x0200-0x020F)
            0x0200: 4100, 0x0201: 4105, 0x0202: 4095, 0x0203: 4100,
            0x0204: 4110, 0x0205: 4105, 0x0206: 4100, 0x0207: 4105,
            0x0208: 4090, 0x0209: 4100, 0x020A: 4105, 0x020B: 4100,
            0x020C: 4110, 0x020D: 4105, 0x020E: 4100, 0x020F: 4100,
            
            // 팩 정보 (0x0210-0x021D)
            0x0210: 4110, // 최대 셀 전압
            0x0211: 4090, // 최소 셀 전압
            0x0212: 4102, // 평균 셀 전압
            0x0213: 30,   // 평균 온도
            0x0214: 28,   // 주변 온도
            0x0215: 6560, // 총 전압 (65.6V)
            0x0216: 6560, // 팩 전압
            0x0217: 2000, // 충전 전류 (20A)
            0x0218: 0,    // 방전 전류
            0x0219: 95,   // SOC
            0x021A: 98,   // SOH
            0x021B: 10000, // 정격 용량
            0x021C: 9500, // 잔여 용량
            0x021D: 1,    // 운전 상태 (충전)
            
            // 알람 상태 (0x0220-0x022B)
            0x0220: 0, 0x0221: 0, 0x0227: 0, 0x0228: 0, 0x0229: 0, 0x022A: 0, 0x022B: 0,
            
            // 파라미터 (0x0230-0x0235)
            0x0230: 4200, 0x0231: 4100, 0x0232: 3000, 0x0233: 3100, 0x0235: 20
        };

        // 모듈 4-8 데이터도 추가 (간단한 패턴으로)
        const module4Data = this.generateModuleData(0x0300, 0x0400, 0x0500, 0x0600);
        const module5Data = this.generateModuleData(0x0400, 0x0500, 0x0600, 0x0700);
        const module6Data = this.generateModuleData(0x0500, 0x0600, 0x0700, 0x0800);
        const module7Data = this.generateModuleData(0x0600, 0x0700, 0x0800, 0x0900);
        const module8Data = this.generateModuleData(0x0700, 0x0800, 0x0900, 0x0A00);

        // 모든 데이터를 레지스터 맵에 저장
        Object.entries(module1Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module2Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module3Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module4Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module5Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module6Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module7Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
        Object.entries(module8Data).forEach(([addr, value]) => {
            this.registers.set(parseInt(addr, 16), value);
        });
    }

    async readHoldingRegisters(startAddress, count) {
        return new Promise((resolve) => {
            const data = [];
            for (let i = 0; i < count; i++) {
                const address = startAddress + i;
                data.push(this.registers.get(address) || 0);
            }
            resolve({ data });
        });
    }

    async writeRegister(address, value) {
        this.registers.set(address, value);
        return Promise.resolve();
    }

    // 모듈 데이터 생성 헬퍼 메서드
    generateModuleData(cellStart, packStart, alarmStart, paramStart) {
        const data = {};
        
        // 셀 전압 (16개 셀)
        for (let i = 0; i < 16; i++) {
            data[cellStart + i] = 3800 + Math.floor(Math.random() * 100);
        }
        
        // 팩 정보
        data[packStart] = 3820; // 최대 셀 전압
        data[packStart + 1] = 3780; // 최소 셀 전압
        data[packStart + 2] = 3800; // 평균 셀 전압
        data[packStart + 3] = 25; // 평균 온도
        data[packStart + 4] = 23; // 주변 온도
        data[packStart + 5] = 6080; // 총 전압
        data[packStart + 6] = 6080; // 팩 전압
        data[packStart + 7] = 0; // 충전 전류
        data[packStart + 8] = 1000; // 방전 전류
        data[packStart + 9] = 80; // SOC
        data[packStart + 10] = 90; // SOH
        data[packStart + 11] = 10000; // 정격 용량
        data[packStart + 12] = 8000; // 잔여 용량
        data[packStart + 13] = 2; // 운전 상태
        
        // 알람 상태
        data[alarmStart] = 0; // 셀 과전압 알람
        data[alarmStart + 1] = 0; // 셀 저전압 알람
        data[alarmStart + 7] = 0; // 팩 과전압 알람
        data[alarmStart + 8] = 0; // 팩 저전압 알람
        data[alarmStart + 9] = 0; // 충전 과전류 알람
        data[alarmStart + 10] = 0; // 방전 과전류 알람
        data[alarmStart + 11] = 0; // SOC 저알람
        
        // 파라미터
        data[paramStart] = 4200; // 셀 과전압 알람 임계값
        data[paramStart + 1] = 4100; // 셀 과전압 알람 복구 임계값
        data[paramStart + 2] = 3000; // 셀 저전압 알람 임계값
        data[paramStart + 3] = 3100; // 셀 저전압 알람 복구 임계값
        data[paramStart + 5] = 20; // SOC 저알람 임계값
        
        return data;
    }
}

// SNMP 서비스 시뮬레이션
class MockSNMPService {
    constructor(batterySystem) {
        this.batterySystem = batterySystem;
    }

    // MIB OID를 모듈 ID와 데이터 타입으로 파싱 (8개 모듈 지원)
    parseOID(oid) {
        // 예: 1.3.6.1.4.1.64016.1.1.1.1 -> moduleId: 1, dataType: 'cellVoltage', cellIndex: 1
        const parts = oid.split('.');
        if (parts.length < 10) return null;

        const moduleId = parseInt(parts[7]); // 64016 다음의 모듈 ID (1-8)
        const category = parseInt(parts[8]); // 1=cellVoltage, 2=packInfo, 3=alarms, 4=parameters
        const index = parseInt(parts[9]);    // 세부 인덱스

        // 모듈 ID 유효성 검사
        if (moduleId < 1 || moduleId > 8) return null;

        return { moduleId, category, index };
    }

    // OID에 해당하는 값을 반환
    getValue(oid) {
        const parsed = this.parseOID(oid);
        if (!parsed) return null;

        const { moduleId, category, index } = parsed;
        const module = this.batterySystem.getModule(moduleId);
        if (!module) return null;

        switch (category) {
            case 1: // cellVoltage
                return module.cellVoltage.getCellVoltage(index);
            case 2: // packInfo
                const packInfoKeys = [
                    'cellMaxVoltage', 'cellMinVoltage', 'cellAvgVoltage',
                    'avgTemp', 'ambTemp', 'totalVoltage', 'packVoltage',
                    'chargeCurrent', 'dischargeCurrent', 'soc', 'soh',
                    'ratedCapacity', 'remainingCapacity', 'runningState'
                ];
                const key = packInfoKeys[index - 1];
                return key ? module.packInfo[key] : null;
            case 3: // alarms
                const alarmKeys = [
                    'cellOvervoltageAlarms', 'cellUndervoltageAlarms',
                    null, null, null, null, null, // 3-7은 사용되지 않음
                    'packOvervoltageAlarm', 'packUndervoltageAlarm',
                    'chargeOvercurrentAlarm', 'dischargeOvercurrentAlarm', 'socLowAlarm'
                ];
                const alarmKey = alarmKeys[index - 1];
                return alarmKey ? module.alarms[alarmKey] : null;
            case 4: // parameters
                const paramKeys = [
                    'cellOvervoltageAlarmValue', 'cellOvervoltageAlarmRecovery',
                    'cellUndervoltageAlarmValue', 'cellUndervoltageAlarmRecovery',
                    null, 'socLowAlarmValue'
                ];
                const paramKey = paramKeys[index - 1];
                return paramKey ? module.parameters[paramKey] : null;
            default:
                return null;
        }
    }

    // SNMP GET 요청 처리
    handleGetRequest(oid) {
        const value = this.getValue(oid);
        if (value !== null) {
            return {
                oid: oid,
                value: value,
                type: 'Unsigned32'
            };
        }
        return null;
    }
}

// 메인 실행 함수
async function main() {
    console.log('=== IFTECH 48V 배터리 시스템 통합 예제 (8개 모듈) ===\n');

    // 1. Modbus 클라이언트 초기화
    const modbusClient = new MockModbusClient();
    const batteryReader = new BatteryModbusReader(modbusClient);

    // 2. 배터리 데이터 읽기
    console.log('1. Modbus를 통한 배터리 데이터 읽기...');
    const batterySystem = await batteryReader.readAllModulesData();
    
    console.log(`   - 총 모듈 수: ${batterySystem.systemInfo.totalModules}`);
    console.log(`   - 활성 모듈 수: ${batterySystem.systemInfo.activeModules}`);
    console.log(`   - 시스템 상태: ${batterySystem.systemInfo.systemStatus}\n`);

    // 3. 각 모듈 상태 출력
    console.log('2. 각 모듈 상태:');
    for (let moduleId = 1; moduleId <= 3; moduleId++) {
        const module = batterySystem.getModule(moduleId);
        if (module) {
            console.log(`   모듈 ${moduleId}:`);
            console.log(`     - SOC: ${module.packInfo.soc}%`);
            console.log(`     - SOH: ${module.packInfo.soh}%`);
            console.log(`     - 팩 전압: ${module.packInfo.packVoltage}V`);
            console.log(`     - 셀 전압 범위: ${module.cellVoltage.minVoltage}-${module.cellVoltage.maxVoltage}mV`);
            console.log(`     - 알람: ${module.alarms.hasAnyAlarm() ? '있음' : '없음'}`);
            console.log(`     - 상태: ${module.packInfo.runningState === 1 ? '충전' : 
                                      module.packInfo.runningState === 2 ? '방전' : '정지'}`);
        }
    }

    // 4. SNMP 서비스 시뮬레이션
    console.log('\n3. SNMP 서비스 시뮬레이션:');
    const snmpService = new MockSNMPService(batterySystem);

    // 몇 가지 OID 테스트 (8개 모듈)
    const testOIDs = [
        '1.3.6.1.4.1.64016.1.1.1.1',  // 모듈1 셀1 전압
        '1.3.6.1.4.1.64016.1.2.10',   // 모듈1 SOC
        '1.3.6.1.4.1.64016.1.3.1',    // 모듈1 셀 과전압 알람
        '1.3.6.1.4.1.64016.2.1.1',    // 모듈2 셀1 전압
        '1.3.6.1.4.1.64016.3.2.10',   // 모듈3 SOC
        '1.3.6.1.4.1.64016.4.1.1',    // 모듈4 셀1 전압
        '1.3.6.1.4.1.64016.5.2.10',   // 모듈5 SOC
        '1.3.6.1.4.1.64016.6.3.1',    // 모듈6 셀 과전압 알람
        '1.3.6.1.4.1.64016.7.1.1',    // 모듈7 셀1 전압
        '1.3.6.1.4.1.64016.8.2.10'    // 모듈8 SOC
    ];

    testOIDs.forEach(oid => {
        const result = snmpService.handleGetRequest(oid);
        if (result) {
            console.log(`   ${oid}: ${result.value} (${result.type})`);
        } else {
            console.log(`   ${oid}: 값 없음`);
        }
    });

    // 5. 파라미터 설정 예제
    console.log('\n4. 파라미터 설정 예제:');
    const success = await batteryReader.writeParameter(1, 'cellOvervoltageAlarmValue', 4250);
    console.log(`   모듈1 셀 과전압 알람 임계값 설정: ${success ? '성공' : '실패'}`);

    // 6. 전체 시스템 JSON 출력
    console.log('\n5. 전체 시스템 데이터 (JSON):');
    console.log(JSON.stringify(batterySystem.toJSON(), null, 2));

    console.log('\n=== 통합 예제 완료 ===');
    console.log('이 구조를 사용하여 실제 Modbus 통신과 SNMP 서비스를 구현할 수 있습니다.');
}

// 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    MockModbusClient,
    MockSNMPService,
    main
};

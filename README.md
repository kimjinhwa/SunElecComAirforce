# IFTECH 48V 배터리 관리 시스템 (BMS) SNMP 서비스 (8개 모듈 지원)

IFTECH 48VPack_VER_01.MIB 파일을 기반으로 한 배터리 관리 시스템의 데이터 구조와 Modbus 통신을 통한 데이터 수집 시스템입니다. 최대 8개의 배터리 모듈을 지원합니다.

## 📁 프로젝트 구조

```
bmsSnmp/
├── src/
│   ├── models/
│   │   └── BatteryData.js          # 배터리 데이터 모델 클래스들
│   ├── modbus/
│   │   ├── BatteryModbusReader.js  # Modbus 통신을 통한 데이터 읽기
│   │   ├── ModbusDeviceClient.js   # Modbus 디바이스 클라이언트
│   │   └── serialManager.js        # 시리얼 통신 관리자
│   ├── examples/
│   │   ├── batteryDataExample.js   # 데이터 모델 사용 예제
│   │   └── integrationExample.js   # 통합 사용 예제
│   ├── mib/
│   │   ├── IFTECH_48VPack_VER_01.MIB  # SNMP MIB 파일
│   │   ├── IFTECH-BMSSYSTEM-MIB.cds   # MIB 컴파일된 데이터
│   │   ├── IFTECH-BMSSYSTEM-MIB.cmi   # MIB 컴파일된 정보
│   │   ├── battery.mib.js             # 배터리 MIB JavaScript 모듈
│   │   ├── mib2.interfaces.js         # MIB-2 인터페이스 모듈
│   │   └── mib2.system.js             # MIB-2 시스템 모듈
│   └── index.js                    # 메인 애플리케이션
├── Dockerfile                      # Docker 컨테이너 설정
├── package.json                    # Node.js 프로젝트 설정
├── package-lock.json              # 의존성 잠금 파일
└── README.md
```

## 🚀 주요 기능

### 1. 배터리 데이터 모델 (8개 모듈 지원)
- **CellVoltageData**: 16개 셀의 전압 정보 관리
- **PackInfoData**: 배터리 팩의 전체 상태 정보 (SOC, SOH, 온도, 전류 등)
- **AlarmData**: 각종 알람 상태를 비트 필드로 관리
- **ParameterData**: 알람 임계값 등의 설정값 관리
- **BatteryModuleData**: 하나의 배터리 모듈의 모든 정보 통합
- **BatterySystemData**: 전체 배터리 시스템(최대 8개 모듈) 관리

### 2. Modbus 통신 (8개 모듈 지원)
- MIB 파일의 OID를 Modbus 레지스터 주소로 매핑
- 8개 모듈 병렬 데이터 읽기로 성능 최적화
- 에러 처리 및 재시도 로직

### 3. SNMP 서비스 (8개 모듈 지원)
- MIB 파일 기반 OID 파싱 (모듈 1-8)
- 실시간 배터리 상태 모니터링
- 알람 및 파라미터 관리

## 📊 지원하는 데이터

### 셀 전압 (16개 셀)
- 개별 셀 전압 (mV)
- 최대/최소/평균 셀 전압
- 셀별 과전압/저전압 알람

### 팩 정보
- SOC (State of Charge): 0-100%
- SOH (State of Health): 0-100%
- 총 전압/팩 전압 (V)
- 충전/방전 전류 (A)
- 평균/주변 온도 (°C)
- 정격/잔여 용량 (AH)
- 운전 상태 (충전/방전/정지)

### 알람 상태
- 셀 과전압/저전압 알람 (16비트 비트필드)
- 팩 과전압/저전압 알람
- 충전/방전 과전류 알람
- SOC 저알람

### 파라미터 설정
- 셀 과전압 알람 임계값/복구값
- 셀 저전압 알람 임계값/복구값
- SOC 저알람 임계값

## 🛠️ 설치 및 사용

### 1. 의존성 설치
```bash
npm install modbus-serial  # Modbus 통신용
npm install snmp-native    # SNMP 서비스용
```

### 2. 기본 사용법

```javascript
const { BatterySystemData } = require('./src/models/BatteryData');
const BatteryModbusReader = require('./src/modbus/BatteryModbusReader');

// 배터리 시스템 초기화
const batterySystem = new BatterySystemData();

// Modbus 클라이언트 설정 (실제 구현에서는 modbus-serial 사용)
const modbusClient = new ModbusClient('192.168.1.100', 502);
const batteryReader = new BatteryModbusReader(modbusClient);

// 모든 모듈 데이터 읽기
const systemData = await batteryReader.readAllModulesData();

// 특정 모듈 데이터 접근
const module1 = systemData.getModule(1);
console.log(`모듈1 SOC: ${module1.packInfo.soc}%`);
console.log(`모듈1 셀1 전압: ${module1.cellVoltage.getCellVoltage(1)}mV`);
```

### 3. 예제 실행

```bash
# 데이터 모델 사용 예제
node src/examples/batteryDataExample.js

# 통합 사용 예제 (Modbus + SNMP)
node src/examples/integrationExample.js
```

## 📋 Modbus 레지스터 매핑 (8개 모듈)

### 기본 주소 구조
- **모듈 ID**: 1-8 (Modbus ID: 0x038 + 모듈 ID)
- **입력 레지스터**: 0x0FFF ~ 0x1031 (각 모듈별 동일한 주소 사용)

### 상세 레지스터 매핑

#### 📊 팩 정보 레지스터
| 주소 | 데이터 | 단위 | 스케일 | 오프셋 | 설명 |
|------|--------|------|--------|--------|------|
| 0x0FFF | Pack Voltage | V | 0.01 | 0 | 팩 전압 |
| 0x1000 | Current Value | A | 0.1 | -10000 | 전류값 (음수: 방전, 양수: 충전) |
| 0x1001 | Remaining Capacity | Ah | 0.1 | 0 | 잔여 용량 |
| 0x1002 | Average Cell Temp | °C | 0.1 | -400 | 평균 셀 온도 |
| 0x1003 | Ambient Temp | °C | 0.1 | -400 | 주변 온도 |
| 0x1007 | SOC | % | 1 | 0 | 충전 상태 (0-100%) |
| 0x1008 | Circulate Number | - | 1 | 0 | 순환 횟수 |
| 0x1009 | SOH | % | 1 | 0 | 상태 (0-100%) |
| 0x100A | PCB Temp | °C | 0.1 | -400 | PCB 온도 |
| 0x100B | History Discharge Capacity | Ah | 1 | 0 | 누적 방전 용량 |
| 0x100C | Installed Cell Number | - | 1 | 0 | 설치된 셀 개수 |
| 0x101D | Temperature Sensor Number | - | 1 | 0 | 온도 센서 개수 |
| 0x102F | Remain Charge Time | min | 1 | 0 | 잔여 충전 시간 |
| 0x1030 | Remain Discharge Time | min | 1 | 0 | 잔여 방전 시간 |

#### 🔋 셀 전압 레지스터 (0x100D-0x101C)
| 주소 | 데이터 | 단위 | 스케일 | 오프셋 | 설명 |
|------|--------|------|--------|--------|------|
| 0x100D | Cell Voltage 0 | V | 0.001 | 0 | 셀 0 전압 |
| 0x100E | Cell Voltage 1 | V | 0.001 | 0 | 셀 1 전압 |
| ... | ... | ... | ... | ... | ... |
| 0x101C | Cell Voltage 15 | V | 0.001 | 0 | 셀 15 전압 |

#### 🌡️ 셀 온도 레지스터 (0x101E-0x102D)
| 주소 | 데이터 | 단위 | 스케일 | 오프셋 | 설명 |
|------|--------|------|--------|--------|------|
| 0x101E | Temp Cell 0 | °C | 0.1 | -400 | 셀 0 온도 |
| 0x101F | Temp Cell 1 | °C | 0.1 | -400 | 셀 1 온도 |
| ... | ... | ... | ... | ... | ... |
| 0x102D | Temp Cell 15 | °C | 0.1 | -400 | 셀 15 온도 |

#### 🚨 상태 플래그 레지스터

##### Warning Flag (0x1004)
| 비트 | Byte0 | Byte1 | 설명 |
|------|-------|-------|------|
| 0 | Cell OV Alarm | Env OT Alarm | 셀 과전압 알람 / 환경 과온 알람 |
| 1 | Cell UV Alarm | Env UT Alarm | 셀 저전압 알람 / 환경 저온 알람 |
| 2 | Pack OV Alarm | PCB OT Alarm | 팩 과전압 알람 / PCB 과온 알람 |
| 3 | Pack UV Alarm | SOC Low Alarm | 팩 저전압 알람 / SOC 저알람 |
| 4 | Chg OC Alarm | Diff Volt Alarm | 충전 과전류 알람 / 전압 차이 알람 |
| 5 | Disg OC Alarm | Reserved | 방전 과전류 알람 |
| 6 | Cell OT Alarm | Reserved | 셀 과온 알람 |
| 7 | Cell UT Alarm | Reserved | 셀 저온 알람 |

##### Protection Flag (0x1005)
| 비트 | Byte0 | Byte1 | 설명 |
|------|-------|-------|------|
| 0 | Cell OV Protect | Disg OT Protect | 셀 과전압 보호 / 방전 과온 보호 |
| 1 | Cell UV Protect | Disg UT Protect | 셀 저전압 보호 / 방전 저온 보호 |
| 2 | Pack OV Protect | COC Protect | 팩 과전압 보호 / 충전 과전류 보호 |
| 3 | Pack UV Protect | DOC Protect | 팩 저전압 보호 / 방전 과전류 보호 |
| 4 | SC Protect | 防盗锁 | 단락 보호 / 도난 방지 |
| 5 | Reserved | Reserved | 예약 |
| 6 | Chg OT Protect | Reserved | 충전 과온 보호 |
| 7 | Chg UT Protect | Reserved | 충전 저온 보호 |

##### Fault Status (0x1006)
| 비트 | Byte0 | Byte1 | 설명 |
|------|-------|-------|------|
| 0 | Front-end Sample Error | Charging | 프론트엔드 샘플 오류 / 충전 중 |
| 1 | Temp Sense Disconnect | Discharging | 온도 센서 연결 끊김 / 방전 중 |
| 2 | Inversed Graft Error | Chg MOS Connect | 역접속 오류 / 충전 MOS 연결 |
| 3 | Reserved | Disg MOS Connect | 예약 / 방전 MOS 연결 |
| 4 | Reserved | Limit Current Enable | 예약 / 전류 제한 활성화 |
| 5 | Reserved | Fully Charged | 예약 / 완전 충전 |
| 6 | Reserved | Module failure but in operation | 예약 / 모듈 오류 (운전 중) |
| 7 | Reserved | Module out of operation | 예약 / 모듈 운전 중단 |

##### Cell UV State (0x1031)
| 비트 | Byte0 | Byte1 | 설명 |
|------|-------|-------|------|
| 0-7 | Cell 0-7 UV | Cell 8-15 UV | 셀 0-15 저전압 상태 |

### 모듈별 주소 할당
- **모듈 1**: Modbus ID 0x039 (57)
- **모듈 2**: Modbus ID 0x03A (58)
- **모듈 3**: Modbus ID 0x03B (59)
- **모듈 4**: Modbus ID 0x03C (60)
- **모듈 5**: Modbus ID 0x03D (61)
- **모듈 6**: Modbus ID 0x03E (62)
- **모듈 7**: Modbus ID 0x03F (63)
- **모듈 8**: Modbus ID 0x040 (64)

## 🔧 SNMP OID 구조

```
1.3.6.1.4.1.64016.{moduleId}.{category}.{index}
```

- **moduleId**: 1-8 (모듈 번호)
- **category**: 1=셀전압, 2=팩정보, 3=알람, 4=파라미터
- **index**: 세부 항목 인덱스

### 예시 OID (8개 모듈)
- `1.3.6.1.4.1.64016.1.1.1.1`: 모듈1 셀1 전압
- `1.3.6.1.4.1.64016.1.2.10`: 모듈1 SOC
- `1.3.6.1.4.1.64016.1.3.1`: 모듈1 셀 과전압 알람
- `1.3.6.1.4.1.64016.4.1.1`: 모듈4 셀1 전압
- `1.3.6.1.4.1.64016.8.2.10`: 모듈8 SOC

## 📈 모니터링 및 알람

### 시스템 상태
- **normal**: 정상 상태
- **warning**: 경고 상태 (SOC 낮음, 온도 비정상 등)
- **alarm**: 알람 상태 (셀 전압 이상, 과전류 등)
- **unknown**: 상태 불명

### 알람 감지
```javascript
const module = batterySystem.getModule(1);

// 전체 알람 확인
if (module.alarms.hasAnyAlarm()) {
    console.log('알람이 발생했습니다!');
}

// 특정 셀 알람 확인
if (module.alarms.getCellUndervoltageAlarm(3)) {
    console.log('3번 셀 저전압 알람!');
}
```

## 🔄 데이터 업데이트

### 실시간 모니터링
```javascript
// 주기적으로 데이터 업데이트
setInterval(async () => {
    await batteryReader.readAllModulesData();
    batterySystem.updateSystemStatus();
    
    // 상태 출력
    console.log(`시스템 상태: ${batterySystem.systemInfo.systemStatus}`);
}, 5000); // 5초마다 업데이트
```

### 파라미터 설정
```javascript
// 셀 과전압 알람 임계값 설정
await batteryReader.writeParameter(1, 'cellOvervoltageAlarmValue', 4250);

// SOC 저알람 임계값 설정
await batteryReader.writeParameter(1, 'socLowAlarmValue', 15);
```

## 🚨 주의사항

1. **Modbus 통신**: 실제 배터리 시스템과의 통신을 위해서는 적절한 Modbus 클라이언트 라이브러리를 사용하세요.

2. **에러 처리**: 네트워크 오류나 통신 실패에 대한 적절한 에러 처리를 구현하세요.

3. **데이터 검증**: 수신된 데이터의 유효성을 검증하고 범위를 확인하세요.

4. **성능**: 대량의 데이터를 처리할 때는 적절한 캐싱과 배치 처리를 고려하세요.

## 📝 라이선스

이 프로젝트는 IFTECH 배터리 관리 시스템을 위한 교육 및 개발 목적으로 제작되었습니다.

## 🤝 기여

버그 리포트, 기능 요청, 또는 코드 기여를 환영합니다. 이슈를 생성하거나 풀 리퀘스트를 보내주세요.

## 📞 지원

기술 지원이나 문의사항이 있으시면 mvcjhkim@gmail.com으로 연락주세요.

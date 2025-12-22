# IFTECH 48V 배터리 관리 시스템 (BMS) SNMP 서비스 (8개 모듈 지원)

IFTECH 48VPack_VER_01.MIB 파일을 기반으로 한 배터리 관리 시스템의 데이터 구조와 Modbus 통신을 통한 데이터 수집 시스템입니다. 최대 8개의 배터리 모듈을 지원합니다.

## 📁 프로젝트 구조

```
bmsSnmp/
├── src/
│   ├── models/
│   │   └── BatteryData.js          # 배터리 데이터 모델 클래스들
│   ├── modbus/
│   │   └── BatteryModbusReader.js  # Modbus 통신을 통한 데이터 읽기
│   ├── examples/
│   │   ├── batteryDataExample.js   # 데이터 모델 사용 예제
│   │   └── integrationExample.js   # 통합 사용 예제
│   ├── mib/
│   │   └── IFTECH_48VPack_VER_01.MIB  # SNMP MIB 파일
│   └── index.js                    # 메인 애플리케이션
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
const moduleData = await batteryReader.readAllModulesData();

// 특정 모듈 데이터 접근 (Modbus ID 기반: module39, module40, ...)
const module39 = moduleData.module39;
console.log(`모듈1 SOC: ${module39.packInfo.SOC}%`);
console.log(`모듈1 셀1 전압: ${module39.cellVoltages[0]}mV`);
```

### 3. moduleData 구조

`readAllModulesData()` 함수가 반환하는 `moduleData` 객체의 구조:

```javascript
{
  // Modbus ID를 키로 사용 (module39, module40, module41, ...)
  module39: {
    cellVoltages: [3335, 3323, 3323, ...], // 셀 전압 배열 (15개, mV 단위)
    packInfo: {
      packVoltage: 4986,              // 팩 전압 (0.01V 단위)
      CurrentValue: 10000,            // 전류 (0.1A 단위, 10000 = 0A, 10000 이상 = 충전, 10000 미만 = 방전)
      remainingCapacity: 10835,       // 잔여 용량
      AverageCellTemp: 640,           // 평균 셀 온도 (0.1°C 단위, 400 오프셋 포함)
      AmbientTemp: 590,               // 주변 온도 (0.1°C 단위, 400 오프셋 포함)
      WarningFlag: 0,                 // 경고 플래그
      ProtectionFlag: 0,              // 보호 플래그
      FaultStatus: 0,                 // 오류 상태
      SOC: 10000,                     // 충전 상태 (10000 = 100%)
      CirculateNumber: 6,             // 순환 번호
      SOH: 10000,                     // 건강 상태 (10000 = 100%)
      PCBTemp: 640,                   // PCB 온도 (0.1°C 단위, 400 오프셋 포함)
      HistoryDischargeCapacity: 0,    // 방전 용량
      InstalledCellNumber: 15,        // 설치된 셀 수
      TemperatureSensorNumber: 6,     // 온도 센서 수
      cellTemperatures: [590, 590, 590, 590, 640, 590], // 온도 센서 배열 (6개, 0.1°C 단위, 400 오프셋 포함)
      FullCapacity: 10835,           // 최대 용량
      RemainChargeTime: 0,            // 잔여 충전 시간
      RemainDischargeTime: 0,         // 잔여 방전 시간
      CellUVState: 0                  // 셀 저전압 상태
    },
    alarms: {
      warningFlag: 0,                 // 경고 플래그
      protectionFlag: 0,              // 보호 플래그
      faultStatus: 0                  // 오류 상태
    },
    parameters: {},                   // 파라미터 설정 (추후 구현)
    timestamp: "2025-01-20T10:30:00.000Z", // 타임스탬프 (ISO 8601 형식)
    result: {
      status: "success",              // "success" 또는 "failed"
      error: undefined,               // 에러 메시지 (실패 시)
      data: [4986, 10000, 10835, ...], // 51개 레지스터 배열
      buffer: <Buffer ...>             // 바이너리 버퍼
    }
  },
  module40: { /* 동일한 구조 */ },
  module41: { /* 동일한 구조 */ },
  // ... 최대 8개 모듈 (module39 ~ module46)
}
```

**주요 필드 설명:**
- **cellVoltages**: 셀 전압 배열 (15개, mV 단위)
- **packInfo.packVoltage**: 팩 전압 (0.01V 단위, 예: 4986 = 49.86V)
- **packInfo.CurrentValue**: 전류 (0.1A 단위, 10000 = 0A, 10000 이상 = 충전, 10000 미만 = 방전)
- **packInfo.SOC**: 충전 상태 (10000 = 100%, 5000 = 50%)
- **packInfo.SOH**: 건강 상태 (10000 = 100%, 5000 = 50%)
- **packInfo.AverageCellTemp**: 평균 셀 온도 (0.1°C 단위, 400 오프셋 포함, 예: 640 = 24.0°C)
- **packInfo.AmbientTemp**: 주변 온도 (0.1°C 단위, 400 오프셋 포함)
- **packInfo.cellTemperatures**: 온도 센서 배열 (6개, 0.1°C 단위, 400 오프셋 포함)
- **result.status**: 데이터 읽기 상태 ("success" 또는 "failed")
- **result.data**: 51개 레지스터 배열 (Modbus 형식)

### 4. 예제 실행

```bash
# 데이터 모델 사용 예제
node src/examples/batteryDataExample.js

# 통합 사용 예제 (Modbus + SNMP)
node src/examples/integrationExample.js
```

## 📋 Modbus 레지스터 매핑 (8개 모듈)

### 모듈 1 (주소: 0x0000-0x003F)
- **0x0000-0x000F**: 셀 1-16 전압 (mV)
- **0x0010-0x001D**: 팩 정보 (전압, 전류, SOC, SOH 등)
- **0x0020-0x002B**: 알람 상태
- **0x0030-0x0035**: 파라미터 설정

### 모듈 2 (주소: 0x0100-0x013F)
- 모듈 1과 동일한 구조, 주소 오프셋 +100

### 모듈 3 (주소: 0x0200-0x023F)
- 모듈 1과 동일한 구조, 주소 오프셋 +200

### 모듈 4 (주소: 0x0300-0x033F)
- 모듈 1과 동일한 구조, 주소 오프셋 +300

### 모듈 5 (주소: 0x0400-0x043F)
- 모듈 1과 동일한 구조, 주소 오프셋 +400

### 모듈 6 (주소: 0x0500-0x053F)
- 모듈 1과 동일한 구조, 주소 오프셋 +500

### 모듈 7 (주소: 0x0600-0x063F)
- 모듈 1과 동일한 구조, 주소 오프셋 +600

### 모듈 8 (주소: 0x0700-0x073F)
- 모듈 1과 동일한 구조, 주소 오프셋 +700

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

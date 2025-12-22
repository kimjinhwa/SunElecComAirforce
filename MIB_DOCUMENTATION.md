# IFTECH NARADA 48V 배터리 관리 시스템 (BMS) SNMP MIB 설명서

## 📋 개요

이 문서는 `IFTECH_NARADA_48VPack_VER_01.MIB` 파일에 정의된 SNMP OID 구조와 각 객체의 의미를 설명합니다.

**MIB 정보:**
- **MIB 이름**: IFTECH-NARADABMSSYSTEM-MIB
- **기업 OID**: 1.3.6.1.4.1.64016
- **최종 업데이트**: 2024-12-14
- **조직**: IFTECH FOR BATTERY Management System
- **연락처**: mvcjhkim@gmail.com
- **지원 모듈 수**: 최대 10개 모듈 (Module 1-10)

## 🏗️ OID 구조

각 모듈은 다음 5개의 주요 카테고리로 구성됩니다:

```
1.3.6.1.4.1.64016.{moduleId}.{category}.{index}
```

- **moduleId**: 1-10 (모듈 번호)
- **category**: 
  - `1` = Cell Voltage (셀 전압)
  - `2` = Temperature (온도 센서)
  - `3` = Pack Info (팩 정보)
  - `4` = Alarms (알람 상태)
  <!-- - `5` = Parameters (파라미터 설정 - 사용하지 않음.) -->
- **index**: 각 카테고리 내 세부 항목 인덱스

---

## 📊 1. Cell Voltage (셀 전압) - Category 1

각 모듈은 최대 16개의 셀 전압을 모니터링합니다.

### OID 형식
```
1.3.6.1.4.1.64016.{moduleId}.1.{cellNumber}
```

### 예시 OID
- `1.3.6.1.4.1.64016.1.1.1` - Module 1, Cell 1 전압
- `1.3.6.1.4.1.64016.1.1.2` - Module 1, Cell 2 전압
- `1.3.6.1.4.1.64016.1.1.16` - Module 1, Cell 16 전압
- `1.3.6.1.4.1.64016.2.1.1` - Module 2, Cell 1 전압

### 객체 정보
- **SYNTAX**: Unsigned32
- **UNITS**: mV (밀리볼트)
- **범위**: 0-5000 mV
- **접근 권한**: read-only
- **설명**: 각 셀의 전압 값을 밀리볼트 단위로 제공

---

## 🌡️ 2. Temperature (온도 센서) - Category 2

배터리 팩의 온도 센서 정보를 제공합니다.

### OID 형식
```
1.3.6.1.4.1.64016.{moduleId}.2.{index}
```

### 객체 목록

| Index | OID 이름 | 설명 | 단위 | 범위/형식 |
|-------|----------|------|------|-----------|
| 1 | `mod{id}-temp1` | 온도 센서 1 | Celsius | Integer32 (-30 to 120) |
| 2 | `mod{id}-temp2` | 온도 센서 2 | Celsius | Integer32 |
| 3 | `mod{id}-temp3` | 온도 센서 3 | Celsius | Integer32 |
| 4 | `mod{id}-temp4` | 온도 센서 4 | Celsius | Integer32 |
| 5 | `mod{id}-mosfet-temp1` | MOSFET 온도 1 | Celsius | Integer32 |
| 6 | `mod{id}-packVoltage2` | MOSFET 온도 2 | Celsius | Integer32 |
| 7 | `mod{id}-ambient-temp` | 주변 온도 | Celsius | Integer32 |

### 예시 OID
- `1.3.6.1.4.1.64016.1.2.1` - Module 1 온도 센서 1
- `1.3.6.1.4.1.64016.1.2.5` - Module 1 MOSFET 온도 1
- `1.3.6.1.4.1.64016.1.2.7` - Module 1 주변 온도

### 객체 정보
- **SYNTAX**: Integer32
- **UNITS**: Celsius (섭씨 온도)
- **접근 권한**: read-only
- **설명**: 배터리 팩의 각종 온도 센서 값

---

## 📦 3. Pack Info (팩 정보) - Category 3

배터리 팩의 전체 상태 정보를 제공합니다.

### OID 형식
```
1.3.6.1.4.1.64016.{moduleId}.3.{index}
```

### 객체 목록

| Index | OID 이름 | 설명 | 단위 | 범위/형식 |
|-------|----------|------|------|-----------|
| 1 | `mod{id}-cell-max-voltage` | 최대 셀 전압 | mV | 0-5000 |
| 2 | `mod{id}-cell-min-voltage` | 최소 셀 전압 | mV | 0-5000 |
| 3 | `mod{id}-cell-avg-voltage` | 평균 셀 전압 | mV | 0-5000 |
| 4 | `mod{id}-max-temp` | 최대 온도 | Celsius | Integer32,Scale 1/10 |
| 5 | `mod{id}-min-temp` | 최소 온도 | Celsius | Integer32,Scale 1/10  |
| 6 | `mod{id}-total-voltage` | 총 전압 | V | 0-7000 (V/100 표시),Scale 1/100  |
| 7 | `mod{id}-pack-voltage` | 팩 전압 | V | Unsigned32 ,Scale 1/100 |
| 8 | `mod{id}-charge-current` | 충전 전류 | A | 0-60000 (A/100 표시),Scale 1/10  |
| 9 | `mod{id}-discharge-current` | 방전 전류 | A | Unsigned32, Scale 1/10 |
| 10 | `mod{id}-soc` | 충전 상태 (State of Charge) | percent | 0-100% |
| 11 | `mod{id}-soh` | 건강 상태 (State of Health) | percent | 0-100% |
| 12 | `mod{id}-rated-capacity` | 정격 용량 | AH | 10-65000 (AH/100 표시) |
| 13 | `mod{id}-remaining-capacity` | 잔여 용량 | AH | Unsigned32 |
| 14 | `mod{id}-running-state` | 운전 상태 | - | 1=Charge, 2=Discharge, 3=Stop(Wating)|

### 예시 OID
- `1.3.6.1.4.1.64016.1.3.1` - Module 1 최대 셀 전압
- `1.3.6.1.4.1.64016.1.3.10` - Module 1 SOC
- `1.3.6.1.4.1.64016.1.3.14` - Module 1 운전 상태

### 객체 정보
- **SYNTAX**: Unsigned32 또는 Integer32 (항목에 따라 다름)
- **접근 권한**: read-only
- **설명**: 배터리 팩의 전압, 전류, 온도, 용량, 상태 정보

---

## 🚨 4. Alarms (알람 상태) - Category 4

각종 알람 상태를 모니터링합니다.

### OID 형식
```
1.3.6.1.4.1.64016.{moduleId}.4.{index}
```

### 객체 목록

| Index | OID 이름 | 설명 | 형식 | 값 |
|-------|----------|------|------|-----|
| 1 | `mod{id}-cell-overvoltage-alarms` | 셀 과전압 알람 (비트 필드, 셀 1-16) | Unsigned32 | 비트 필드 |
| 2 | `mod{id}-cell-undervoltage-alarms` | 셀 저전압 알람 (비트 필드, 셀 1-16) | Unsigned32 | 비트 필드 |
| 3 | `mod{id}-temp-charge-overheat-alarms` | 충전 과열 알람 | Unsigned32 | - |
| 4 | `mod{id}-temp-charge-underheat-alarms` | 충전 저온 알람 | Unsigned32 | - |
| 5 | `mod{id}-temp-discharge-overheat-alarms` | 방전 과열 알람 | Unsigned32 | - |
| 6 | `mod{id}-temp-discharge-underheat-alarms` | 방전 저온 알람 | Unsigned32 | - |
| 7 | `mod{id}-pack-overvoltage-alarm` | 팩 과전압 알람 | Unsigned32 | 0=Normal, 1=Alarm |
| 8 | `mod{id}-pack-undervoltage-alarm` | 팩 저전압 알람 | Unsigned32 | 0=Normal, 1=Alarm |
| 9 | `mod{id}-charge-overcurrent-alarm` | 충전 과전류 알람 | Unsigned32 | 0=Normal, 1=Alarm |
| 10 | `mod{id}-discharge-overcurrent-alarm` | 방전 과전류 알람 | Unsigned32 | 0=Normal, 1=Alarm |
| 11 | `mod{id}-soc-low-alarm` | SOC 저알람 | Unsigned32 | 0=Normal, 1=Alarm |

### 비트 필드 해석 (Index 1, 2)

셀 과전압/저전압 알람은 비트 필드로 표현됩니다:
- 비트 0 (LSB): Cell 1 알람
- 비트 1: Cell 2 알람
- 비트 2: Cell 3 알람
- ...
- 비트 15: Cell 16 알람

**예시:**
- 값 `0x0001` (1): Cell 1 알람 발생
- 값 `0x0003` (3): Cell 1, 2 알람 발생
- 값 `0x8000` (32768): Cell 16 알람 발생

### 예시 OID
- `1.3.6.1.4.1.64016.1.4.1` - Module 1 셀 과전압 알람
- `1.3.6.1.4.1.64016.1.4.3` - Module 1 충전 과열 알람
- `1.3.6.1.4.1.64016.1.4.7` - Module 1 팩 과전압 알람
- `1.3.6.1.4.1.64016.1.4.11` - Module 1 SOC 저알람

### 객체 정보
- **SYNTAX**: Unsigned32 또는 Integer32 (항목에 따라 다름)
- **접근 권한**: read-only
- **설명**: 각종 알람 상태를 실시간으로 모니터링

---

<!-- ## ⚙️ 5. Parameters (파라미터 설정) - Category 5

알람 임계값 등의 설정값을 관리합니다. -->

### OID 형식
```
1.3.6.1.4.1.64016.{moduleId}.4.{index}
```

<!-- ### 객체 목록

| Index | OID 이름 | 설명 | 단위 | 범위 | 접근 권한 |
|-------|----------|------|------|------|-----------|
| 1 | `mod{id}-cell-overvoltage-alarm-value` | 셀 과전압 알람 임계값 | V | 3000-4200 (V/1000 표시) | read-write |
| 2 | `mod{id}-cell-overvoltage-alarm-recovery` | 셀 과전압 알람 복구 임계값 | V | - | read-write |
| 3 | `mod{id}-cell-undervoltage-alarm-value` | 셀 저전압 알람 임계값 | V | - | read-write |
| 4 | `mod{id}-cell-undervoltage-alarm-recovery` | 셀 저전압 알람 복구 임계값 | V | - | read-write |
| 5 | `mod{id}-temp-charge-overheat-alarm-value` | 충전 과열 알람 임계값 | Celsius | Integer32 | read-write |
| 6 | `mod{id}-soc-low-alarm-value` | SOC 저알람 임계값 | percent | 5-30% | read-write |

### 예시 OID
- `1.3.6.1.4.1.64016.1.5.1` - Module 1 셀 과전압 알람 임계값
- `1.3.6.1.4.1.64016.1.5.3` - Module 1 셀 저전압 알람 임계값
- `1.3.6.1.4.1.64016.1.5.5` - Module 1 충전 과열 알람 임계값
- `1.3.6.1.4.1.64016.1.5.6` - Module 1 SOC 저알람 임계값

### 객체 정보
- **SYNTAX**: Unsigned32
- **접근 권한**: read-write (대부분), read-only (일부)
- **설명**: 알람 임계값 및 복구 임계값 설정

--- -->

## 📐 전체 OID 구조 요약

### 모듈별 OID 베이스
- Module 1: `1.3.6.1.4.1.64016.1`
- Module 2: `1.3.6.1.4.1.64016.2`
- Module 3: `1.3.6.1.4.1.64016.3`
- Module 4: `1.3.6.1.4.1.64016.4`
- Module 5: `1.3.6.1.4.1.64016.5`
- Module 6: `1.3.6.1.4.1.64016.6`
- Module 7: `1.3.6.1.4.1.64016.7`
- Module 8: `1.3.6.1.4.1.64016.8`
- Module 9: `1.3.6.1.4.1.64016.9`
- Module 10: `1.3.6.1.4.1.64016.10`

### 카테고리별 OID 베이스
- Cell Voltage: `{moduleBase}.1`
- Temperature: `{moduleBase}.2`
- Pack Info: `{moduleBase}.3`
- Alarms: `{moduleBase}.4`
- Parameters: `{moduleBase}.5`

---

## 🔍 주요 OID 예시

### Module 1 주요 OID

#### 셀 전압
```
1.3.6.1.4.1.64016.1.1.1  - Cell 1 전압
1.3.6.1.4.1.64016.1.1.2  - Cell 2 전압
...
1.3.6.1.4.1.64016.1.1.16 - Cell 16 전압
```

#### 온도 센서
```
1.3.6.1.4.1.64016.1.2.1  - 온도 센서 1
1.3.6.1.4.1.64016.1.2.2  - 온도 센서 2
1.3.6.1.4.1.64016.1.2.3  - 온도 센서 3
1.3.6.1.4.1.64016.1.2.4  - 온도 센서 4
1.3.6.1.4.1.64016.1.2.5  - MOSFET 온도 1
1.3.6.1.4.1.64016.1.2.6  - 팩전압 
1.3.6.1.4.1.64016.1.2.7  - 주변 온도
```

#### 팩 정보
```
1.3.6.1.4.1.64016.1.3.1  - 최대 셀 전압
1.3.6.1.4.1.64016.1.3.2  - 최소 셀 전압
1.3.6.1.4.1.64016.1.3.3  - 평균 셀 전압
1.3.6.1.4.1.64016.1.3.4  - 최대 온도
1.3.6.1.4.1.64016.1.3.5  - 최소 온도
1.3.6.1.4.1.64016.1.3.6  - 총 전압
1.3.6.1.4.1.64016.1.3.7  - 팩 전압
1.3.6.1.4.1.64016.1.3.8  - 충전 전류
1.3.6.1.4.1.64016.1.3.9  - 방전 전류
1.3.6.1.4.1.64016.1.3.10 - SOC
1.3.6.1.4.1.64016.1.3.11 - SOH
1.3.6.1.4.1.64016.1.3.12 - 정격 용량
1.3.6.1.4.1.64016.1.3.13 - 잔여 용량
1.3.6.1.4.1.64016.1.3.14 - 운전 상태
```

#### 알람
```
1.3.6.1.4.1.64016.1.4.1  - 셀 과전압 알람 (비트 필드)
1.3.6.1.4.1.64016.1.4.2  - 셀 저전압 알람 (비트 필드)
1.3.6.1.4.1.64016.1.4.3  - 충전 과열 알람
1.3.6.1.4.1.64016.1.4.4  - 충전 저온 알람
1.3.6.1.4.1.64016.1.4.5  - 방전 과열 알람
1.3.6.1.4.1.64016.1.4.6  - 방전 저온 알람
1.3.6.1.4.1.64016.1.4.7  - 팩 과전압 알람
1.3.6.1.4.1.64016.1.4.8  - 팩 저전압 알람
1.3.6.1.4.1.64016.1.4.9  - 충전 과전류 알람
1.3.6.1.4.1.64016.1.4.10 - 방전 과전류 알람
1.3.6.1.4.1.64016.1.4.11 - SOC 저알람
```
<!-- 
#### 파라미터
```
1.3.6.1.4.1.64016.1.5.1  - 셀 과전압 알람 임계값 (read-write)
1.3.6.1.4.1.64016.1.5.2  - 셀 과전압 알람 복구 임계값 (read-write)
1.3.6.1.4.1.64016.1.5.3  - 셀 저전압 알람 임계값 (read-write)
1.3.6.1.4.1.64016.1.5.4  - 셀 저전압 알람 복구 임계값 (read-write)
1.3.6.1.4.1.64016.1.5.5  - 충전 과열 알람 임계값 (read-write)
1.3.6.1.4.1.64016.1.5.6  - SOC 저알람 임계값 (read-write)
```

--- -->

## 📝 데이터 타입 및 단위

### 데이터 타입
- **Unsigned32**: 부호 없는 32비트 정수 (0 ~ 4,294,967,295)
- **Integer32**: 부호 있는 32비트 정수 (-2,147,483,648 ~ 2,147,483,647)

### 단위
- **mV**: 밀리볼트 (1V = 1000mV)
- **V**: 볼트
- **A**: 암페어
- **AH**: 암페어시
- **percent**: 퍼센트 (0-100%)
- **Celsius**: 섭씨 온도

### 표시 형식
일부 값은 실제 값과 표시 값이 다릅니다:
- **V/100**: 실제 값에 100을 나눈 값이 표시됨 (예: 4986 → 49.86V)
- **A/100**: 실제 값에 100을 나눈 값이 표시됨 (예: 10000 → 100.00A)
- **AH/100**: 실제 값에 100을 나눈 값이 표시됨 (예: 10835 → 108.35AH)
- **V/1000**: 실제 값에 1000을 나눈 값이 표시됨

---

## 🔧 SNMP 명령어 예시

### snmpget 예시
```bash
# Module 1 Cell 1 전압 읽기
snmpget -v2c -c public localhost 1.3.6.1.4.1.64016.1.1.1

# Module 1 SOC 읽기
snmpget -v2c -c public localhost 1.3.6.1.4.1.64016.1.3.10

# Module 1 셀 과전압 알람 읽기
snmpget -v2c -c public localhost 1.3.6.1.4.1.64016.1.4.1
```

### snmpset 예시 (read-write 파라미터)
```bash
# Module 1 셀 과전압 알람 임계값 설정 (4200mV = 4.2V)
snmpset -v2c -c private localhost 1.3.6.1.4.1.64016.1.5.1 u 4200

# Module 1 SOC 저알람 임계값 설정 (10%)
snmpset -v2c -c private localhost 1.3.6.1.4.1.64016.1.5.6 u 10
```

### snmpwalk 예시
```bash
# Module 1의 모든 셀 전압 읽기
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.64016.1.1

# Module 1의 모든 온도 센서 읽기
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.64016.1.2

# Module 1의 모든 팩 정보 읽기
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.64016.1.3

# Module 1의 모든 알람 읽기
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.64016.1.4
```

---

## ⚠️ 주의사항

1. **접근 권한**: 대부분의 OID는 read-only입니다. Parameters 카테고리의 일부 OID만 read-write입니다.

2. **비트 필드 해석**: 셀 과전압/저전압 알람은 비트 필드로 표현되므로, 비트 연산을 사용하여 특정 셀의 알람 상태를 확인해야 합니다.

3. **값 범위**: 각 OID의 값 범위를 확인하고, 범위를 벗어나는 값은 무시하거나 오류로 처리해야 합니다.

4. **표시 형식**: 일부 값은 실제 값과 표시 값이 다르므로, 사용자에게 표시할 때 적절한 변환이 필요합니다.

5. **모듈 번호**: 모듈 번호는 1부터 시작하며, 최대 10개 모듈을 지원합니다.

---

## 📚 참고 자료

- **MIB 파일**: `src/mib/IFTECH_NARADA_48VPack_VER_01.MIB`
- **구현 코드**: `src/mib/battery.mib.js`
- **연락처**: mvcjhkim@gmail.com
- **최종 업데이트**: 2024-12-14

---

## 📞 지원

기술 지원이나 문의사항이 있으시면 mvcjhkim@gmail.com으로 연락주세요.


# 배터리 시스템 프로토콜 사용법

이 프로그램은 두 가지 프로토콜을 지원합니다:
1. **Modbus 프로토콜** (기본값)
2. **Narada 프로토콜** (새로운 장비용)

## 프로토콜 선택

### 환경변수 설정

```bash
# Modbus 프로토콜 사용 (기본값)
export PROTOCOL_TYPE=modbus

# Narada 프로토콜 사용
export PROTOCOL_TYPE=narada
export SERIAL_PORT=/dev/ttyDevice485  # 시리얼 포트 경로
```

### 실행 방법

```bash
# Modbus 프로토콜로 실행
npm start

# Narada 프로토콜로 실행
PROTOCOL_TYPE=narada SERIAL_PORT=/dev/ttyDevice485 npm start
```

## 프로토콜별 특징

### Modbus 프로토콜
- **통신 방식**: RS485/RS232 시리얼 통신
- **프로토콜**: Modbus RTU
- **데이터 형식**: 16비트 레지스터 (51개)
- **모듈 ID**: 39-46 (8개 모듈)
- **클라이언트**: `ModbusDeviceClient`

### Narada 프로토콜
- **통신 방식**: RS485/RS232 시리얼 통신
- **프로토콜**: Narada V1.31
- **데이터 형식**: 바이너리 패킷 (92바이트)
- **모듈 ID**: 0-7 (8개 모듈)
- **클라이언트**: `NaradaProtocolClient`

## Narada 프로토콜 상세

### 요청 패킷 형식
```
7E [packNumber] 01 00 [checksum] 0D
```

### 응답 패킷 형식
```
7E [packNumber] [length] [data...] [CRC] 0D
```

### 데이터 구조
- **전압**: 15개 셀 전압 (0.1mV 단위)
- **전류**: 0.1A 단위
- **SOC**: 0.01% 단위
- **온도**: 6개 온도 센서 (0.1°C 단위, 400 오프셋)
- **상태**: 알람, 보호, 오류 상태

## 코드 구조

### 주요 클래스

1. **BatteryModbusReader**: 메인 데이터 읽기 클래스
   - 프로토콜 타입에 따라 다른 클라이언트 사용
   - 동일한 데이터 구조 반환

2. **NaradaProtocolClient**: Narada 프로토콜 클라이언트
   - 시리얼 통신 관리
   - 패킷 송수신
   - 데이터 파싱

3. **NaradaDataParser**: 데이터 변환기
   - Narada 형식을 Modbus 형식으로 변환
   - 기존 코드와 호환성 유지

### 사용 예시

```javascript
// Modbus 프로토콜 사용
const modbusClient = new ModbusDeviceClient();
const reader = new BatteryModbusReader(modbusClient, 8, 'modbus');

// Narada 프로토콜 사용
const naradaClient = new NaradaProtocolClient('/dev/ttyDevice485', 9600);
const reader = new BatteryModbusReader(naradaClient, 8, 'narada');
```

## 설정 파일

### .env 파일 예시
```env
# 프로토콜 설정
PROTOCOL_TYPE=narada
SERIAL_PORT=/dev/ttyDevice485

# SNMP 설정
SNMP_AGENT_PORT=1161
SNMP_AGENT_ADDR=0.0.0.0
SNMP_READ_COMMUNITY=public
SNMP_WRITE_COMMUNITY=private

# 시뮬레이션 모드
SIMULATION_MODE=false
```

## 문제 해결

### 시리얼 포트 권한 오류
```bash
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyDevice485
```

### 포트 사용 중 오류
```bash
# 포트 사용 중인 프로세스 확인
sudo lsof /dev/ttyDevice485

# 프로세스 종료
sudo kill -9 [PID]
```

### 데이터 읽기 실패
1. 시리얼 포트 경로 확인
2. 통신 속도 확인 (9600 bps)
3. 케이블 연결 상태 확인
4. 장비 전원 상태 확인

/**
 * Narada 프로토콜 데이터를 Modbus 형식으로 변환하는 파서
 * 기존 parsePackInfoData와 동일한 구조로 변환
 */

class NaradaDataParser {
    /**
     * Narada 데이터를 Modbus 형식으로 변환
     * @param {Object} naradaData - Narada 프로토콜로 읽은 데이터
     * @returns {Object} Modbus 형식의 데이터
     */
    static parsePackInfoData(naradaData) {
        if (!naradaData) {
            return this.createDefaultData();
        }

        // 셀 전압 변환 (mV 단위로 변환)
        const cellVoltages = naradaData.cellVoltages.map(voltage => {
            // 0x0C C9 = 3273 -> 3273 * 0.1 = 327.3mV
            return Math.round(voltage * 0.1);
        });

        // 온도 변환 (0.1°C 단위, 400 오프셋 제거)
        const temperatures = naradaData.temperatures.map(temp => {
            // 0x00 50 = 80 -> 80 - 400 = -320 (32.0°C)
            return temp - 400;
        });

        // 전류 변환 (0.1A 단위, 10000 오프셋 추가)
        const currentValue = naradaData.current ;

        // SOC 변환 (0x13 88 = 5000 -> 50%)
        const soc = Math.round(naradaData.soc / 100);

        // 총 전압 변환 (0.01V 단위)
        const totalVoltage = Math.round(naradaData.totalVoltage * 0.01);

        // 팩 상태에서 알람 정보 추출
        const packStatus = naradaData.packStatus || [];
        const warningFlag = packStatus[0] || 0;
        const protectionFlag = packStatus[1] || 0;
        const faultStatus = packStatus[2] || 0;

        return {
            packVoltage: totalVoltage, // 0.01V 단위
            CurrentValue: currentValue, // 0.1A 단위 (10000 오프셋)
            remainingCapacity: naradaData.capacity, // 용량
            AverageCellTemp: temperatures[0] || 0, // 평균 셀 온도 (0.1°C 단위)
            AmbientTemp: temperatures[5] || 0, // 주변 온도 (0.1°C 단위)
            WarningFlag: warningFlag,
            ProtectionFlag: protectionFlag,
            FaultStatus: faultStatus,
            SOC: soc,
            CirculateNumber: naradaData.readCycleCount,
            SOH: Math.round(naradaData.soh / 100), // SOH (%)
            PCBTemp: temperatures[4] || 0, // PCB 온도 (0.1°C 단위)
            HistoryDischargeCapacity: 0, // 방전 용량 (Narada에서 제공하지 않음)
            InstalledCellNumber: 15, // 설치된 셀 수 (Narada는 15개 셀)
            cellVoltages: cellVoltages, // 셀 전압 15개 (0.1mV 단위)
            TemperatureSensorNumber: 6, // 온도 센서 수
            cellTemperatures: temperatures, // 온도 센서 6개 (0.1°C 단위)
            FullCapacity: naradaData.capacity, // 최대 용량
            RemainChargeTime: 0, // 잔여 충전 시간 (Narada에서 제공하지 않음)
            RemainDischargeTime: 0, // 잔여 방전 시간 (Narada에서 제공하지 않음)
            CellUVState: naradaData.bmsProtectStatus, // BMS 보호 상태
            result: {
                data: this.convertToModbusFormat(naradaData),
                buffer: Buffer.from(this.convertToModbusFormat(naradaData))
            }
        };
    }

    /**
     * Narada 데이터를 Modbus 형식의 배열로 변환
     * @param {Object} naradaData - Narada 데이터
     * @returns {Array} Modbus 형식의 51개 레지스터 배열
     */
    static convertToModbusFormat(naradaData) {
        // 유효하지 않은 데이터면 51레지스터 기본값 반환
        if (!naradaData || naradaData.isValid === false) {
            return new Array(51).fill(0).map((v, idx) => {
                if (idx === 3 || idx === 4 || (idx >= 31 && idx <= 36)) return 400; // 온도 기본 40.0°C(=400)
                if (idx === 13) return 15; // 설치 셀 수
                if (idx === 30) return 6; // 온도 센서 수
                return 0;
            });
        }
        const data = new Array(51).fill(0);

        if (!naradaData) return data;

        // 팩 전압 - 그대로 사용 (받는 프로그램에서 0.01 곱함)
        data[0] = naradaData.totalVoltage;
        
        // 전류 (0.1A 단위, 10000 오프셋)
        data[1] = naradaData.current; // 이미 오프셋이 적용된 값
        
        // 잔여 용량
        data[2] = naradaData.capacity;
        
        // 평균 셀 온도 (0.1°C 단위, 50 오프셋)
        data[3] = (naradaData.temperatures[0] || 0)*10+ 400;
        
        // 주변 온도 (0.1°C 단위, 50 오프셋)
        data[4] = (naradaData.temperatures[5] || 0)*10 + 400;
        
        // 알람 상태
        const packStatus = naradaData.packStatus || [];
        data[5] = packStatus[0] || 0; // 경고 플래그
        data[6] = packStatus[1] || 0; // 보호 플래그
        data[7] = packStatus[2] || 0; // 오류 상태
        
        // SOC - 그대로 사용
        data[8] = naradaData.soc;
        
        // 순환 번호
        data[9] = naradaData.readCycleCount;
        
        // SOH - 그대로 사용
        data[10] = naradaData.soh;
        
        // PCB 온도 (0.1°C 단위, 50 오프셋)
        data[11] = (naradaData.temperatures[4] || 0)*10 + 400;
        
        // 방전 용량 (Narada에서 제공하지 않음)
        data[12] = 0;
        
        // 설치된 셀 수
        data[13] = 15;
        
        // 셀 전압 15개 (0.1mV 단위) - 이미 mV 단위이므로 0.1 곱하기
        for (let i = 0; i < 15; i++) {
            data[14 + i] = naradaData.cellVoltages[i] || 0;
        }
        
        // 온도 센서 수
        data[30] = 6;
        
        // 셀 온도 6개 (0.1°C 단위, 50 오프셋)
        for (let i = 0; i < 6; i++) {
            data[31 + i] = (naradaData.temperatures[i] || 0)*10 + 400;
        }
        
        // 최대 용량
        data[47] = naradaData.capacity;
        
        // 잔여 충전/방전 시간 (Narada에서 제공하지 않음)
        data[48] = 0;
        data[49] = 0;
        
        // 셀 UV 상태
        data[50] = naradaData.bmsProtectStatus;

        return data;
    }

    /**
     * 기본 데이터 생성
     * @returns {Object} 기본 데이터
     */
    static createDefaultData() {
        return {
            packVoltage: 0,
            CurrentValue: 10000, // 0A (10000 오프셋)
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
            InstalledCellNumber: 15,
            cellVoltages: new Array(15).fill(0),
            TemperatureSensorNumber: 6,
            cellTemperatures: new Array(6).fill(0),
            FullCapacity: 0,
            RemainChargeTime: 0,
            RemainDischargeTime: 0,
            CellUVState: 0,
            result: {
                data: new Array(51).fill(0),
                buffer: Buffer.alloc(102)
            }
        };
    }
}

export default NaradaDataParser;

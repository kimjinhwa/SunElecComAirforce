/**
 * IFTECH 48V 배터리 팩 데이터 모델 (8개 모듈 지원)
 * MIB 파일 기반으로 생성된 데이터 구조체들
 */

/**
 * 셀 전압 데이터 클래스
 * 16개 셀의 전압 정보를 관리
 */
class CellVoltageData {
    constructor() {
        this.cells = new Array(16).fill(0); // 16개 셀 전압 (mV)
        this.maxVoltage = 0; // 최대 셀 전압 (mV)
        this.minVoltage = 0; // 최소 셀 전압 (mV)
        this.avgVoltage = 0; // 평균 셀 전압 (mV)
    }

    /**
     * 특정 셀의 전압 설정
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @param {number} voltage - 전압값 (mV)
     */
    setCellVoltage(cellIndex, voltage) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            this.cells[cellIndex - 1] = voltage;
            this.updateStatistics();
        }
    }

    /**
     * 특정 셀의 전압 가져오기
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @returns {number} 전압값 (mV)
     */
    getCellVoltage(cellIndex) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            return this.cells[cellIndex - 1];
        }
        return 0;
    }

    /**
     * 모든 셀 전압 설정
     * @param {Array<number>} voltages - 16개 셀 전압 배열 (mV)
     */
    setAllCellVoltages(voltages) {
        if (voltages && voltages.length === 16) {
            this.cells = [...voltages];
            this.updateStatistics();
        }
    }

    /**
     * 통계 정보 업데이트
     */
    updateStatistics() {
        const validVoltages = this.cells.filter(v => v > 0);
        if (validVoltages.length > 0) {
            this.maxVoltage = Math.max(...validVoltages);
            this.minVoltage = Math.min(...validVoltages);
            this.avgVoltage = validVoltages.reduce((sum, v) => sum + v, 0) / validVoltages.length;
        }
    }

    /**
     * 데이터를 JSON 형태로 반환
     */
    toJSON() {
        return {
            cells: this.cells,
            maxVoltage: this.maxVoltage,
            minVoltage: this.minVoltage,
            avgVoltage: this.avgVoltage
        };
    }
}

/**
 * 팩 정보 데이터 클래스
 * 배터리 팩의 전체적인 상태 정보를 관리
 */
class PackInfoData {
    constructor() {
        // 온도 정보
        this.avgTemp = 0; // 평균 온도 (Celsius)
        this.ambTemp = 0; // 주변 온도 (Celsius)
        
        // 전압 정보
        this.totalVoltage = 0; // 총 전압 (V)
        this.packVoltage = 0; // 팩 전압 (V)
        
        // 전류 정보
        this.chargeCurrent = 0; // 충전 전류 (A)
        this.dischargeCurrent = 0; // 방전 전류 (A)
        
        // 용량 정보
        this.soc = 0; // 충전 상태 (0-100%)
        this.soh = 0; // 건강 상태 (0-100%)
        this.ratedCapacity = 0; // 정격 용량 (AH)
        this.remainingCapacity = 0; // 잔여 용량 (AH)
        
        // 상태 정보
        this.runningState = 3; // 1=충전, 2=방전, 3=정지
    }

    /**
     * 데이터를 JSON 형태로 반환
     */
    toJSON() {
        return {
            avgTemp: this.avgTemp,
            ambTemp: this.ambTemp,
            totalVoltage: this.totalVoltage,
            packVoltage: this.packVoltage,
            chargeCurrent: this.chargeCurrent,
            dischargeCurrent: this.dischargeCurrent,
            soc: this.soc,
            soh: this.soh,
            ratedCapacity: this.ratedCapacity,
            remainingCapacity: this.remainingCapacity,
            runningState: this.runningState
        };
    }
}

/**
 * 알람 상태 데이터 클래스
 * 각종 알람 상태를 비트 필드로 관리
 */
class AlarmData {
    constructor() {
        // 셀 관련 알람 (비트 필드)
        this.cellOvervoltageAlarms = 0; // 셀 과전압 알람 (16비트)
        this.cellUndervoltageAlarms = 0; // 셀 저전압 알람 (16비트)
        
        // 팩 관련 알람
        this.packOvervoltageAlarm = 0; // 팩 과전압 알람 (0=정상, 1=알람)
        this.packUndervoltageAlarm = 0; // 팩 저전압 알람 (0=정상, 1=알람)
        
        // 전류 관련 알람
        this.chargeOvercurrentAlarm = 0; // 충전 과전류 알람 (0=정상, 1=알람)
        this.dischargeOvercurrentAlarm = 0; // 방전 과전류 알람 (0=정상, 1=알람)
        
        // SOC 관련 알람
        this.socLowAlarm = 0; // SOC 저알람 (0=정상, 1=알람)
    }

    /**
     * 특정 셀의 과전압 알람 설정
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @param {boolean} alarm - 알람 상태
     */
    setCellOvervoltageAlarm(cellIndex, alarm) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            const bitMask = 1 << (cellIndex - 1);
            if (alarm) {
                this.cellOvervoltageAlarms |= bitMask;
            } else {
                this.cellOvervoltageAlarms &= ~bitMask;
            }
        }
    }

    /**
     * 특정 셀의 저전압 알람 설정
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @param {boolean} alarm - 알람 상태
     */
    setCellUndervoltageAlarm(cellIndex, alarm) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            const bitMask = 1 << (cellIndex - 1);
            if (alarm) {
                this.cellUndervoltageAlarms |= bitMask;
            } else {
                this.cellUndervoltageAlarms &= ~bitMask;
            }
        }
    }

    /**
     * 특정 셀의 과전압 알람 상태 확인
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @returns {boolean} 알람 상태
     */
    getCellOvervoltageAlarm(cellIndex) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            const bitMask = 1 << (cellIndex - 1);
            return (this.cellOvervoltageAlarms & bitMask) !== 0;
        }
        return false;
    }

    /**
     * 특정 셀의 저전압 알람 상태 확인
     * @param {number} cellIndex - 셀 인덱스 (1-16)
     * @returns {boolean} 알람 상태
     */
    getCellUndervoltageAlarm(cellIndex) {
        if (cellIndex >= 1 && cellIndex <= 16) {
            const bitMask = 1 << (cellIndex - 1);
            return (this.cellUndervoltageAlarms & bitMask) !== 0;
        }
        return false;
    }

    /**
     * 전체 알람 상태 확인
     * @returns {boolean} 알람이 하나라도 있으면 true
     */
    hasAnyAlarm() {
        return this.cellOvervoltageAlarms !== 0 ||
               this.cellUndervoltageAlarms !== 0 ||
               this.packOvervoltageAlarm !== 0 ||
               this.packUndervoltageAlarm !== 0 ||
               this.chargeOvercurrentAlarm !== 0 ||
               this.dischargeOvercurrentAlarm !== 0 ||
               this.socLowAlarm !== 0;
    }

    /**
     * 데이터를 JSON 형태로 반환
     */
    toJSON() {
        return {
            cellOvervoltageAlarms: this.cellOvervoltageAlarms,
            cellUndervoltageAlarms: this.cellUndervoltageAlarms,
            packOvervoltageAlarm: this.packOvervoltageAlarm,
            packUndervoltageAlarm: this.packUndervoltageAlarm,
            chargeOvercurrentAlarm: this.chargeOvercurrentAlarm,
            dischargeOvercurrentAlarm: this.dischargeOvercurrentAlarm,
            socLowAlarm: this.socLowAlarm,
            hasAnyAlarm: this.hasAnyAlarm()
        };
    }
}

/**
 * 파라미터 설정 데이터 클래스
 * 알람 임계값 등의 설정값을 관리
 */
class ParameterData {
    constructor() {
        // 셀 과전압 알람 임계값
        this.cellOvervoltageAlarmValue = 4200; // mV (기본값: 4.2V)
        this.cellOvervoltageAlarmRecovery = 4100; // mV (기본값: 4.1V)
        
        // 셀 저전압 알람 임계값
        this.cellUndervoltageAlarmValue = 3000; // mV (기본값: 3.0V)
        this.cellUndervoltageAlarmRecovery = 3100; // mV (기본값: 3.1V)
        
        // SOC 저알람 임계값
        this.socLowAlarmValue = 20; // % (기본값: 20%)
    }

    /**
     * 데이터를 JSON 형태로 반환
     */
    toJSON() {
        return {
            cellOvervoltageAlarmValue: this.cellOvervoltageAlarmValue,
            cellOvervoltageAlarmRecovery: this.cellOvervoltageAlarmRecovery,
            cellUndervoltageAlarmValue: this.cellUndervoltageAlarmValue,
            cellUndervoltageAlarmRecovery: this.cellUndervoltageAlarmRecovery,
            socLowAlarmValue: this.socLowAlarmValue
        };
    }
}

/**
 * 배터리 모듈 데이터 클래스
 * 하나의 배터리 모듈의 모든 정보를 관리
 */
class BatteryModuleData {
    constructor(moduleId) {
        this.moduleId = moduleId;
        this.cellVoltage = new CellVoltageData();
        this.packInfo = new PackInfoData();
        this.alarms = new AlarmData();
        this.parameters = new ParameterData();
        this.lastUpdateTime = new Date();
    }

    /**
     * 모듈 데이터 업데이트 시간 갱신
     */
    updateTimestamp() {
        this.lastUpdateTime = new Date();
    }

    /**
     * 전체 데이터를 JSON 형태로 반환
     */
    toJSON() {
        return {
            moduleId: this.moduleId,
            cellVoltage: this.cellVoltage.toJSON(),
            packInfo: this.packInfo.toJSON(),
            alarms: this.alarms.toJSON(),
            parameters: this.parameters.toJSON(),
            lastUpdateTime: this.lastUpdateTime.toISOString()
        };
    }
}

/**
 * 배터리 시스템 데이터 클래스
 * 전체 배터리 시스템(여러 모듈)을 관리
 */
class BatterySystemData {
    constructor() {
        this.modules = new Map(); // 모듈 ID를 키로 하는 Map
        this.systemInfo = {
            totalModules: 0,
            activeModules: 0,
            systemStatus: 'unknown', // 'normal', 'warning', 'alarm', 'unknown'
            lastSystemUpdate: new Date()
        };
    }

    /**
     * 모듈 추가
     * @param {number} moduleId - 모듈 ID
     * @returns {BatteryModuleData} 생성된 모듈 데이터
     */
    addModule(moduleId) {
        const module = new BatteryModuleData(moduleId);
        this.modules.set(moduleId, module);
        this.systemInfo.totalModules = this.modules.size;
        this.updateSystemStatus();
        return module;
    }

    /**
     * 모듈 가져오기
     * @param {number} moduleId - 모듈 ID
     * @returns {BatteryModuleData|null} 모듈 데이터 또는 null
     */
    getModule(moduleId) {
        return this.modules.get(moduleId) || null;
    }

    /**
     * 모든 모듈 가져오기
     * @returns {Array<BatteryModuleData>} 모듈 배열
     */
    getAllModules() {
        return Array.from(this.modules.values());
    }

    /**
     * 시스템 상태 업데이트
     */
    updateSystemStatus() {
        let activeModules = 0;
        let hasAlarm = false;
        let hasWarning = false;

        for (const module of this.modules.values()) {
            if (module.packInfo.runningState !== 3) { // 정지 상태가 아니면 활성
                activeModules++;
            }
            
            if (module.alarms.hasAnyAlarm()) {
                hasAlarm = true;
            }
            
            // SOC가 낮거나 온도가 비정상이면 경고
            if (module.packInfo.soc < 30 || 
                module.packInfo.avgTemp < -10 || 
                module.packInfo.avgTemp > 60) {
                hasWarning = true;
            }
        }

        this.systemInfo.activeModules = activeModules;
        
        if (hasAlarm) {
            this.systemInfo.systemStatus = 'alarm';
        } else if (hasWarning) {
            this.systemInfo.systemStatus = 'warning';
        } else if (activeModules > 0) {
            this.systemInfo.systemStatus = 'normal';
        } else {
            this.systemInfo.systemStatus = 'unknown';
        }

        this.systemInfo.lastSystemUpdate = new Date();
    }

    /**
     * 전체 시스템 데이터를 JSON 형태로 반환
     */
    toJSON() {
        const modulesData = {};
        for (const [moduleId, module] of this.modules) {
            modulesData[moduleId] = module.toJSON();
        }

        return {
            systemInfo: this.systemInfo,
            modules: modulesData
        };
    }
}

module.exports = {
    CellVoltageData,
    PackInfoData,
    AlarmData,
    ParameterData,
    BatteryModuleData,
    BatterySystemData
};

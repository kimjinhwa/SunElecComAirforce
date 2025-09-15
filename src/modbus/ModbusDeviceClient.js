import ModbusRTU from 'modbus-serial';
import SerialManager from './serialManager.js';

const serialManager = new SerialManager();


function Int16ToSignedInt(value) {
    const int16 = value & 0xFFFF;  // 16비트만 사용
    return int16 > 0x7FFF ? int16 - 0x10000 : int16; //음수 처리
}

function toInt32(value) {
    return value & 0xFFFFFFFF;
}

function toFloat32(value) {
    return value & 0xFFFFFFFF;
}
class ModbusDeviceClient 
{
    constructor() {
        this.modbusRTU = new ModbusRTU();
        this.isLocked = false;
        this.lockTimeout = 5000;
        this.isConnected = false;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0,
            lastRequestTime: null,
            lastSuccessTime: null,
            lastFailureTime: null
        };
        this.startMonitoring();
    }
    async connect() {
        try {
            // 1. Device485 포트 찾기
            const port = await serialManager.findDevicePort();
            console.log('Device485 포트 찾음:', port);
            
            // 2. ModbusRTU 클라이언트에 직접 포트 연결
            this.modbusRTU.connectRTUBuffered(port, {
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            this.modbusRTU.setID(39);
            // 4. 연결 완료 후 상태 설정
            this.isConnected = true;
            console.log('Modbus Device485 연결 완료');
            
        } catch (error) {
            this.isConnected = false;
            console.error('Device485 연결 실패:', error.message);
            throw new Error(`Device485포트를 정상적으로 연결하지 못했습니다: ${error.message}`);
        }
    }
    async readHoldingRegister(moduleId, address, length) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.readHoldingRegisters(address, length);
    }
    async writeRegister(moduleId, address, value) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.writeRegister(address, value);
    }
    async readCoil(moduleId, address, length) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.readCoils(address, length);
    }
    async writeCoil(moduleId, address, value) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.writeCoil(address, value);
    }
    async readDiscreteInput(moduleId, address, length) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.readDiscreteInputs(address, length);
    }
    async writeDiscreteInput(moduleId, address, value) {
        return this.modbusRTU.writeDiscreteInput(address, value);
    }

    // 입력 레지스터 읽기
    // modbusAddress = x038 + 1 ~ 8 모듈 ID
    // 번지별  data 값 정의 
    // 0x0fff : Pack Voltage, V, 2 byte, scale 0.01, Offset 0
    // 0x1000 : Current Value A, 2 byte, scale 0.1, Offset -10000
    // 0x1001 : remaining capacity, 2 byte, scale 0.1, Offset 0
    // 0x1002 : Average Cell Temp C,2 byte, scale 0.1, Offset -400
    // 0x1003 : Ambient Temp C,2 byte, scale 0.1, Offset -400
    // 0x1004 : Warnning Flag
    // 0x1005 : Protechtion Flag
    // 0x1006 : Fault Status
    // 0x1007 : SOC
    // 0x1008 : Circulate number
    // 0x1009 : SOH
    // 0x100A : PCB Temp C,2 byte, scale 0.1, Offset -400
    // 0x100B : History Discharge Capacity, 2 byte, scale 0, Offset 0
    // 0x100C : Installed Cell number
    // 0x100D~0x101C: Cell Voltage0 ~ Cell Voltage15, 2 byte, scale 0.001, Offset 0
    // 0x101D : Temperature Sensor Number
    // 0x101E~0x102D: TempCell0 ~ TempCell15, 2 byte, scale 0.1, Offset -400

    //0x102F : Remain Charge time, 2 byte, scale 0, Offset 0
    //0x1030 : Remain discharge time, 2 byte, scale 0, Offset 0
    //0x1031 : Cell UV state
/* Warning Flag
Byte0	
    Bit0	1:Cell OV Alarm  0:None	Suggest Not Display
	Bit1	1:Cell UV Alarm  0:None	Suggest Not Display
	Bit2	1:Pack OV Alarm  0:None	Suggest Not Display
	Bit3	1:Pack UV Alarm  0:None	Suggest Not Display
	Bit4	1:Chg OC Alarm  0:None	Suggest Not Display
	Bit5	1:Disg OC Alarm  0:None	Suggest Not Display
	Bit6	1:Cell OT Alarm  0:None	Suggest Not Display
	Bit7	1:Cell UT Alarm  0:None	Suggest Not Display
Byte1	
    Bit0	1:Env OT Alarm  0:None	Suggest Not Display
	Bit1	1:Env UT Alarm  0:None	Suggest Not Display
	Bit2	1:PCB OT Alarm  0:None	Suggest Not Display
	Bit3	1:SOC Low Alarm 0:None	Suggest Not Display
	Bit4	1:Diff Volt Alarm  0:None	Suggest Not Display
	Bit5	Reserved	
	Bit6	Reserved	
	Bit7	Reserved	
*/
/* Protection Flag
Byte0	
    Bit0	1:Cell OV Protect  0:None	Suggest Not Display
	Bit1	1:Cell UV Protect  0:None	Suggest Not Display
	Bit2	1:Pack OV Protect  0:None	Suggest Not Display
	Bit3	1:Pack UV Protect  0:None	Suggest Not Display
	Bit4	1:SC Protect  0:None	
	Bit5	Reserved 	
	Bit6	1:Chg OT Protect  0:None	
	Bit7	1:Chg UT Protect  0:None	
Byte1	
    Bit0	1:Disg OT Protect  0:None
	Bit1	1:Disg UT Protect  0:None
	Bit2	1:COC Protect   0:None
	Bit3	1:DOC Protect   0:None
	Bit4	防盗锁 
	Bit5	Reserved
	Bit6	Reserved
	Bit7	Reserved
*/
/* Fault Status
Byte0	
    Bit0	1:Front-end Sample Error 0:None
    Bit1	1:Temp Sense Disconnect 0:None
    Bit2	1: Inversed Graft Error 0:None
    Bit3	Reserved
    Bit4	Reserved
    Bit5	Reserved
    Bit6	Reserved
    Bit7	Reserved
Byte1	
    Bit0	1:Charging  0:None
    Bit1	1:Discharging  0:None
    Bit2	1:Chg MOS Connect 0:Chg MOS Disconnect
    Bit3	1:Disg MOS Connect 0:Disg MOS Disconnect
    Bit4	1:Limit Current Enable 0:Limit Current Disable
    Bit5	1:Fully Charged   0:None
    Bit6	 1: Module failure but in operation 0:None
    Bit7	1: Module out of operation 0:None
*/
/* Cell UV state
Byte0	
    Bit0	1: Cell 0 UV  0:None
    Bit1	1: Cell 1 UV  0:None
    Bit2	1: Cell 2 UV  0:None
    Bit3	1: Cell 3 UV  0:None
    Bit4	1: Cell 4 UV  0:None
    Bit5	1: Cell 5 UV  0:None
    Bit6	1: Cell 6 UV  0:None
    Bit7	1: Cell 7 UV  0:None
Byte1
    Bit0	1: Cell 8 UV  0:None
    Bit1	1: Cell 9 UV  0:None
    Bit2	1: Cell 10 UV  0:None
    Bit3	1: Cell 11 UV  0:None
    Bit4	1: Cell 12 UV  0:None
    Bit5	1: Cell 13 UV  0:None
    Bit6	1: Cell 14 UV  0:None
    Bit7	1: Cell 15 UV  0:None
*/
    async readInputRegister(moduleId, address, length) {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(2, 11);
        
        console.log(`[DEBUG-${requestId}] 모듈 ${moduleId} 입력 레지스터 읽기 시작 - 주소: 0x${address.toString(16)}, 길이: ${length}`);
        
        await this.acquireLock(moduleId);
        try {
            this.modbusRTU.setID(moduleId);
            this.modbusRTU.setTimeout(2000); // 타임아웃을 2초로 증가
            
            console.log(`[DEBUG-${requestId}] Modbus ID 설정 완료: ${moduleId}, 타임아웃: 2000ms`);
            
            const data = await this.modbusRTU.readInputRegisters(address, length);
            const duration = Date.now() - startTime;
            
            console.log(`[DEBUG-${requestId}] 모듈 ${moduleId} 읽기 성공 - 소요시간: ${duration}ms, 데이터 길이: ${data.data ? data.data.length : 0}`);
            
            // 데이터 유효성 검사
            if (!data || !data.data || data.data.length !== length) {
                console.warn(`[DEBUG-${requestId}] 모듈 ${moduleId} 데이터 길이 불일치 - 예상: ${length}, 실제: ${data.data ? data.data.length : 0}`);
            }
            
            // 통계 업데이트
            this.updateStats(true, duration);
            
            return data;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[DEBUG-${requestId}] 모듈 ${moduleId} 읽기 실패 - 소요시간: ${duration}ms, 에러: ${error.message}`);
            
            // 통계 업데이트
            this.updateStats(false, duration);
            
            // 연결 상태 확인
            if (!this.isConnected) {
                console.error(`[DEBUG-${requestId}] Modbus 연결이 끊어짐 - 재연결 시도 필요`);
            }
            
            throw error;
        } finally {
            this.releaseLock();
            const totalDuration = Date.now() - startTime;
            console.log(`[DEBUG-${requestId}] 모듈 ${moduleId} 락 해제 완료 - 총 소요시간: ${totalDuration}ms`);
        }
    }
    async writeInputRegister(moduleId, address, value) {
        await this.acquireLock(moduleId);
        return this.modbusRTU.writeInputRegister(address, value);
    }
    setID(moduleId) {
        this.modbusRTU.setID(moduleId);
    }

    /**
     * Modbus 통신 락 획득
     * @param {number} moduleId - 모듈 ID
     */
    async acquireLock(moduleId) {
        const lockId = Math.random().toString(36).substring(2, 11);
        const startTime = Date.now();
        
        console.log(`[LOCK-${lockId}] 모듈 ${moduleId} 락 획득 시도 시작`);
        
        // 락이 이미 설정되어 있으면 잠시 대기
        let attempts = 0;
        const maxAttempts = 10;
        
        while (this.isLocked && attempts < maxAttempts) {
            console.log(`[LOCK-${lockId}] 모듈 ${moduleId} 락 대기 중... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (this.isLocked) {
            const waitTime = Date.now() - startTime;
            console.error(`[LOCK-${lockId}] 모듈 ${moduleId} 락 획득 시간 초과 - 대기시간: ${waitTime}ms`);
            throw new Error(`Modbus 통신 락 획득 시간 초과. 모듈 ID: ${moduleId}, 대기시간: ${waitTime}ms`);
        }
        
        this.isLocked = true;
        const acquireTime = Date.now() - startTime;
        console.log(`[LOCK-${lockId}] 모듈 ${moduleId} 락 획득 성공 - 소요시간: ${acquireTime}ms`);
        
        // 타임아웃 설정 (자동 해제)
        setTimeout(() => {
            if (this.isLocked) {
                console.warn(`[LOCK-${lockId}] 모듈 ${moduleId} 락 자동 해제 (타임아웃: ${this.lockTimeout}ms)`);
                this.isLocked = false;
            }
        }, this.lockTimeout);
    }

    /**
     * Modbus 통신 락 해제
     */
    releaseLock() {
        if (this.isLocked) {
            console.log(`[LOCK] 락 해제 완료`);
            this.isLocked = false;
        } else {
            console.warn(`[LOCK] 락이 이미 해제되어 있음`);
        }
    }

    /**
     * 통신 통계 업데이트
     */
    updateStats(success, responseTime) {
        this.stats.totalRequests++;
        this.stats.lastRequestTime = new Date();
        
        if (success) {
            this.stats.successfulRequests++;
            this.stats.lastSuccessTime = new Date();
        } else {
            this.stats.failedRequests++;
            this.stats.lastFailureTime = new Date();
        }
        
        this.stats.totalResponseTime += responseTime;
    }

    /**
     * 통신 통계 조회
     */
    getStats() {
        const avgResponseTime = this.stats.totalRequests > 0 
            ? this.stats.totalResponseTime / this.stats.totalRequests 
            : 0;
        
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            averageResponseTime: Math.round(avgResponseTime),
            successRate: `${successRate}%`
        };
    }

    /**
     * 모니터링 시작
     */
    startMonitoring() {
        // 1분마다 통계 출력
        setInterval(() => {
            const stats = this.getStats();
            const memUsage = process.memoryUsage();
            
            console.log(`[MONITOR] Modbus 통신 통계:`);
            console.log(`  총 요청: ${stats.totalRequests}, 성공: ${stats.successfulRequests}, 실패: ${stats.failedRequests}`);
            console.log(`  성공률: ${stats.successRate}, 평균 응답시간: ${stats.averageResponseTime}ms`);
            console.log(`  마지막 성공: ${stats.lastSuccessTime ? stats.lastSuccessTime.toISOString() : '없음'}`);
            console.log(`  마지막 실패: ${stats.lastFailureTime ? stats.lastFailureTime.toISOString() : '없음'}`);
            console.log(`  메모리 사용량: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
            console.log(`  연결 상태: ${this.isConnected ? '연결됨' : '연결 끊김'}, 락 상태: ${this.isLocked ? '락됨' : '해제됨'}`);
            
            // 연속 실패 감지
            if (stats.failedRequests > 0 && stats.lastFailureTime && stats.lastSuccessTime) {
                const timeSinceLastSuccess = Date.now() - stats.lastSuccessTime.getTime();
                const timeSinceLastFailure = Date.now() - stats.lastFailureTime.getTime();
                
                if (timeSinceLastSuccess > timeSinceLastFailure && timeSinceLastSuccess > 30000) {
                    console.warn(`[MONITOR] 경고: 30초 이상 성공한 요청이 없음 - 연결 상태 확인 필요`);
                }
            }
        }, 60000); // 1분마다
    }

    /**
     * 연결 상태 확인
     */
    async checkConnection() {
        try {
            // 간단한 연결 테스트
            if (this.modbusRTU && this.isConnected) {
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[MONITOR] 연결 상태 확인 실패: ${error.message}`);
            return false;
        }
    }
}
// const modbusDeviceClient = new ModbusDeviceClient();
// modbusDeviceClient.connect();
export default ModbusDeviceClient;
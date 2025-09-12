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
        await this.acquireLock(moduleId);
        try {
            this.modbusRTU.setID(moduleId);
            this.modbusRTU.setTimeout(1000);
            const data = await this.modbusRTU.readInputRegisters(address, length);
            return data;
        } finally {
            this.releaseLock();
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
        // 락이 이미 설정되어 있으면 잠시 대기
        let attempts = 0;
        const maxAttempts = 10;
        
        while (this.isLocked && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (this.isLocked) {
            throw new Error(`Modbus 통신 락 획득 시간 초과. 모듈 ID: ${moduleId}`);
        }
        
        this.isLocked = true;
        
        // 타임아웃 설정 (자동 해제)
        setTimeout(() => {
            this.isLocked = false;
        }, this.lockTimeout);
    }

    /**
     * Modbus 통신 락 해제
     */
    releaseLock() {
        this.isLocked = false;
    }
}
// const modbusDeviceClient = new ModbusDeviceClient();
// modbusDeviceClient.connect();
export default ModbusDeviceClient;
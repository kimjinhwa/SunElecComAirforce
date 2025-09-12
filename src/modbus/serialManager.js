import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

const execAsync = util.promisify(exec);

// execAsync('lsusb').then(result => {
//     console.log(result.stdout);
// }).catch(error => {
//     console.error(error);
// });

class SerialManager {
    constructor() {
        this.portMapping = {
            'service': '/dev/ttyservice485',
            'device': '/dev/ttydevice485',
        }
        this.serialPort = null;
        this.isConnected = false;
        //this.isDocker = process.env.DOCKER ?? false;
    }
    async findSerialPort() {
        const { stdout } = await execAsync('lsusb');
        const hasDevice = stdout.includes('10c4:ea60');
        console.log(stdout);
        console.log(hasDevice);
    }
        async findServicePort() {
        try {
            await fs.promises.access('/dev/ttyService485');
            console.log('Service485가 올바른 포트에 연결되었습니다.');
            return '/dev/ttyService485';
        } catch (error) {
            throw new Error('Service485가 올바른 포트에 연결되지 않았습니다.');
        }
    }
    
    async findDevicePort() {
        try {
            await fs.promises.access('/dev/ttyDevice485');
            console.log('Device485가 올바른 포트에 연결되었습니다.');
            return '/dev/ttyDevice485';
        } catch (error) {
            throw new Error('Device485가 올바른 포트에 연결되지 않았습니다.');
        }
    }
    async connectDevicePort(portPath) {
        try {
            console.log('연결할 포트:', portPath);
            this.devicePort = new SerialPort({ 
                path: portPath,
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            console.log('Device485포트를 정상적으로 연결했습니다.');
        } catch (error) {
            console.error('Device485 연결 에러:', error.message);
            throw new Error(`Device485포트를 정상적으로 연결하지 못했습니다: ${error.message}`);
        }
    }
    async connectServicePort(portPath) {
        try {
            this.servicePort = new SerialPort({ 
                path: portPath,
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            console.log('Service485포트를 정상적으로 연결했습니다.');
        } catch (error) {
            throw new Error('Service485포트를 정상적으로 연결하지 못했습니다.');
        }
    }
    closeDevicePort() {
        this.devicePort.close();
    }
    closeServicePort() {
        this.servicePort.close();
    }
    closeAllPorts() {
        this.closeDevicePort();
        this.closeServicePort();
    }
}
//트 실행
// const manager = new SerialManager();
// manager.findDevicePort().then(port => {
//     manager.connectDevicePort(port);
// }).catch(error => {
//     console.error('테스트 에러:', error.message);
// });

export default SerialManager;
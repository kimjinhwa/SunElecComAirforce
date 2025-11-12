/**
 * Narada 배터리 시스템 프로토콜 클라이언트
 * C 코드의 NaradaClient232를 Node.js로 변환
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const CELL_BALANCE_FLAG = 0x8000;

class NaradaProtocolClient {
    constructor(portPath, baudRate = 9600) {
        this.portPath = portPath;
        this.baudRate = baudRate;
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.revData = Buffer.alloc(255);
        this.readSerialCount = 0;
        this.MAX_PACK_NUMBER = 8; // 최대 팩 번호
    }

    /**
     * 시리얼 포트 연결
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log(`[Narada] 시리얼 포트 설정: ${this.portPath}, ${this.baudRate}bps`);
                this.port = new SerialPort({
                    path: this.portPath,
                    baudRate: this.baudRate,
                    dataBits: 8,
                    stopBits: 1,
                    parity: 'none'
                });

                this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r' }));

                this.port.on('open', () => {
                    console.log(`Narada 프로토콜 클라이언트 연결됨: ${this.portPath}`);
                    this.isConnected = true;
                    resolve();
                });

                this.port.on('error', (err) => {
                    console.error('Narada 프로토콜 클라이언트 연결 오류:', err);
                    this.isConnected = false;
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 연결 해제
     */
    async disconnect() {
        if (this.port && this.isConnected) {
            return new Promise((resolve) => {
                this.port.close(() => {
                    this.isConnected = false;
                    console.log('Narada 프로토콜 클라이언트 연결 해제됨');
                    resolve();
                });
            });
        }
    }

    /**
     * 팩 데이터 요청 (C 코드의 getPackData 함수)
     * @param {number} packNumber - 팩 번호 (0-7)
     * @returns {Promise<Object>} 파싱된 배터리 데이터
     */
    async getPackData(packNumber) {
        if (!this.isConnected) {
            throw new Error('시리얼 포트가 연결되지 않았습니다.');
        }

        const maxRetries = 2; // 최대 2회 재시도
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Narada] 팩 ${packNumber} 데이터 요청 시작 (시도 ${attempt + 1}/${maxRetries + 1})`);
                
                // 요청 전 시리얼 버퍼 클리어
                await this.clearSerialBuffer();
                
                // 요청 데이터 생성: 7E [packNumber] 01 00 [checksum] 0D
                const sendData = this.createRequestPacket(packNumber);
                console.log(`[Narada] 요청 패킷:`, sendData.toString('hex'));
                
                // 시리얼 포트로 데이터 전송
                await this.writeToSerial(sendData);
                console.log(`[Narada] 요청 패킷 전송 완료`);
                
                // 응답 데이터 읽기
                const responseData = await this.readSerialData();
                console.log(`[Narada] 응답 데이터 수신:`, responseData.length, 'bytes');
                console.log(`[Narada] 응답 패킷:`, responseData.toString('hex'));
                
                // 데이터 파싱
                const parsedData = this.parseResponseData(responseData, packNumber);
                console.log(`[Narada] 팩 ${packNumber} 데이터 파싱 완료`);
                //console.log(`[Narada] 파싱된 데이터1`, parsedData);
                
                return parsedData;
                
            } catch (error) {
                console.error(`팩 ${packNumber} 데이터 읽기 실패 (시도 ${attempt + 1}/${maxRetries + 1}):`, error.message);
                
                // 오류 시 버퍼 클리어
                await this.clearSerialBuffer();
                
                if (attempt < maxRetries) {
                    // 재시도 전 잠시 대기
                    await new Promise(resolve => setTimeout(resolve, 200));
                } else {
                    // 최대 재시도 횟수 초과 시 기본값 반환
                    console.error(`팩 ${packNumber} 최대 재시도 횟수 초과 - 기본값 반환`);
                    return this.createDefaultData(packNumber);
                }
            }
        }
    }

    /**
     * 요청 패킷 생성
     * @param {number} packNumber - 팩 번호 (0-7)
     * @returns {Buffer} 요청 패킷
     */
    createRequestPacket(packNumber) {
        const packet = Buffer.alloc(6);
        packet[0] = 0x7E;           // 시작 바이트
        packet[1] = packNumber + 1; // 팩 번호 (1-8)
        packet[2] = 0x01;           // 명령어
        packet[3] = 0x00;           // 데이터 길이
        packet[4] = this.checksum(packet.slice(0, 4)); // 체크섬
        packet[5] = 0x0D;           // 종료 바이트
        return packet;
    }

    /**
     * 시리얼 버퍼 클리어
     */
    async clearSerialBuffer() {
        return new Promise((resolve) => {
            if (this.port && this.port.isOpen) {
                // 기존 데이터 리스너 제거
                this.port.removeAllListeners('data');
                
                // 간단한 타임아웃으로 버퍼 클리어 완료
                console.log(`[Narada] 버퍼 클리어 시작`);
                setTimeout(() => {
                    console.log(`[Narada] 버퍼 클리어 완료`);
                    resolve();
                }, 50); // 50ms 대기
            } else {
                resolve();
            }
        });
    }

    /**
     * 시리얼 포트로 데이터 전송
     * @param {Buffer} data - 전송할 데이터
     */
    async writeToSerial(data) {
        return new Promise((resolve, reject) => {
            this.port.write(data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.port.drain(() => {
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * 시리얼 포트에서 데이터 읽기 (C 코드의 readSerial2Data 함수)
     * @returns {Promise<Buffer>} 읽은 데이터
     */
    async readSerialData() {
        return new Promise((resolve, reject) => {
            const timeout = 3000; // 3초 타임아웃
            let dataBuffer = Buffer.alloc(0);
            let dataReceived = false;

            const tryAssemble = () => {
                // 0x7E 동기화: 시작 바이트 찾기
                const startIdx = dataBuffer.indexOf(0x7E);
                if (startIdx === -1) {
                    return false; // 아직 시작 못찾음
                }
                if (startIdx > 0) {
                    // 쓰레기 프리픽스 제거
                    dataBuffer = dataBuffer.slice(startIdx);
                }
                if (dataBuffer.length < 4) return false; // 헤더 부족

                const lengthField = dataBuffer[3];
                const expectedLength = lengthField + 6; // 헤더4 + CRC1 + 종료1
                if (dataBuffer.length < expectedLength) return false; // 더 필요

                // 종료 바이트 확인
                if (dataBuffer[expectedLength - 1] !== 0x0D) {
                    // 다음 0x7E까지 스킵
                    const next = dataBuffer.indexOf(0x7E, 1);
                    if (next !== -1) {
                        dataBuffer = dataBuffer.slice(next);
                        return false;
                    }
                    return false;
                }

                return true;
            };

            const onData = (chunk) => {
                dataReceived = true;
                dataBuffer = Buffer.concat([dataBuffer, chunk]);
                
                if (tryAssemble()) {
                    this.port.removeListener('data', onData);
                    clearTimeout(tid);
                    console.log(`[Narada] 완전한 응답 수신: ${dataBuffer.length} bytes`);
                    resolve(dataBuffer);
                }
            };

            const tid = setTimeout(() => {
                this.port.removeListener('data', onData);
                if (!dataReceived) {
                    reject(new Error('데이터 읽기 타임아웃 - 응답 없음'));
                } else {
                    reject(new Error(`데이터 읽기 타임아웃 - 부분 수신: ${dataBuffer.length} bytes`));
                }
            }, timeout);

            this.port.on('data', onData);
        });
    }

    /**
     * 응답 데이터 파싱 (C 코드의 dataParse 함수)
     * @param {Buffer} responseData - 응답 데이터
     * @param {number} packNumber - 팩 번호
     * @returns {Object} 파싱된 데이터
     */
    parseResponseData(responseData, packNumber) {
        try {
            // 시작 바이트 확인
            if (responseData[0] !== 0x7E) {
                console.error(`[Narada] 잘못된 시작 바이트: 0x${responseData[0].toString(16).padStart(2, '0')}, 예상: 0x7E`);
                throw new Error('잘못된 시작 바이트');
            }
            
            // 최소 길이 확인 (헤더 4바이트 + 최소 데이터 1바이트 + CRC 1바이트 + 종료 1바이트 = 7바이트)
            if (responseData.length < 7) {
                console.error(`[Narada] 응답 데이터가 너무 짧음: ${responseData.length} bytes, 최소 7 bytes 필요`);
                throw new Error('응답 데이터가 너무 짧음');
            }

            // CRC 검증
            const dataLength = responseData[3];
            const crcIndex = 4 + dataLength;
            const calculatedCrc = this.checksum(responseData.slice(0, crcIndex));
            
            if (responseData[crcIndex] !== calculatedCrc) {
                throw new Error('CRC 검증 실패');
            }

            // 데이터 파싱
            let dataIndex = 4; // 헤더 건너뛰기
            const parsedData = {
                packNumber: packNumber,
                cellVoltages: [],
                current: 0,
                soc: 0,
                capacity: 0,
                temperatures: [],
                packStatus: [],
                readCycleCount: 0,
                totalVoltage: 0,
                soh: 0,
                bmsProtectStatus: 0,
                isValid: true
            };

            // 데이터 블록 파싱 (길이만큼)
            while (dataIndex < 4 + dataLength - 1) { // CRC 전까지
                if (dataIndex >= responseData.length - 1) break;
                
                const command = responseData[dataIndex];
                const dataLen = responseData[dataIndex + 1];
                
                // 명령어별 데이터 길이 계산
                let actualDataLen = dataLen;
                if (command === 1) { // 전압: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 2) { // 전류: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 3) { // SOC: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 4) { // 용량: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 5) { // 온도: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 6) { // 팩 상태: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 7) { // 사이클 카운트: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 8) { // 총 전압: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 9) { // SOH: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                } else if (command === 10) { // BMS 보호 상태: 개수 * 2바이트
                    actualDataLen = dataLen * 2;
                }
                
                
                // 데이터 길이가 유효한지 확인
                if (actualDataLen === 0 || dataIndex + 2 + actualDataLen > responseData.length) {
                    console.log(`[Narada] 잘못된 데이터 길이: ${actualDataLen}, 남은 바이트: ${responseData.length - dataIndex - 2}`);
                    break;
                }
                
                const data = responseData.slice(dataIndex + 2, dataIndex + 2 + actualDataLen);
                
                this.parseDataBlock(command, data, parsedData);
                
                dataIndex += 2 + actualDataLen;
            }

            return parsedData;

        } catch (error) {
            console.error('데이터 파싱 오류:', error.message);
            const invalid = this.createDefaultData(packNumber);
            invalid.isValid = false;
            return invalid;
        }
    }

    /**
     * 데이터 블록 파싱 (C 코드의 dataParseExt 함수)
     * @param {number} command - 명령어
     * @param {Buffer} data - 데이터
     * @param {Object} parsedData - 파싱된 데이터 객체
     */
    parseDataBlock(command, data, parsedData) {
        switch (command) {
            case 1: // 전압 (15개 셀)
                {
                    const rawVoltages = this.makeIntArray(data, 15);
                    parsedData.cellVoltages = rawVoltages.map(value => value & (~CELL_BALANCE_FLAG & 0xFFFF));
                }
                break;
            case 2: // 전류
                // 원본 데이터 형식: 30000 오프셋 (예: 30000 = 0A, 29900 = 10A, 30100 = -10A)
                // 변환: (30000 - rawCurrent) / 100.0 = A 단위, 소수점 2자리 (예: 10.50A)
                // Modbus 형식: 0.1A 단위 (예: 0 = 0A, 10 = 1.0A, 105 = 10.5A)
                // 따라서: ((30000 - rawCurrent) / 100.0) * 10 (10000 오프셋 불필요, 이미 30000이 오프셋)
                const rawCurrent = this.makeInt(data);
                const currentInA = (30000 - rawCurrent) / 100.0; // A 단위, 소수점 2자리 (예: 10.50A)
                parsedData.current = Math.round(currentInA * 10); // 0.1A 단위로 변환 (예: 10.5A -> 105)
                console.log(`[Narada]====> 전류: 원본=${rawCurrent}, A단위=${currentInA}, 0.1A단위=${parsedData.current}`);
                break;
            case 3: // SOC
                parsedData.soc = this.makeInt(data);
                break;
            case 4: // 배터리 용량
                parsedData.capacity = this.makeInt(data);
                break;
            case 5: // 온도 (6개: 4개 셀 + 1개 PCB + 1개 주변)
                const rawTemperatures = this.makeIntArray(data, 6);
                // 온도 오프셋 50 제거
                parsedData.temperatures = rawTemperatures.map(temp => temp - 50);
                break;
            case 6: // 배터리 팩 상태
                parsedData.packStatus = this.makeIntArray(data, 5);
                break;
            case 7: // 읽기 사이클 카운트
                parsedData.readCycleCount = this.makeInt(data);
                break;
            case 8: // 총 전압
                parsedData.totalVoltage = this.makeInt(data);
                break;
            case 9: // SOH
                parsedData.soh = this.makeInt(data);
                break;
            case 10: // BMS 보호 상태
                parsedData.bmsProtectStatus = this.makeInt(data);
                break;
            default:
                console.log(`[Narada] 알 수 없는 명령어: 0x${command.toString(16)}`);
        }
    }

    /**
     * 16비트 정수 배열 생성
     * @param {Buffer} data - 데이터 버퍼
     * @param {number} count - 개수
     * @returns {Array} 정수 배열
     */
    makeIntArray(data, count) {
        const result = [];
        for (let i = 0; i < count && i * 2 < data.length; i++) {
            result.push(this.makeInt(data.slice(i * 2, i * 2 + 2)));
        }
        return result;
    }

    /**
     * 16비트 정수 생성 (빅 엔디안)
     * @param {Buffer} data - 2바이트 데이터
     * @returns {number} 정수 값
     */
    makeInt(data) {
        if (data.length < 2) return 0;
        return (data[0] << 8) | data[1];
    }

    /**
     * 체크섬 계산 (C 코드의 checksum 함수)
     * @param {Buffer} buf - 데이터 버퍼
     * @param {number} len - 길이
     * @returns {number} 체크섬
     */
    checksum(buf, len = buf.length) {
        let chk = 0;
        let sum = 0;
        
        for (let i = 0; i < len; i++) {
            chk ^= buf[i];
            sum += buf[i];
        }
        
        return (chk ^ sum) & 0xFF;
    }

    /**
     * 기본 데이터 생성 (오류 시 사용)
     * @param {number} packNumber - 팩 번호
     * @returns {Object} 기본 데이터
     */
    createDefaultData(packNumber) {

        return {
            packNumber: packNumber,
            cellVoltages: new Array(15).fill(0),
            current: 0,
            soc: 0,
            capacity: 0,
            temperatures: new Array(6).fill(0),
            packStatus: new Array(5).fill(0),
            readCycleCount: 0,
            totalVoltage: 0,
            soh: 0,
            bmsProtectStatus: 0,
            isValid: false  // 실패 플래그
        };
    }

    /**
     * 연결 상태 확인
     * @returns {boolean} 연결 상태
     */
    isConnected() {
        return this.isConnected;
    }
}

export default NaradaProtocolClient;

import express from 'express';
import cors from 'cors';
//import batteryModbusReader from './modbus/BatteryModbusReader.js';
//import modbus from './modbusClient.js';
//import { getCurrentBatteryData } from './batterySimulator.js';

const app = express();
const port = process.env.API_PORT || 4000;
// BatteryMib 인스턴스를 저장할 변수
let batteryMibInstance = null;


// CORS 설정
app.use(cors());

// JSON 파싱 미들웨어
app.use(express.json());


// 배터리 데이터 API 엔드포인트
// app.get('/api/write-registers', async (req, res) => {
//   try {
//     const { modbusid,address, value } = req.query;
//     console.log('write-registers', modbusid, address, value);
//     //modbus.client.setID(modbusid);
//     if(modbusid == 0) {
//       for(let i = 1; i <= 20 ; i++) {
//         await modbus.writeMultipleRegisters(i,address, value);
//       }
//       res.json({status: 'success'});
//     } else {
//       const data = await modbus.writeSingleRegister(modbusid,address, value);
//       console.log('write-registers---->', data);
//       res.json(JSON.stringify(data));
//     }
//   } catch (error) {
//     console.error('Error writing registers:', error);
//     res.status(500).json({ 
//       error: 'Internal server error',
//       message: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// app.get('/api/holding-registers', async (req, res) => {
//   const { modbusid,address, length} = req.query;
//   //console.log('holding-registers', modbusid, address, length);
//   const maxRetries = 3;
//   let retryCount = 0;

//   while (retryCount < maxRetries) {
//     try {
//       //modbus.client.setID(modbusid);
//       modbus.client.setTimeout(3000);
//       const data = await modbus.readHoldingRegisters(modbusid,address, length);
//       //console.log(data);
//       res.json(data);
//       return;
//     } catch (error) {
//       retryCount++;
//       console.error(`Read holding registers error (attempt ${retryCount}/${maxRetries}):`, error);
      
//       if (retryCount === maxRetries) {
//         res.status(500).json({ 
//           error: 'Internal server error',
//           message: error.message,
//           timestamp: new Date().toISOString()
//         });
//       } else {
//         // 재시도 전에 잠시 대기
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }
//   }
// });

app.get('/api/battery', (req, res) => {
  try {
    // BatteryMib 인스턴스에서 modbusReader 가져오기
    if (!batteryMibInstance || !batteryMibInstance.modbusReader) {
      console.log("BatteryMib instance or modbusReader not available");
      return res.status(404).json({ 
        error: 'Battery system not initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    const batteryData = batteryMibInstance.modbusReader.multi_data;
    //console.log("batteryMibInstance-------------->", batteryData);
    
    // 데이터 유효성 검사
    // if (batteryData) {
    //   console.log("batteryData.devices-------------->", batteryData.devices);
    //   console.log("batteryData.summary-------------->", batteryData.summary);
    // }
    
    if (!batteryData || !batteryData.devices || batteryData.summary?.success == 0 ) 
    {
      return res.status(404).json({ 
        error: 'Battery data not available',
        timestamp: new Date().toISOString()
      });
    }

    // 응답 데이터 구조화
    const responseData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        multi_data: {
          devices: {},
          summary: batteryData.summary || { success: 0, failed: 0 }
        },
        rackInfo: batteryData.rackInfo
      }
    };

    // devices 데이터 처리
    if (batteryData.devices) {
      Object.keys(batteryData.devices).forEach(moduleNo => {
        const device = batteryData.devices[moduleNo];
        //console.log("Device",moduleNo, device);
        if (device && device.status === 'success' && device.data) {
          responseData.data.multi_data.devices[moduleNo] = {
            status: 'success',
            data: device.data.map(value => Number(value))
          };
        } else {
          responseData.data.multi_data.devices[moduleNo] = {
            status: 'failed',
            error: device?.error || 'No data available'
          };
        }
      });
    }

    // 응답 전송
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching battery data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// BatteryMib 인스턴스 설정 함수
export function setBatteryMibInstance(batteryMib) {
  batteryMibInstance = batteryMib;
}

// 서버 시작
export function startApiServer() {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API Server is running on port ${port}`);
  });
} 
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';
import dayjs from 'dayjs';
//import logger from './logger.js';
import loggerWinston from './loggerWinston.js';
const {Pool} = pg;
// AlarmTypes 상수 정의 추가
const AlarmTypes = {
  HIGH_VOLTAGE: 1,
  LOW_VOLTAGE: 2,
  HIGH_IMPEDANCE: 3,
  HIGH_TEMPERATURE: 4,
  DISCHARGE: 5
};
const InsertLogQuery = `
  insert into batterylog (datetime, rackno, moduleno, batnumber, 
                                voltage, impedance, ampere, temperature, soc, state, totalvoltage)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;
const InsertDischargeLogQuery= `
  insert into dischargebatterylog (datetime, rackno, moduleno, batnumber, 
                                voltage, impedance, ampere, temperature, soc, state, totalvoltage)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

const createTableQuery = `
    create table if not exists rack (
      rackno int primary key,
      installedmodule int,
      totalbatno int,
      rackname varchar(50),
      installdate date,
      expiredate date,
      bat_type varchar(10),
      nominalvoltage float,
      highvoltage float,
      lowvoltage float,
      hightemperature float,
      highimpedance float,
      location varchar(100)
    );

    create table if not exists module (
      rackno int,
      moduleno int,
      installedbat int,
      primary key (rackno, moduleno)
    );

    create table if not exists batterylog (
      id serial primary key,
      datetime timestamptz(6),
      rackno int,
      moduleno int,
      batnumber int,
      voltage float,
      impedance float,
      ampere float,
      temperature float,
      soc float,
      state int,
      totalvoltage float
    );

    create table if not exists dischargebatterylog (
      id serial primary key,
      datetime timestamptz(6),
      rackno int,
      moduleno int,
      batnumber int,
      voltage float,
      impedance float,
      ampere float,
      temperature float,
      soc float,
      state int,
      totalvoltage float
    );

    create table if not exists alarmdefine (
      alarmtype int primary key,
      note varchar(100)
    );

    create table if not exists alarmlog (
      id serial primary key,
      datetime timestamptz(6),
      alarmtype int,
      rackno int,
      moduleno int,
      batnumber int,
      resolved boolean
    );
    create extension if not exists "uuid-ossp";
    create table if not exists users(
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `
const rackDatas = [
  {
    rackno: 1,
    installedmodule: 12,
    totalbatno: 190,
    rackname: "main bat",
    installdate: '2024-11-11',
    expiredate: '2034-11-10',
    bat_type: 'ni-cd',
    nominalvoltage: 1.2,
    highvoltage: 3.65,
    lowvoltage: 2.99,
    hightemperature: 65,
    highimpedance: 10.0,
    location: '주전산실',
  }
];
dotenv.config();
loggerWinston.info("DATABASE_URL-------------->", process.env.DATABASE_URL);

function toInt16(value) {
  const int16 = value & 0xFFFF;  // 16비트만 사용
  return int16 > 0x7FFF ? int16 - 0x10000 : int16;  // 음수 처리
}

class DataBaseConnect {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.createTable();
      await this.insertInitialData();
      await this.createUser();
      await this.insertAlarmDefinitions();
      this.initialized = true;
      loggerWinston.info('Database initialization completed');
    }
  }
  async createUser() {
    const client = await this.pool.connect();
    try {
      const userResult = await client.query(`select * from users`);
      const name = 'iftech';
      const password = '123456';
      const salt = await bcrypt.genSalt(10);
      const hashpassword = await bcrypt.hash(password, salt);
      const email = 'iftech@iftech.co.kr';
      await client.query('BEGIN');
      loggerWinston.info('userResult.rows.name', userResult.rows.length);

      if (userResult.rows.length == 0) {
        await client.query(`
      insert into users (name, email, password)
      values ('${name}', '${email}', '${hashpassword}')
  `);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }
  }
  async createTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`BEGIN`);
      await client.query(createTableQuery);
      await client.query(`COMMIT`);
    } catch (error) {
      await client.query(`ROLLBACK`);
      throw error;
    } finally {
      await client.release();
      loggerWinston.info('Tables created successfully');
    }
  }

  async insertInitialData() {
    const client = await this.pool.connect();
    try {
      let rackResult = await this.getRackData();
      if (rackResult.length === 0) {
        await this.insertRackData(rackDatas);
        rackResult = await this.getRackData();
      }
      // Module 정보 생성
      let moduleDatas = Array.from({
        length: rackResult[0].installedmodule
      }, (_, i) => ({
        rackno: 1,
        moduleno: i + 1,
        installedbat: i = 16
      }));
      let moduleResult = await this.getModuleData(rackResult[0].rackno);
      if (moduleResult.length < rackResult[0].installedmodule) {
        //await insertModuleData(moduleDatas);
        await client.query(`BEGIN`);
        for (const module of moduleDatas) {
          await client.query(`
        insert into module (rackno, moduleno, installedbat)
        values ($1, $2, $3)
        on conflict (rackno, moduleno) do nothing
      `, [module.rackno, module.moduleno, module.installedbat]);
        }
        await client.query(`COMMIT`);
      }
      loggerWinston.info('getModuleData successfully', moduleResult);
    } catch (error) {
      await client.query(`ROLLBACK`);
      throw error;
    } finally {
      await client.release();
      loggerWinston.info('Initial data inserted successfully');
    }
  }

  async getRackData() {
    const client = await this.pool.connect();
    const query = `SELECT * FROM rack`;
    const result = await client.query(query);
    await client.release();
    return result.rows;
  }
  async getModuleData(rackno) {
    const client = await this.pool.connect();
    const query = `SELECT * FROM module WHERE rackno = $1 order by moduleno `;
    const result = await client.query(query, [rackno]);
    await client.release();
    return result.rows;
  }
  async insertRackData(rackData) {
    const { rackno, installedmodule, totalbatno, rackname, installdate, expiredate, bat_type, nominalvoltage, highvoltage, lowvoltage, hightemperature, highimpedance, location } = rackData;
    const query = `INSERT INTO rack (rackno, installedmodule, totalbatno, rackname, installdate, expiredate, bat_type, nominalvoltage, highvoltage, lowvoltage, hightemperature, highimpedance, location) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING rackno
                   ON CONFLICT (rackno) DO NOTHING`;
    const values = [rackno, installedmodule, totalbatno, rackname, installdate, expiredate, bat_type, nominalvoltage, highvoltage, lowvoltage, hightemperature, highimpedance, location];
    const result = await this.pool.query(query, values);
    return result.rows[0].rackno;
  }
  async updateRackData(rackData) {
    const { rackno, installedmodule, totalbatno, rackname, installdate, expiredate, bat_type, nominalvoltage, highvoltage, lowvoltage, hightemperature, highimpedance, location } = rackData;
    const query = `UPDATE rack SET installedmodule = $2, totalbatno = $3, rackname = $4, installdate = $5, expiredate = $6, bat_type = $7, nominalvoltage = $8, highvoltage = $9, lowvoltage = $10, hightemperature = $11, highimpedance = $12, location = $13 WHERE rackno = $1`;
    const values = [rackno, installedmodule, totalbatno, rackname, installdate, expiredate, bat_type, nominalvoltage, highvoltage, lowvoltage, hightemperature, highimpedance, location];
    await this.pool.query(query, values);
  }
  async deleteRackData(rackno) {
    const query = `DELETE FROM rack WHERE rackno = $1`;
    await this.pool.query(query, [rackno]);
  }
  // batterylog 테이블 state 정의
  // * 1: 부동충전
  // * 2: 충전시작
  // * 3: 충전중
  // * 4: 충전완료
  // * 5: 방전시작
  // * 6: 방전중
  // * 7: 방전완료

  // 알람 정의 설명 업데이트
  async insertAlarmDefinitions() {

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const alarmDefinitions = [
        { type: AlarmTypes.HIGH_VOLTAGE, note: '고전압 경보' },
        { type: AlarmTypes.LOW_VOLTAGE, note: '저전압 경보' },
        { type: AlarmTypes.HIGH_IMPEDANCE, note: '고임피던스 경보' },
        { type: AlarmTypes.HIGH_TEMPERATURE, note: '고온도 경보' },
        { type: AlarmTypes.DISCHARGE, note: '방전 경보' }
      ];

      for (const alarm of alarmDefinitions) {
        await client.query(`
        insert into alarmdefine (alarmtype, note)
        values ($1, $2)
        on conflict (alarmtype) do update set note = excluded.note
      `, [alarm.type, alarm.note]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      loggerWinston.error('Error inserting alarm definitions:', e);
    } finally {
      client.release();
      loggerWinston.info('Alarm definitions inserted successfully');
    }
  }

  async logBatteryData(multi_data, state) 
  {
    // loggerWinston.info('logBatteryData success:', multi_data.summary.success,
    //   'failed:', multi_data.summary.failed);
    //loggerWinston.info('logBatteryData-------------->', multi_data, state);
    const client = await this.pool.connect();
    try {
      let insertCount = 0;
      const currentTime = dayjs().format("YYYY-MM-DD HH:mm:ss"); //.tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
      loggerWinston.info('currentTime---->>>:', currentTime);
      const rackResult = await this.getRackData();
      const rackInfo = rackResult[0];
      const moduleResult = await this.getModuleData(rackInfo.rackno);
      loggerWinston.debug('Multiple Register data:', multi_data);


      let batteryData = {
        Voltage: 0.0,
        Impedance: 0.0,
        Ampere: 0.0,
        Temperature: 0.0,
        SOC: 0.0,
        totalVoltage: 0.0,
        State: state
      };
      insertCount = 0;
      let AmpereModuleOne = 0.0;
      for (const module of moduleResult) {
        loggerWinston.info('module-------------->'+
          JSON.stringify(module));
        loggerWinston.info('multi_data.devices[module.moduleno]-------------->'+
          JSON.stringify(multi_data[`module${module.moduleno}`].result.status));
        if (multi_data[`module${module.moduleno}`].result.status == 'success') // 모듈 데이터 읽기 성공
        {
          for (let batNum = 1; batNum <= module.installedbat; batNum++) {
            AmpereModuleOne = multi_data[`module${module.moduleno}`].packInfo.CurrentValue;
            AmpereModuleOne = toInt16(AmpereModuleOne);
            AmpereModuleOne -= 10000;
            AmpereModuleOne *= 0.1;
            batteryData.Voltage = multi_data[`module${module.moduleno}`].cellVoltages[batNum - 1];
            batteryData.Voltage /= 1000.0;
            batteryData.SOC = multi_data[`module${module.moduleno}`].packInfo.SOC;
            batteryData.SOC /= 100.0;
            batteryData.Temperature = multi_data[`module${module.moduleno}`].packInfo.AverageCellTemp;
            batteryData.Temperature -= 400;
            batteryData.Temperature /= 10.0;
            if (batteryData.Temperature > 120.0) {
              batteryData.Temperature = -35;
            }
            batteryData.Impedance = 0.0;
            batteryData.Ampere = AmpereModuleOne;
            batteryData.totalVoltage = multi_data[`module${module.moduleno}`].packInfo.packVoltage;
            batteryData.totalVoltage /= 100.0;
            insertCount++;
            await client.query(InsertLogQuery, [currentTime, module.rackno, module.moduleno, batNum,
              batteryData.Voltage, batteryData.Impedance, batteryData.Ampere,
              batteryData.Temperature, batteryData.SOC, batteryData.State, batteryData.totalVoltage]);

            await this.checkAndLogAlarms(currentTime, module.rackno, module.moduleno, batNum, batteryData, rackInfo);
          }
        }
        else {
          batteryData.Voltage = 0.0;
          batteryData.Temperature = 0.0;
          batteryData.Ampere = 0.0;
          batteryData.totalVoltage = 0.0;
          batteryData.SOC = 0.0;
          batteryData.Impedance = 0.0;
          batteryData.State = 0;
          for (let batNum = 1; batNum <= module.installedbat; batNum++) {
            await client.query( InsertLogQuery , 
            [currentTime, module.rackno, module.moduleno, batNum,
              batteryData.Voltage, batteryData.Impedance, batteryData.Ampere,
              batteryData.Temperature, batteryData.SOC, batteryData.State, batteryData.totalVoltage]);
            if(AmpereModuleOne < 0) {
              await client.query(InsertDischargeLogQuery, [currentTime, module.rackno, module.moduleno, batNum,
                batteryData.Voltage, batteryData.Impedance, batteryData.Ampere,
                batteryData.Temperature, batteryData.SOC, batteryData.State, batteryData.totalVoltage]);
            }
          }
        }
      }
    } catch (e) {
      loggerWinston.error('Error logging battery data:', e);
    } finally {
      client.release();
    }
  }
  async checkAndLogAlarms(currentTime, rackNo, moduleNo, batNumber, batteryData, rackInfo) {
    const client = await this.pool.connect();
    try {
      const alarmConditions = [
        // 과전압 체크
        {
          condition: batteryData.Voltage > (rackInfo.highvoltage + 0.15),
          alarmType: AlarmTypes.HIGH_VOLTAGE
        },
        // 저전압 체크
        {
          condition: batteryData.Voltage < (rackInfo.lowvoltage - 0.15),
          alarmType: AlarmTypes.LOW_VOLTAGE
        },
        // High Impedance 체크
        {
          condition: batteryData.Impedance > rackInfo.highimpedance,
          alarmType: AlarmTypes.HIGH_IMPEDANCE
        },
        // High Temperature 체크
        {
          condition: batteryData.Temperature > rackInfo.hightemperature,
          alarmType: AlarmTypes.HIGH_TEMPERATURE
        },
        // 방전 체크
        // {
        //   condition: batteryData.SOC < 0.45,
        //   alarmType: AlarmTypes.DISCHARGE
        // }

      ];
      for (const { condition, alarmType } of alarmConditions) {
        // 해당 배터리의 가장 최근 알람 상태 조회
         const lastAlarmResult = await client.query(`
         SELECT alarmtype, resolved
         FROM alarmlog
         WHERE rackno = $1 AND moduleno = $2 AND batnumber = $3 AND alarmtype = $4
         ORDER BY datetime DESC
         LIMIT 1
       `, [rackNo, moduleNo, batNumber, alarmType]);

      const lastAlarmResolved = lastAlarmResult.rows.length === 0 || lastAlarmResult.rows[0].resolved;

        // 현재 알람 상태와 이전 상태가 다를 때만 새 레코드 삽입
        if (condition && lastAlarmResolved) {
          // 알람 시작 - 새 레코드 삽입
          await client.query(`
          INSERT INTO alarmlog (datetime, alarmtype, rackno, moduleno, batnumber, resolved)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [currentTime, alarmType, rackNo, moduleNo, batNumber, false]);

          logger.debug(`${currentTime} 새 알람 발생: AlarmType:${alarmType}, Rack:${rackNo}, Module:${moduleNo}, Bat:${batNumber}`);
        }
        else if (!condition && !lastAlarmResolved) {
          // 알람 해제 - 새 레코드 삽입 (resolved = true)
          await client.query(`
          INSERT INTO alarmlog (datetime, alarmtype, rackno, moduleno, batnumber, resolved)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [currentTime, alarmType, rackNo, moduleNo, batNumber, true]);

          logger.debug(`${currentTime} 알람 해제 기록: AlarmType:${alarmType}, Rack:${rackNo}, Module:${moduleNo}, Bat:${batNumber}`);
        }
    //     // 상태가 변경되지 않았으면 아무 작업도 하지 않음
      }
    } catch (e) {
      logger.error('Error logging alarms:', e);
    } finally {
      client.release();
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
const dataBaseConnect = new DataBaseConnect();
export { dataBaseConnect };
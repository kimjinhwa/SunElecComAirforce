/**
 * 배터리 데이터 모델 사용 예제
 * Modbus를 통한 데이터 수집 시뮬레이션
 */

const { BatterySystemData, BatteryModuleData } = require('../models/BatteryData');

// 배터리 시스템 초기화
const batterySystem = new BatterySystemData();

// 8개 모듈 추가 (MIB 파일에 정의된 모듈 1-8)
const module1 = batterySystem.addModule(1);
const module2 = batterySystem.addModule(2);
const module3 = batterySystem.addModule(3);
const module4 = batterySystem.addModule(4);
const module5 = batterySystem.addModule(5);
const module6 = batterySystem.addModule(6);
const module7 = batterySystem.addModule(7);
const module8 = batterySystem.addModule(8);

console.log('=== IFTECH 48V 배터리 시스템 초기화 완료 (8개 모듈) ===');
console.log(`총 모듈 수: ${batterySystem.systemInfo.totalModules}`);
console.log(`시스템 상태: ${batterySystem.systemInfo.systemStatus}\n`);

// 모듈 1 데이터 시뮬레이션 (Modbus에서 받은 데이터라고 가정)
function simulateModule1Data() {
    console.log('--- 모듈 1 데이터 업데이트 ---');
    
    // 셀 전압 데이터 설정 (16개 셀)
    const cellVoltages = [
        3800, 3810, 3795, 3805, 3820, 3815, 3800, 3810,
        3790, 3800, 3815, 3805, 3820, 3810, 3805, 3800
    ];
    module1.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정
    module1.packInfo.avgTemp = 25;
    module1.packInfo.ambTemp = 23;
    module1.packInfo.totalVoltage = 6080; // 60.8V
    module1.packInfo.packVoltage = 6080;
    module1.packInfo.chargeCurrent = 0;
    module1.packInfo.dischargeCurrent = 1500; // 15A
    module1.packInfo.soc = 85;
    module1.packInfo.soh = 95;
    module1.packInfo.ratedCapacity = 10000; // 100AH
    module1.packInfo.remainingCapacity = 8500; // 85AH
    module1.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (정상 상태)
    module1.alarms.packOvervoltageAlarm = 0;
    module1.alarms.packUndervoltageAlarm = 0;
    module1.alarms.chargeOvercurrentAlarm = 0;
    module1.alarms.dischargeOvercurrentAlarm = 0;
    module1.alarms.socLowAlarm = 0;
    
    // 파라미터 설정
    module1.parameters.cellOvervoltageAlarmValue = 4200;
    module1.parameters.cellOvervoltageAlarmRecovery = 4100;
    module1.parameters.cellUndervoltageAlarmValue = 3000;
    module1.parameters.cellUndervoltageAlarmRecovery = 3100;
    module1.parameters.socLowAlarmValue = 20;
    
    module1.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module1.cellVoltage.minVoltage}mV - ${module1.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module1.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module1.packInfo.soc}%`);
    console.log(`SOH: ${module1.packInfo.soh}%`);
    console.log(`팩 전압: ${module1.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module1.packInfo.dischargeCurrent/100}A`);
    console.log(`평균 온도: ${module1.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module1.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 2 데이터 시뮬레이션 (일부 셀에 문제가 있는 상황)
function simulateModule2Data() {
    console.log('--- 모듈 2 데이터 업데이트 (일부 셀 문제) ---');
    
    // 셀 전압 데이터 설정 (3번 셀이 저전압)
    const cellVoltages = [
        3800, 3810, 2900, 3805, 3820, 3815, 3800, 3810, // 3번 셀 저전압
        3790, 3800, 3815, 3805, 3820, 3810, 3805, 3800
    ];
    module2.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정
    module2.packInfo.avgTemp = 28;
    module2.packInfo.ambTemp = 25;
    module2.packInfo.totalVoltage = 5950; // 59.5V (저전압 셀 때문에 낮음)
    module2.packInfo.packVoltage = 5950;
    module2.packInfo.chargeCurrent = 0;
    module2.packInfo.dischargeCurrent = 1200; // 12A
    module2.packInfo.soc = 75;
    module2.packInfo.soh = 90;
    module2.packInfo.ratedCapacity = 10000;
    module2.packInfo.remainingCapacity = 7500;
    module2.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (3번 셀 저전압 알람)
    module2.alarms.setCellUndervoltageAlarm(3, true);
    module2.alarms.packOvervoltageAlarm = 0;
    module2.alarms.packUndervoltageAlarm = 0;
    module2.alarms.chargeOvercurrentAlarm = 0;
    module2.alarms.dischargeOvercurrentAlarm = 0;
    module2.alarms.socLowAlarm = 0;
    
    module2.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module2.cellVoltage.minVoltage}mV - ${module2.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module2.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module2.packInfo.soc}%`);
    console.log(`SOH: ${module2.packInfo.soh}%`);
    console.log(`팩 전압: ${module2.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module2.packInfo.dischargeCurrent/100}A`);
    console.log(`평균 온도: ${module2.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module2.alarms.hasAnyAlarm() ? '있음' : '없음'}`);
    console.log(`3번 셀 저전압 알람: ${module2.alarms.getCellUndervoltageAlarm(3)}\n`);
}

// 모듈 3 데이터 시뮬레이션 (충전 중)
function simulateModule3Data() {
    console.log('--- 모듈 3 데이터 업데이트 (충전 중) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        4100, 4105, 4095, 4100, 4110, 4105, 4100, 4105,
        4090, 4100, 4105, 4100, 4110, 4105, 4100, 4100
    ];
    module3.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정
    module3.packInfo.avgTemp = 30;
    module3.packInfo.ambTemp = 28;
    module3.packInfo.totalVoltage = 6560; // 65.6V
    module3.packInfo.packVoltage = 6560;
    module3.packInfo.chargeCurrent = 2000; // 20A
    module3.packInfo.dischargeCurrent = 0;
    module3.packInfo.soc = 95;
    module3.packInfo.soh = 98;
    module3.packInfo.ratedCapacity = 10000;
    module3.packInfo.remainingCapacity = 9500;
    module3.packInfo.runningState = 1; // 충전
    
    // 알람 상태 설정 (정상 상태)
    module3.alarms.packOvervoltageAlarm = 0;
    module3.alarms.packUndervoltageAlarm = 0;
    module3.alarms.chargeOvercurrentAlarm = 0;
    module3.alarms.dischargeOvercurrentAlarm = 0;
    module3.alarms.socLowAlarm = 0;
    
    module3.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module3.cellVoltage.minVoltage}mV - ${module3.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module3.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module3.packInfo.soc}%`);
    console.log(`SOH: ${module3.packInfo.soh}%`);
    console.log(`팩 전압: ${module3.packInfo.packVoltage}V`);
    console.log(`충전 전류: ${module3.packInfo.chargeCurrent/100}A`);
    console.log(`평균 온도: ${module3.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module3.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 4 데이터 시뮬레이션 (정상 상태)
function simulateModule4Data() {
    console.log('--- 모듈 4 데이터 업데이트 (정상 상태) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        3850, 3855, 3845, 3850, 3860, 3855, 3850, 3855,
        3840, 3850, 3855, 3850, 3860, 3855, 3850, 3850
    ];
    module4.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정
    module4.packInfo.avgTemp = 22;
    module4.packInfo.ambTemp = 20;
    module4.packInfo.totalVoltage = 6160; // 61.6V
    module4.packInfo.packVoltage = 6160;
    module4.packInfo.chargeCurrent = 0;
    module4.packInfo.dischargeCurrent = 800; // 8A
    module4.packInfo.soc = 90;
    module4.packInfo.soh = 96;
    module4.packInfo.ratedCapacity = 10000;
    module4.packInfo.remainingCapacity = 9000;
    module4.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (정상 상태)
    module4.alarms.packOvervoltageAlarm = 0;
    module4.alarms.packUndervoltageAlarm = 0;
    module4.alarms.chargeOvercurrentAlarm = 0;
    module4.alarms.dischargeOvercurrentAlarm = 0;
    module4.alarms.socLowAlarm = 0;
    
    module4.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module4.cellVoltage.minVoltage}mV - ${module4.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module4.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module4.packInfo.soc}%`);
    console.log(`SOH: ${module4.packInfo.soh}%`);
    console.log(`팩 전압: ${module4.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module4.packInfo.dischargeCurrent/100}A`);
    console.log(`평균 온도: ${module4.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module4.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 5 데이터 시뮬레이션 (고온 상태)
function simulateModule5Data() {
    console.log('--- 모듈 5 데이터 업데이트 (고온 상태) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        3750, 3755, 3745, 3750, 3760, 3755, 3750, 3755,
        3740, 3750, 3755, 3750, 3760, 3755, 3750, 3750
    ];
    module5.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정 (고온)
    module5.packInfo.avgTemp = 45;
    module5.packInfo.ambTemp = 42;
    module5.packInfo.totalVoltage = 6000; // 60.0V
    module5.packInfo.packVoltage = 6000;
    module5.packInfo.chargeCurrent = 0;
    module5.packInfo.dischargeCurrent = 1000; // 10A
    module5.packInfo.soc = 70;
    module5.packInfo.soh = 88;
    module5.packInfo.ratedCapacity = 10000;
    module5.packInfo.remainingCapacity = 7000;
    module5.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (정상 상태)
    module5.alarms.packOvervoltageAlarm = 0;
    module5.alarms.packUndervoltageAlarm = 0;
    module5.alarms.chargeOvercurrentAlarm = 0;
    module5.alarms.dischargeOvercurrentAlarm = 0;
    module5.alarms.socLowAlarm = 0;
    
    module5.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module5.cellVoltage.minVoltage}mV - ${module5.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module5.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module5.packInfo.soc}%`);
    console.log(`SOH: ${module5.packInfo.soh}%`);
    console.log(`팩 전압: ${module5.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module5.packInfo.dischargeCurrent/100}A`);
    console.log(`평균 온도: ${module5.packInfo.avgTemp}°C (고온!)`);
    console.log(`알람 상태: ${module5.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 6 데이터 시뮬레이션 (SOC 저알람)
function simulateModule6Data() {
    console.log('--- 모듈 6 데이터 업데이트 (SOC 저알람) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        3600, 3605, 3595, 3600, 3610, 3605, 3600, 3605,
        3590, 3600, 3605, 3600, 3610, 3605, 3600, 3600
    ];
    module6.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정 (SOC 낮음)
    module6.packInfo.avgTemp = 18;
    module6.packInfo.ambTemp = 16;
    module6.packInfo.totalVoltage = 5760; // 57.6V
    module6.packInfo.packVoltage = 5760;
    module6.packInfo.chargeCurrent = 0;
    module6.packInfo.dischargeCurrent = 500; // 5A
    module6.packInfo.soc = 15; // SOC 낮음
    module6.packInfo.soh = 85;
    module6.packInfo.ratedCapacity = 10000;
    module6.packInfo.remainingCapacity = 1500;
    module6.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (SOC 저알람)
    module6.alarms.packOvervoltageAlarm = 0;
    module6.alarms.packUndervoltageAlarm = 0;
    module6.alarms.chargeOvercurrentAlarm = 0;
    module6.alarms.dischargeOvercurrentAlarm = 0;
    module6.alarms.socLowAlarm = 1; // SOC 저알람
    
    module6.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module6.cellVoltage.minVoltage}mV - ${module6.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module6.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module6.packInfo.soc}% (낮음!)`);
    console.log(`SOH: ${module6.packInfo.soh}%`);
    console.log(`팩 전압: ${module6.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module6.packInfo.dischargeCurrent/100}A`);
    console.log(`평균 온도: ${module6.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module6.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 7 데이터 시뮬레이션 (정지 상태)
function simulateModule7Data() {
    console.log('--- 모듈 7 데이터 업데이트 (정지 상태) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        3800, 3805, 3795, 3800, 3810, 3805, 3800, 3805,
        3790, 3800, 3805, 3800, 3810, 3805, 3800, 3800
    ];
    module7.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정 (정지 상태)
    module7.packInfo.avgTemp = 25;
    module7.packInfo.ambTemp = 23;
    module7.packInfo.totalVoltage = 6080; // 60.8V
    module7.packInfo.packVoltage = 6080;
    module7.packInfo.chargeCurrent = 0;
    module7.packInfo.dischargeCurrent = 0;
    module7.packInfo.soc = 80;
    module7.packInfo.soh = 92;
    module7.packInfo.ratedCapacity = 10000;
    module7.packInfo.remainingCapacity = 8000;
    module7.packInfo.runningState = 3; // 정지
    
    // 알람 상태 설정 (정상 상태)
    module7.alarms.packOvervoltageAlarm = 0;
    module7.alarms.packUndervoltageAlarm = 0;
    module7.alarms.chargeOvercurrentAlarm = 0;
    module7.alarms.dischargeOvercurrentAlarm = 0;
    module7.alarms.socLowAlarm = 0;
    
    module7.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module7.cellVoltage.minVoltage}mV - ${module7.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module7.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module7.packInfo.soc}%`);
    console.log(`SOH: ${module7.packInfo.soh}%`);
    console.log(`팩 전압: ${module7.packInfo.packVoltage}V`);
    console.log(`전류: 0A (정지 상태)`);
    console.log(`평균 온도: ${module7.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module7.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 모듈 8 데이터 시뮬레이션 (과전류 알람)
function simulateModule8Data() {
    console.log('--- 모듈 8 데이터 업데이트 (과전류 알람) ---');
    
    // 셀 전압 데이터 설정
    const cellVoltages = [
        3820, 3825, 3815, 3820, 3830, 3825, 3820, 3825,
        3810, 3820, 3825, 3820, 3830, 3825, 3820, 3820
    ];
    module8.cellVoltage.setAllCellVoltages(cellVoltages);
    
    // 팩 정보 설정 (과전류)
    module8.packInfo.avgTemp = 35;
    module8.packInfo.ambTemp = 32;
    module8.packInfo.totalVoltage = 6112; // 61.12V
    module8.packInfo.packVoltage = 6112;
    module8.packInfo.chargeCurrent = 0;
    module8.packInfo.dischargeCurrent = 3000; // 30A (과전류)
    module8.packInfo.soc = 60;
    module8.packInfo.soh = 90;
    module8.packInfo.ratedCapacity = 10000;
    module8.packInfo.remainingCapacity = 6000;
    module8.packInfo.runningState = 2; // 방전
    
    // 알람 상태 설정 (과전류 알람)
    module8.alarms.packOvervoltageAlarm = 0;
    module8.alarms.packUndervoltageAlarm = 0;
    module8.alarms.chargeOvercurrentAlarm = 0;
    module8.alarms.dischargeOvercurrentAlarm = 1; // 방전 과전류 알람
    module8.alarms.socLowAlarm = 0;
    
    module8.updateTimestamp();
    
    console.log(`셀 전압 범위: ${module8.cellVoltage.minVoltage}mV - ${module8.cellVoltage.maxVoltage}mV`);
    console.log(`평균 셀 전압: ${module8.cellVoltage.avgVoltage.toFixed(1)}mV`);
    console.log(`SOC: ${module8.packInfo.soc}%`);
    console.log(`SOH: ${module8.packInfo.soh}%`);
    console.log(`팩 전압: ${module8.packInfo.packVoltage}V`);
    console.log(`방전 전류: ${module8.packInfo.dischargeCurrent/100}A (과전류!)`);
    console.log(`평균 온도: ${module8.packInfo.avgTemp}°C`);
    console.log(`알람 상태: ${module8.alarms.hasAnyAlarm() ? '있음' : '없음'}\n`);
}

// 시스템 상태 업데이트
function updateSystemStatus() {
    batterySystem.updateSystemStatus();
    console.log('--- 시스템 전체 상태 ---');
    console.log(`활성 모듈 수: ${batterySystem.systemInfo.activeModules}`);
    console.log(`시스템 상태: ${batterySystem.systemInfo.systemStatus}`);
    console.log(`마지막 업데이트: ${batterySystem.systemInfo.lastSystemUpdate.toLocaleString()}\n`);
}

// JSON 데이터 출력
function printSystemJSON() {
    console.log('--- 전체 시스템 JSON 데이터 ---');
    console.log(JSON.stringify(batterySystem.toJSON(), null, 2));
}

// 실행
console.log('=== 배터리 데이터 시뮬레이션 시작 (8개 모듈) ===\n');

simulateModule1Data();
simulateModule2Data();
simulateModule3Data();
simulateModule4Data();
simulateModule5Data();
simulateModule6Data();
simulateModule7Data();
simulateModule8Data();
updateSystemStatus();
printSystemJSON();

console.log('\n=== 시뮬레이션 완료 ===');
console.log('이 데이터 구조를 Modbus 통신으로 실제 배터리에서 수집하여 사용할 수 있습니다.');

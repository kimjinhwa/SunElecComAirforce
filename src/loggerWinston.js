import winston from 'winston';
import dotenv from 'dotenv';
dotenv.config();

// Winston 로그 레벨 매핑
const getWinstonLevel = (level) => {
  const levelMap = {
    '0': 'error',
    '1': 'warn', 
    '2': 'info',
    '3': 'http',
    '4': 'verbose',
    '5': 'debug',
    '6': 'silly'
  };
  return levelMap[level] || 'info';
};

const isDevelopment = process.env.NODE_ENV !== 'production';

const loggerWinston = winston.createLogger({
  level: getWinstonLevel(process.env.LOG_LEVEL) || 'info',
  silent: process.env.LOG_LEVEL === 'none',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDevelopment ? 
      winston.format.colorize() : 
      winston.format.uncolorize(),
    winston.format.printf((info) => {
      // 모든 정보를 하나의 문자열로 결합
      const { timestamp, level, message, ...rest } = info;
      let output = message;
      
      // 나머지 모든 속성을 처리
      Object.values(rest).forEach(value => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            output += ' ' + JSON.stringify(value, null, 2);
          } else {
            output += ' ' + String(value);
          }
        }
      });
      
      return `${timestamp} [${level}]: ${output}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export default loggerWinston;

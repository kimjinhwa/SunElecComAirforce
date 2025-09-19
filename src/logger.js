import dotenv from 'dotenv';
const LogLevel = {
    NONE: 0,
    FATAL: 1,
    ERROR: 2,
    WARN: 3,
    INFO: 4,
    DEBUG: 5,
}

class Logger {
    constructor(){
        dotenv.config();
        this.level = parseInt(process.env.LOG_LEVEL || LogLevel.INFO.toString());
        console.log('Logger level-------------->', this.level);
    }
    error(message,...args){
        if(this.level >= LogLevel.ERROR){
            if(args.length > 0){
                console.error(`[ERROR] ${message}`,args);
            }else{
                console.error(`[ERROR] ${message}`);
            }
        }
    }
    warn(message,...args){
        if(this.level >= LogLevel.WARN){
            if(args.length > 0){
                console.warn(`[WARN] ${message}`,args);
            }else{
                console.warn(`[WARN] ${message}`);
            }
        }
    }
    info(message,...args){
        if(this.level >= LogLevel.INFO){
            if(args.length > 0){
                console.info(`[INFO] ${message}`,args);
            }else{
                console.info(`[INFO] ${message}`);
            }
        }
    }
    debug(message,...args){
        console.log('Logger level-------------->', this.level);
        if(this.level >= LogLevel.DEBUG){
            if(args.length > 0){
                console.debug(`[DEBUG] ${message}`,args);
            }else{
                console.debug(`[DEBUG] ${message}`);
            }
        }
    }
    fatal(message,...args){
        if(this.level >= LogLevel.FATAL){
            if(args.length > 0){
                console.error(`[FATAL] ${message}`,args);
            }else{
                console.error(`[FATAL] ${message}`);
            }
        }
    }
}
export default new Logger();
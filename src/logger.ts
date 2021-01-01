import winston from 'winston';

let logger: winston.Logger;

export function createLogger(): void {
  logger = winston.createLogger({
    level: 'info',
    levels: winston.config.npm.levels,
    transports: new winston.transports.Console(),
    exitOnError: false,
    silent: false,
  });
}

export function error(message: string): void {
  logger.log({ level: 'error', message });
}

export function warn(message: string): void {
  logger.log({ level: 'warn', message });
}

export function info(message: string): void {
  logger.log({ level: 'info', message });
}

export function verbose(message: string): void {
  logger.log({ level: 'verbose', message });
}

export function debug(message: string): void {
  logger.log({ level: 'debug', message });
}

export function silly(message: string): void {
  logger.log({ level: 'error', message });
}

import winston from 'winston';
import chalk from 'chalk';
import _ from 'lodash';

import { LogLevel } from './config/config';

const PERKULATOR = 'Perkulator:';

const loggingLevels: winston.config.AbstractConfigSetLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5,
};

let silent = false;
let clearFlag = true;

const consoleTransporter: winston.transports.ConsoleTransportInstance = new winston.transports.Console(
    {
        consoleWarnLevels: ['warn', 'debug'],
        stderrLevels: ['fatal', 'error'],
    },
);

const logger = winston.createLogger({
    format: winston.format.printf((info) => info.message.replace(/\n$/g, '')),
    exitOnError: false,
    level: 'info',
    levels: loggingLevels,
    transports: [consoleTransporter],
});

export const clear = (): void => {
    !silent && clearFlag && console.clear();
};

export const logTaskOutput = (msg: string): void => {
    logger.log('info', msg);
};

export const logTaskError = (msg: string): void => {
    logger.log('error', msg);
};

export const log = (...msg: string[]): void => {
    logger.log(
        'verbose',
        `%c${chalk.black.bgWhite(PERKULATOR)} ${chalk.white(...msg)}`,
    );
};

export const debug = (...msg: string[]): void => {
    logger.log(
        'debug',
        `${chalk.black.bgBlueBright(PERKULATOR)} ${chalk.blueBright(...msg)}`,
    );
};

export const info = (...msg: string[]): void => {
    logger.log(
        'info',
        `${chalk.black.bgGreenBright(PERKULATOR)} ${chalk.greenBright(...msg)}`,
    );
};

export const warn = (...msg: Array<string | Error>): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger.log({
        level: 'warn',
        message: `${chalk.black.bgYellow(PERKULATOR)} ${chalk.yellow(...msg)}`,
    });
};

export const error = (...msg: Array<string | Error>): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger.log({
        level: 'error',
        message: `${chalk.white.bgRedBright(PERKULATOR)} ${chalk.redBright(
            ...msg,
        )}`,
    });
};

export const fatal = (...msg: Array<string | Error>): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger.log({
        level: 'fatal',
        message: `${chalk.white.bgRedBright.underline(
            PERKULATOR,
        )} ${chalk.redBright(...msg)}`,
    });
};

export const setSilent = (flag: boolean) => {
    silent = flag;
    logger.silent = flag;
};

export const setLogLevel = (level: LogLevel) => {
    logger.level = level;
};

export const setClear = (flag: boolean) => {
    clearFlag = flag;
};

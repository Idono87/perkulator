import winston from 'winston';
import chalk from 'chalk';
import _ from 'lodash';

const PERKULATOR = 'Perkulator';

const loggingLevels: winston.config.AbstractConfigSetLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5,
};

const silent = process.env.PERKULATOR_SILENCE_OUTPUT === 'true';
const logLevel = _.isUndefined(process.env.PERKULATOR_LOG_LEVEL)
    ? 'info'
    : process.env.PERKULATOR_LOG_LEVEL;

const consoleTransporter: winston.transports.ConsoleTransportInstance = new winston.transports.Console(
    {
        consoleWarnLevels: ['warn', 'debug'],
        level: logLevel,
        stderrLevels: ['fatal', 'error'],
        silent,
    },
);

const logger = winston.createLogger({
    format: winston.format.printf((info) => `${info.message}`),
    exitOnError: false,
    level: logLevel,
    levels: loggingLevels,
    transports: [consoleTransporter],
});

export const clear = (): void => {
    !silent && console.clear();
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

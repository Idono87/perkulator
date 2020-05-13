import winston from 'winston';
import chalk from 'chalk';

const PERKULATOR = 'Perkulator';

const loggingLevels: winston.config.AbstractConfigSetLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5,
};

const consoleTransporter: winston.transports.ConsoleTransportInstance = new winston.transports.Console(
    {
        consoleWarnLevels: ['warn', 'debug'],
        level: 'verbose',
        stderrLevels: ['fatal', 'error'],
    },
);

const logger = winston.createLogger({
    format: winston.format.printf((info) => `${info.message}`),
    exitOnError: false,
    level: 'info',
    levels: loggingLevels,
    transports: [consoleTransporter],
});

export const clear = () => {
    console.clear();
};

export const space = () => {
    console.log('\n\n\n\n');
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

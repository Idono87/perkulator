import winston, { format, LogEntry } from 'winston';
import chalk from 'chalk';

/**
 * Perkulator logging levels.
 */
export type LoggingLevels =
  | 'error'
  | 'warn'
  | 'info'
  | 'verbose'
  | 'debug'
  | 'silly';

/**
 * Typings for creating logging level enums.
 *
 * @internal
 */
export type EnumLoggingLevels = {
  readonly [P in Uppercase<LoggingLevels>]: Lowercase<P>;
};

/**
 * Logging options
 * @internal
 */
export interface LoggingOptions {
  level?: LoggingLevels;
  silent?: boolean;
}

export const Levels: EnumLoggingLevels = Object.freeze({
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
});

const formatter = format.printf(({ level, message }: LogEntry): string => {
  switch (level) {
    case 'error':
      return chalk`{bgRed.black.bold Perkulator Error} {red ${message}}`;
    case 'warn':
      return chalk`{bgYellow.black.bold Perkulator Warning} {yellow ${message}}`;
    case 'info':
      return chalk`{bgGreen.black.bold Perkulator Info} {green ${message}}`;
    case 'debug':
      return chalk`{bgBlue.black.bold Perkulator Debug} {blue ${message}}`;
    default:
      return chalk`{bgWhite.black.bold Perkulator Verbose} {white ${message}}`;
  }
});

const levels: Record<LoggingLevels, number> = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5,
};

export let logger: winston.Logger = configureLogger();

export function configureLogger(options: LoggingOptions = {}): winston.Logger {
  const { level = Levels.INFO, silent = false }: LoggingOptions = options;

  logger = winston.createLogger({
    exitOnError: false,
    format: formatter,
    level,
    levels: levels,
    silent,
    transports: new winston.transports.Console(),
  });

  return logger;
}

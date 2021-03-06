import winston, { format, LogEntry } from 'winston';
import chalk from 'chalk';

export const enum LogLevels {
  EVENT = 'result',
  ERROR = 'error',
  WARNING = 'warn',
  INFO = 'info',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export interface LogOptions {
  logLevel?: LogLevels;
  silent?: boolean;
}

const formatter = format.printf(({ level, message }: LogEntry): string => {
  switch (level) {
    case LogLevels.EVENT:
      return message;
    case LogLevels.ERROR:
      return chalk`{bgRed.black.bold Perkulator Error} {red ${message}}`;
    case LogLevels.WARNING:
      return chalk`{bgYellow.black.bold Perkulator Warning} {yellow ${message}}`;
    case LogLevels.INFO:
      return chalk`{green.bold Perkulator Info:} {green ${message}}`;
    case LogLevels.DEBUG:
      return chalk`{blue.black.bold Perkulator Debug:} {blue ${message}}`;
    default:
      return chalk`{white.bold Perkulator Verbose:} {white ${message}}`;
  }
});

const levels: Record<LogLevels, number> = {
  result: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

export let logger: winston.Logger = configureLogger();

export function configureLogger(options: LogOptions = {}): winston.Logger {
  const envSilent = Boolean(process.env.PERKULATOR_LOG_SILENT);

  const {
    logLevel: level = LogLevels.INFO,
    silent = envSilent,
  }: LogOptions = options;

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

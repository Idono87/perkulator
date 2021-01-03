export type LoggingLevels =
  | 'error'
  | 'warn'
  | 'info'
  | 'verbose'
  | 'debug'
  | 'silly';

export type EnumLoggingLevels = {
  readonly [P in Uppercase<LoggingLevels>]: Lowercase<P>;
};

export interface LoggingOptions {
  level?: LoggingLevels;
  silent?: boolean;
}

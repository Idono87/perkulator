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

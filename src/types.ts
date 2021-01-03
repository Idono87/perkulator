import type { WatchOptions } from 'chokidar';

/**
 * Configuration object for the FileWatcher
 */
export type FileWatcherOptions = {
  /** Path(s) to watch for changes */
  paths?: string | readonly string[];

  /** Called when any changes have occurred. */
  onChange: OnChangeEvent;

  /**
   * The number of milliseconds another change can occur before onchange is called.
   * Is reset after each change.
   */
  onChangeTimeout?: number;
} & WatchOptions;

export type OnChangeEvent = (paths: readonly string[]) => void;

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

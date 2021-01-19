import type { WatchOptions as FSWatcherOptions } from 'chokidar';
import type { TaskResultCode } from './task/enum-task-result-code';

/**
 * Perkulator configuration interface
 */
export interface PerkulatorOptions {
  watcher?: WatcherOptions;
  tasks: TaskOptions[];
}

/**
 * Task configurations object
 */
export interface TaskOptions {
  readonly path: string;
}

/**
 * Proxy response object.
 *
 * @internal
 */
export interface TaskResults {
  resultCode: TaskResultCode;
  errors?: string[];
  results?: string[];
}

/**
 * Interface for a runnable task.
 */
export interface RunnableTask {
  run: (changedPaths: ChangedPaths) => Promise<TaskResultObject>;
  stop: () => Promise<void>;
}

/**
 * Expected runnable task response object.
 */
export interface TaskResultObject {
  errors?: Error[];
  results?: Object[];
}

/**
 * Watcher configuration interface
 */
export interface WatcherOptions
  extends Pick<
    FSWatcherOptions,
    'useFsEvents' | 'depth' | 'interval' | 'binaryInterval' | 'awaitWriteFinish'
  > {
  include?: string[];
  exclude?: string[];
}

/**
 * internal configuration options for the FileWatcher
 *
 * @internal
 */
export interface FileWatcherOptions extends WatcherOptions {
  /** Called when any changes have occurred. */
  onChange: OnChangeEvent;

  /**
   * The number of milliseconds another change can occur before onchange is called.
   * Is reset after each change.
   */
  onChangeTimeout?: number;
}

/**
 * Changed paths object.
 *
 * @internal
 */
export type ChangedPaths = Record<'add' | 'change' | 'remove', string[]>;

/**
 * File watcher on change event signatures.
 *
 * @internal
 */
export type OnChangeEvent = (changedPaths: ChangedPaths) => void;

/**
 * Return when a property fails validation.
 *
 * @internal
 */
export interface FailedValidationObject {
  property: string;
  expected: string;
  actual: any;
}

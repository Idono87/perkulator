import type { WatchOptions } from 'chokidar';
import type { TaskResultCode } from './task/enum-task-result-code';

export interface PerkulatorOptions {
  paths?: string[];
  tasks?: TaskOptions[];
}

export interface TaskOptions {
  readonly path: string;
}

export interface TaskResults {
  resultCode: TaskResultCode;
  errors?: string[];
  results?: string[];
}

export interface RunnableTask {
  run: () => Promise<TaskResultObject>;
  stop: () => Promise<void>;
}

export interface TaskResultObject {
  errors?: Error[];
  results?: Object[];
}

/**
 * Configuration object for the FileWatcher
 *
 * @internal
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

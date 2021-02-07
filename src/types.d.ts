import type { WatchOptions as FSWatcherOptions } from 'chokidar';

import type {
  TaskDirective,
  TaskProcessDirective,
} from '~/task/enum-task-directive';
import type {
  TaskEventType,
  TaskProcessEventType,
} from '~/task/enum-task-event-type';

/**
 * Perkulator configuration interface
 */
export interface PerkulatorOptions {
  watcher?: WatcherOptions;
  tasks: TaskOptions[];
}

/**
 * Runnable task config passed to the task module
 */
export interface RunnableTaskOptions {
  [prop: string]: any;
}

/**
 * Task configurations object
 */
export interface TaskOptions {
  readonly module: string;
  readonly fork?: boolean;
  readonly persistent?: boolean;
  readonly include?: string[];
  readonly exclude?: string[];
  readonly options?: RunnableTaskOptions;
}

export interface TaskGroupOptions {
  tasks: TaskOptions[];
}

/**
 * Expected runnable task response object.
 */
export interface TaskResultsObject {
  errors?: string[];
  results?: string[];
}

/** Update listener passed to  */
export type UpdateListener = (update: any) => void;

/**
 * Interface for a runnable task.
 */
export interface RunnableTask {
  run: (
    changedPaths: ChangedPaths,
    update: UpdateListener,
    options?: RunnableTaskOptions,
  ) => Promise<TaskResultsObject> | TaskResultsObject | undefined;
  stop: () => void;
}

export type TaskEventListener = (event: TaskEvent) => void;

/**
 * Runnable interface for tasks
 */
export interface TaskRunnableInterface {
  run: (changedPaths: ChangedPaths) => void | Promise<void>;
  stop: () => void;
}

/**
 * Directives sent from the application to the task
 */
export type TaskDirectiveMessage =
  | {
      directive: TaskDirective.run;
      changedPaths: ChangedPaths;
    }
  | {
      directive: TaskDirective.stop;
    };

/**
 * Directives sent from the application to the task
 */
export type TaskProcessDirectiveMessage =
  | {
      directive: TaskProcessDirective.exit;
    }
  | {
      directive: TaskProcessDirective.start;
      options: TaskOptions;
    }
  | TaskDirectiveMessage;

/**
 * Messages sent from the task to the application
 */
export type TaskEvent =
  | {
      eventType: TaskEventType.result;
      result?: TaskResultsObject;
    }
  | {
      eventType: TaskEventType.update;
      update: any;
    }
  | {
      eventType: TaskEventType.error;
      error: Error;
    }
  | {
      eventType: TaskEventType.stop | TaskEventType.skipped;
    };

/**
 * Messages sent from the task child process to the task process adapter
 */
export type TaskProcessEvent =
  | {
      eventType: TaskProcessEventType.ready;
    }
  | TaskEvent;

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

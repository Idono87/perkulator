import anymatch, { Tester } from 'anymatch';

import WorkerTask from '~/worker/worker-task';
import WorkerPool from '~/worker/worker-pool';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskResultsObject } from './task-proxy';
import type {
  Runner,
  RunnerEventMethods,
  RunnerEventListener,
} from '~/task/task-manager';

/**
 * Runnable task config passed to the task module
 */

export interface RunnableTaskOptions {
  [prop: string]: any;
}
/**
 * Configuration interface for a single runnable task.
 */

export interface TaskOptions {
  readonly module: string;
  readonly fork?: boolean;
  readonly persistent?: boolean;
  readonly include?: string[];
  readonly exclude?: string[];
  readonly options?: RunnableTaskOptions;
}

type TaskRunnerEventListener = RunnerEventListener<TaskEvent>;

/**
 * Task runner event typings
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

export const enum TaskEventType {
  error = 'error',
  update = 'update',
  result = 'result',
  skipped = 'skipped',
  stop = 'stop',
}

/**
 * Responsible for running the task.
 *
 * @internal
 */
export default class TaskRunner
  implements Runner, RunnerEventMethods<TaskEvent> {
  /** Task configuration object */
  private readonly options: TaskOptions;
  private readonly workerPool: WorkerPool;

  /** Path filter methods */
  private readonly includeTester: Tester;
  private readonly excludeTester: Tester;

  /** Object method/function listening for events */
  private taskEventListener: TaskRunnerEventListener | null = null;

  private activeWorkerTask: WorkerTask | null = null;

  public constructor(options: TaskOptions, workerPool: WorkerPool) {
    this.options = options;
    this.workerPool = workerPool;

    this.includeTester = anymatch(this.options.include ?? ['**/*']);
    this.excludeTester = anymatch(this.options.exclude ?? []);
  }

  /**
   * Set/replace the task event listener
   *
   * @param listener
   */
  public setRunnerEventListener(listener: TaskRunnerEventListener): void {
    this.taskEventListener = listener;
  }

  /**
   * Removes the set task event listener
   */
  public removeRunnerEventListener(): void {
    this.taskEventListener = null;
  }

  public async run({ add, remove, change }: ChangedPaths): Promise<void> {
    if (this.activeWorkerTask !== null) {
      // TODO: Add proper error
      throw new Error('Task is already running.');
    }

    const filteredPaths: ChangedPaths = {
      add: this.filterPaths(add),
      remove: this.filterPaths(remove),
      change: this.filterPaths(change),
    };

    const pathCount =
      filteredPaths.add.length +
      filteredPaths.remove.length +
      filteredPaths.change.length;

    if (pathCount === 0) {
      this.taskEventListener?.({
        eventType: TaskEventType.skipped,
      });
      return;
    }

    await new Promise<void>((resolve) => {
      const handleWorkerEvent = (event: TaskEvent): void => {
        if (
          event.eventType === TaskEventType.result ||
          event.eventType === TaskEventType.stop ||
          event.eventType === TaskEventType.error
        ) {
          this.activeWorkerTask = null;
          resolve();
        }

        this.taskEventListener?.(event);
      };

      this.activeWorkerTask = new WorkerTask(
        this.options,
        filteredPaths,
        handleWorkerEvent,
      );

      this.workerPool.runTask(this.activeWorkerTask);
    });
  }

  /**
   * Attempts to stop the running task.
   * If the attempt fails a TaskTerminationTimeoutError
   * is sent back through the generator
   */
  public stop(): void {
    if (this.activeWorkerTask !== null) {
      this.activeWorkerTask.stop();
    }
  }

  /**
   * Filter out all paths that do not match the included
   * and excluded paths.
   *
   * @param paths
   */
  private filterPaths(paths: string[]): string[] {
    return paths.filter((path) => {
      return this.includeTester(path) && !this.excludeTester(path);
    });
  }
}

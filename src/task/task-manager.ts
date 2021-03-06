import TaskRunner, { TaskEventType } from '../task/task-runner';
import TaskRunningError from '../errors/task-running-error';
import GroupRunner, { GroupEventType } from './group-runner';
import { logger, LogLevels } from '../logger';

import type { GroupEvent } from '../task/group-runner';
import type { TaskResultsObject } from '../task/task-proxy';
import type { ChangedPaths } from '../file-watcher/file-watcher';
import type { TaskRunnableOptions } from '../perkulator';
import type { TaskEvent } from '../task/task-runner';
import type WorkerPool from '../worker/worker-pool';

type RunnerEvent = TaskEvent | GroupEvent;
type RunnerObject = Runner & RunnerEventMethods<RunnerEvent>;

export interface Runner {
  run: (changedPaths: ChangedPaths) => void | Promise<void>;
  stop: () => void;
}

export type RunnerEventListener<T> = (event: T) => void;

export interface RunnerEventMethods<T> {
  setRunnerEventListener: (listener: RunnerEventListener<T>) => void;
  removeRunnerEventListener: () => void;
}

/**
 * Manages all the registered tasks.
 *
 * @internal
 */
export default class TaskManager {
  /** An ordered set of tasks */
  private readonly tasks: RunnerObject[] = [];

  /** Is running semaphore  */
  private isRunning: boolean = false;

  /** Is stopping semaphore  */
  private isStopping: boolean = false;

  /** The running task */
  private runningTaskObject: RunnerObject | null = null;

  private constructor(
    taskOptionsList: TaskRunnableOptions[],
    workerPool: WorkerPool,
  ) {
    this.createTasks(taskOptionsList, workerPool);
  }

  public static create(
    taskOptionsList: TaskRunnableOptions[],
    workerPool: WorkerPool,
  ): TaskManager {
    return new TaskManager(taskOptionsList, workerPool);
  }

  /**
   * Runs all the tasks in configured order.
   */
  public async run(changedPaths: ChangedPaths): Promise<boolean> {
    if (this.isStopping || this.isRunning) {
      throw new TaskRunningError('Tasks are already running.');
    }

    this.isRunning = true;

    for (const task of this.tasks) {
      if (this.isStopping) {
        break;
      }

      logger.log(
        LogLevels.INFO,
        `Running ${
          task instanceof TaskRunner ? 'task' : 'group'
        } "${'TaskName'}"`,
      );

      this.runningTaskObject = task;

      const pendingResults = new Promise<void>((resolve) => {
        task.setRunnerEventListener((event: RunnerEvent): void => {
          switch (event.eventType) {
            case TaskEventType.error:
              this.handleError(event.error);
              resolve();
              break;
            case TaskEventType.result:
              this.handleResult(event.result);
              resolve();
              break;
            case TaskEventType.stop:
              this.handleStop('Task');
              resolve();
              break;
            case TaskEventType.skipped:
              this.handleSkipped('Task');
              resolve();
              break;
            case TaskEventType.update:
              this.handleUpdate(event.update);
              break;
            case GroupEventType.result:
              this.handleResult(event.result);
              break;
            case GroupEventType.skipped:
              this.handleSkipped('Task');
              break;
            case GroupEventType.stop:
              this.handleStop('Task');
              break;
          }
        });
      });

      await task.run(changedPaths);
      await pendingResults;
      task.removeRunnerEventListener();
    }

    const isSuccessful = !this.isStopping;

    this.isRunning = false;
    this.isStopping = false;
    this.runningTaskObject = null;

    return isSuccessful;
  }

  private handleResult(result?: TaskResultsObject): void {
    if (result?.errors !== undefined && result.errors.length > 0) {
      this.isStopping = true;

      result.errors.forEach((message) => {
        logger.log(LogLevels.EVENT, message);
      });
    } else if (result?.results !== undefined) {
      result.results.forEach((message) => {
        logger.log(LogLevels.EVENT, message);
      });
    }
  }

  private handleError(error: Error): void {
    logger.log(LogLevels.ERROR, error);
    this.isStopping = true;
  }

  private handleStop(taskName: string): void {
    logger.log(LogLevels.INFO, `Task "${taskName}" has been stopped`);
  }

  private handleSkipped(taskName: string): void {
    logger.log(LogLevels.INFO, `Task "${taskName}" has been skipped`);
  }

  private handleUpdate(update: string): void {
    logger.log(LogLevels.INFO, update);
  }

  /**
   * Creates a list of tasks in configured order.
   *
   * @param taskOptions
   */
  private createTasks(
    taskOptionsList: TaskRunnableOptions[],
    workerPool: WorkerPool,
  ): void {
    for (const taskOptions of taskOptionsList) {
      if ('module' in taskOptions) {
        this.tasks.push(new TaskRunner(taskOptions, workerPool));
      } else {
        this.tasks.push(GroupRunner.create(taskOptions, workerPool));
      }
    }
  }

  /**
   * Terminates the current run.
   */
  public stop(): void {
    if (this.isRunning) {
      this.isStopping = true;
      this.runningTaskObject?.stop();
    }
  }
}

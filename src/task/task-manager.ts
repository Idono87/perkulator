import TaskRunner, { TaskEventType } from '~/task/task-runner';
import TaskRunningError from '~/errors/task-running-error';
import GroupRunner, { GroupEventType } from './group-runner';

import type { GroupEvent } from '~/task/group-runner';
import type { TaskResultsObject } from '~/task/task-proxy';
import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskRunnableOptions } from '~/perkulator';
import type { TaskEvent } from '~/task/task-runner';

type TRunnableTaskEvent = TaskEvent | GroupEvent;
type TRunnableTask = TaskRunnableInterface &
  RunnerEventInterface<TRunnableTaskEvent>;

export interface TaskRunnableInterface {
  run: (changedPaths: ChangedPaths) => void | Promise<void>;
  stop: () => void;
}

export type RunnerEventListener<T> = (event: T) => void;

export interface RunnerEventInterface<T> {
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
  private readonly tasks: TRunnableTask[] = [];

  /** Is running semaphore  */
  private isRunning: boolean = false;

  /** Is stopping semaphore  */
  private isStopping: boolean = false;

  /** The running task */
  private runningTaskObject: TRunnableTask | null = null;

  private constructor(taskOptionsList: TaskRunnableOptions[]) {
    this.createTasks(taskOptionsList);
  }

  public static create(taskOptionsList: TaskRunnableOptions[]): TaskManager {
    return new TaskManager(taskOptionsList);
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

      this.runningTaskObject = task;

      const pendingResults = new Promise<void>((resolve) => {
        task.setRunnerEventListener((event: TRunnableTaskEvent): void => {
          // TODO: Handle all events
          switch (event.eventType) {
            case TaskEventType.error:
              this.isStopping = true;
              resolve();
              break;
            case TaskEventType.result:
              event.result !== undefined && this.handleResult(event.result);
              resolve();
              break;
            case TaskEventType.stop:
              resolve();
              break;
            case TaskEventType.skipped:
              resolve();
              break;
            case TaskEventType.update:
              break;
            case GroupEventType.result:
              event.result !== undefined && this.handleResult(event.result);
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

  private handleResult(result: TaskResultsObject): void {
    if (result.errors !== undefined && result.errors.length > 0) {
      this.isStopping = true;
    }

    // TODO: Log errors and results.
  }

  /**
   * Creates a list of tasks in configured order.
   *
   * @param taskOptions
   */
  private createTasks(taskOptionsList: TaskRunnableOptions[]): void {
    for (const taskOptions of taskOptionsList) {
      if ('module' in taskOptions) {
        this.tasks.push(TaskRunner.create(taskOptions));
      } else {
        this.tasks.push(GroupRunner.create(taskOptions));
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

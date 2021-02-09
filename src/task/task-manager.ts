import TaskRunner from './task-runner';
import { TaskEventType } from '~/task/enum-task-event-type';

import type {
  ChangedPaths,
  TaskRunnableInterface,
  TaskEvent,
  TaskOptions,
  TaskResultsObject,
} from '~/types';
import TaskRunningError from '~/errors/task-running-error';

/**
 * Manages all the registered tasks.
 *
 * @internal
 */
export default class TaskManager {
  /** An ordered set of tasks */
  private readonly tasks: TaskRunner[] = [];

  /** Is running semaphore  */
  private isRunning: boolean = false;

  /** Is stopping semaphore  */
  private isStopping: boolean = false;

  /** The running task */
  private runningTaskObject: TaskRunnableInterface | null = null;

  private constructor(taskOptionsList: TaskOptions[]) {
    this.createTasks(taskOptionsList);
  }

  public static create(taskOptionsList: TaskOptions[]): TaskManager {
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
        task.setTaskEventListener((event: TaskEvent): void => {
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
          }
        });
      });

      await task.run(changedPaths);
      await pendingResults;
      task.removeTaskEventListener();
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
  private createTasks(taskOptionsList: TaskOptions[]): void {
    for (const taskOptions of taskOptionsList) {
      this.tasks.push(TaskRunner.create(taskOptions));
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

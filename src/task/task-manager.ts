import TaskRunner from './task-runner';
import { TaskEventType } from '~/task/enum-task-event-type';

import type { ChangedPaths, TaskOptions, TaskResultsObject } from '~/types';
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
  private runningTask: TaskRunner | null = null;

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

      const messageIterator = await task.run(changedPaths);
      this.runningTask = messageIterator === null ? null : task;

      if (messageIterator !== null) {
        for await (const message of messageIterator) {
          if (message.eventType === TaskEventType.error) {
            // TODO: Log
            this.isStopping = true;
            break;
          } else if (message.eventType === TaskEventType.result) {
            message.result !== undefined && this.handleResult(message.result);
            break;
          } else if (message.eventType === TaskEventType.stop) {
            // TODO: Log
            break;
          }

          // TODO: Log update
        }
      }
    }

    const isSuccessful = !this.isStopping;

    this.isRunning = false;
    this.isStopping = false;
    this.runningTask = null;

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
      this.runningTask?.stop();
    }
  }
}

import Task from './task';
import { TaskResultCode } from '~/task/enum-task-result-code';
import type { TaskOptions } from '~/types';

/**
 * Manages all the registered tasks.
 *
 * @internal
 */
export default class TaskManager {
  /*
   * An ordered set of tasks.
   */
  private readonly registeredTasks: Set<Task> = new Set();
  private pendingRun: Promise<TaskResultCode> | undefined = undefined;
  private runningTask: Task | undefined = undefined;
  private terminateRun: boolean = false;

  /**
   * Appends a task to the list of tasks.
   *
   * @param taskOptions
   */
  public addTask(taskOptions: TaskOptions): void {
    this.registeredTasks.add(Task.createTask(taskOptions));
  }

  /**
   * Starts all the tasks in configured order.
   */
  public async run(): Promise<TaskResultCode> {
    if (!this.terminateRun && this.pendingRun !== undefined) {
      await this.stop();
    }

    const result = await (this.pendingRun = this.runTasks());
    this.pendingRun = undefined;
    this.terminateRun = false;
    return result;
  }

  /**
   * Loops through all the tasks and performs appropriate
   * action once a task is finished.
   */
  private async runTasks(): Promise<TaskResultCode> {
    for (const task of this.registeredTasks) {
      this.runningTask = task;
      const result = await task.run();
      this.runningTask = undefined;

      // IMPORTANT: Do not remove the "terminateRun" flag!
      // It prevents further tasks from being executed if
      // there's a race condition between the running task
      // completing or being told to terminate.
      if (
        this.terminateRun ||
        result.resultcode === TaskResultCode.Terminated
      ) {
        return TaskResultCode.Terminated;
      }

      if (result.resultcode === TaskResultCode.Error) {
        // TODO: Log Error.
        return TaskResultCode.Error;
      }
      // TODO: Log finished results.
    }

    return TaskResultCode.Finished;
  }

  /**
   * Terminates the current run.
   */
  public async stop(): Promise<void> {
    this.terminateRun = true;
    await this.runningTask?.stop();
  }
}

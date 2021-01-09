import Task from './task';
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
  private runningTask: Task | undefined = undefined;

  /**
   * Appends a task to the list of tasks.
   *
   * @param taskOptions
   */
  public addTask(taskOptions: TaskOptions): void {
    this.registeredTasks.add(Task.createTask(taskOptions));
  }

  public async run(): Promise<void> {
    for (const task of this.registeredTasks) {
      this.runningTask = task;
      await task.run();
    }
  }

  public async stop(): Promise<void> {}
}

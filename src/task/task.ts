import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import MissingInterfaceError from '~/errors/missing-interface-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import type { RunnableTask, TaskOptions } from '~/types';

const STOP_TIMEOUT = 3000;
const ERR_MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

/**
 * A Task object is responsible for the configuration and lifecycle
 * of a runnable task module.
 *
 * @internal
 */
export default class Task {
  private readonly options: TaskOptions;
  private readonly taskModule: RunnableTask;
  private pendingRun: Promise<void> | undefined;

  private constructor(options: TaskOptions, taskModule: RunnableTask) {
    this.options = options;
    this.taskModule = taskModule;
  }

  /**
   * Create and return a task object.
   *
   * @param options
   * @throws {TaskModuleNotFoundError} Module could not be resolved.
   * @throws {InvalidRunnableTaskError} Module does not implement runnable task interface
   */
  public static createTask(options: TaskOptions): Task {
    let taskModule: RunnableTask;
    try {
      taskModule = require(options.path);
    } catch (err) {
      if (err.code === ERR_MODULE_NOT_FOUND) {
        throw new TaskModuleNotFoundError(options.path);
      }
      throw err;
    }

    if (typeof taskModule.runTask !== 'function') {
      throw new InvalidRunnableTaskError(options.path);
    }

    return new Task(options, taskModule);
  }

  /**
   * Run the task.
   */
  public async run(): Promise<void> {
    this.pendingRun = this.taskModule.runTask();
    await this.pendingRun;
  }

  /**
   * Sends a stop signal to the running module.
   * Will throw if the attempt to stop the
   * task timed out or the no "stopTask" interface was found.
   *
   * @throws {TaskTerminationTimeoutError}
   * @throws {MissingInterfaceError}
   */
  public async stop(): Promise<void> {
    if (this.pendingRun !== undefined) {
      await new Promise<void>((resolve, reject) => {
        if (typeof this.taskModule.stopTask !== 'function') {
          return reject(new MissingInterfaceError('stopTask'));
        }

        const timeout = setTimeout(
          () => reject(new TaskTerminationTimeoutError()),
          STOP_TIMEOUT,
        );

        Promise.all([this.taskModule.stopTask(), this.pendingRun])
          .then(() => resolve())
          .catch(reject)
          .finally(() => {
            clearTimeout(timeout);
          });
      });
    }
  }
}

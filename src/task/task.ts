import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import MissingInterfaceError from '~/errors/missing-interface-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import type { RunnableTask, TaskOptions, TaskResults } from '~/types';

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
  private pendingRun: Promise<TaskResults> | undefined;

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
  public async run(): Promise<TaskResults> {
    this.pendingRun = this.taskModule.runTask();
    return await this.pendingRun;
  }

  /**
   * Sends a stop signal to the running module.
   * Will throw if the attempted termination times out.
   * Will also throw if "stopTask" is not implemented.
   *
   * @throws {TaskTerminationTimeoutError}
   * @throws {MissingInterfaceError}
   */
  public async stop(): Promise<void> {
    if (this.pendingRun !== undefined) {
      if (typeof this.taskModule.stopTask !== 'function') {
        throw new MissingInterfaceError('stopTask');
      }

      let cancelTimeout: (() => void) | undefined;

      const pendingTimeout = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new TaskTerminationTimeoutError()),
          STOP_TIMEOUT,
        );

        cancelTimeout = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      const pendingTermination = Promise.all([
        this.taskModule.stopTask(),
        this.pendingRun,
      ]).then(cancelTimeout);

      await Promise.all([pendingTimeout, pendingTermination]);
    }
  }
}

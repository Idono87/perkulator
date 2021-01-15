import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import type { ChangedPaths, TaskOptions, TaskResults } from '~/types';
import TaskProxy from './task-proxy';

const STOP_TIMEOUT = 3000;

/**
 * A Task object is responsible for the configuration and lifecycle
 * of a runnable task module.
 *
 * @internal
 */
export default class Task {
  private readonly options: TaskOptions;
  private readonly taskProxy: TaskProxy;
  private pendingRun: Promise<TaskResults> | undefined;

  private constructor(options: TaskOptions) {
    this.options = options;
    this.taskProxy = TaskProxy.create(options.path, {});
  }

  /**
   * Create and return a task object.
   *
   * @param options
   */
  public static createTask(options: TaskOptions): Task {
    return new Task(options);
  }

  /**
   * Run the task.
   */
  public async run(changedPaths: ChangedPaths): Promise<TaskResults> {
    this.pendingRun = this.taskProxy.runTask(changedPaths);
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
        this.taskProxy.stopTask(),
        this.pendingRun,
      ]).then(cancelTimeout);

      await Promise.all([pendingTimeout, pendingTermination]);
    }
  }
}

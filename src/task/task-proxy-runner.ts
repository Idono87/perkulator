import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import TaskProxy from './task-proxy';
import type {
  ChangedPaths,
  TaskOptions,
  TaskResults,
  TaskRunnableInterface,
} from '~/types';

const STOP_TIMEOUT = 3000;

/**
 * Runs the task in the main application loop.
 *
 * @internal
 */
export default class TaskProxyRunner implements TaskRunnableInterface {
  private readonly options: TaskOptions;
  private readonly taskProxy: TaskProxy;
  private pendingRun: Promise<TaskResults> | undefined;

  public constructor(options: TaskOptions) {
    this.options = options;
    this.taskProxy = TaskProxy.create(options.module, {});
  }

  public static create(options: TaskOptions): TaskProxyRunner {
    return new TaskProxyRunner(options);
  }

  /**
   * Run the task.
   *
   * @param changedPaths
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

import anymatch, { Tester } from 'anymatch';

import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import { TaskResultCode } from './enum-task-result-code';
import TaskProxy from './task-proxy';
import type { ChangedPaths, TaskOptions, TaskResults } from '~/types';

const STOP_TIMEOUT = 3000;

/**
 * A Task object is responsible for the configuration and lifecycle
 * of a runnable task module.
 *
 * @internal
 */
export default class TaskRunner {
  private readonly options: TaskOptions;
  private readonly taskProxy: TaskProxy;
  private pendingRun: Promise<TaskResults> | undefined;
  private readonly includeTester: Tester;
  private readonly excludeTester: Tester;

  private constructor(options: TaskOptions) {
    this.options = options;
    this.includeTester = anymatch(this.options.include ?? ['**/*']);
    this.excludeTester = anymatch(this.options.exclude ?? []);
    this.taskProxy = TaskProxy.create(options.module, {});
  }

  /**
   * Create and return a task object.
   *
   * @param options
   */
  public static createTask(options: TaskOptions): TaskRunner {
    return new TaskRunner(options);
  }

  /**
   * Run the task.
   */
  public async run({
    add,
    remove,
    change,
  }: ChangedPaths): Promise<TaskResults> {
    const filteredPaths: ChangedPaths = {
      add: this.filterPaths(add),
      remove: this.filterPaths(remove),
      change: this.filterPaths(change),
    };

    const pathCount =
      filteredPaths.add.length +
      filteredPaths.remove.length +
      filteredPaths.change.length;

    if (pathCount === 0) {
      return { resultCode: TaskResultCode.Skipped };
    }

    this.pendingRun = this.taskProxy.runTask(filteredPaths);
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

  /**
   * Filter out all paths that do not match the included
   * and excluded paths.
   *
   * @param paths
   * @internal
   */
  private filterPaths(paths: string[]): string[] {
    return paths.filter((path) => {
      return this.includeTester(path) && !this.excludeTester(path);
    });
  }
}

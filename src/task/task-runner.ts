import anymatch, { Tester } from 'anymatch';

import { TaskResultCode } from './enum-task-result-code';
import type {
  ChangedPaths,
  TaskOptions,
  TaskResults,
  TaskRunnableInterface,
} from '~/types';
import TaskProxyRunner from './task-proxy-runner';

/**
 * TaskRunner is responsible for the configuration and lifecycle
 * of a task module.
 *
 * @internal
 */
export default class TaskRunner {
  /** Task configuration object */
  private readonly options: TaskOptions;

  /** Path filter methods */
  private readonly includeTester: Tester;
  private readonly excludeTester: Tester;

  /** */
  private readonly taskRunner: TaskRunnableInterface;

  private constructor(options: TaskOptions) {
    this.options = options;
    this.includeTester = anymatch(this.options.include ?? ['**/*']);
    this.excludeTester = anymatch(this.options.exclude ?? []);
    this.taskRunner = TaskProxyRunner.create(options);
  }

  /**
   * Create and return a task runner object.
   *
   * @param options
   */
  public static createTask(options: TaskOptions): TaskRunner {
    return new TaskRunner(options);
  }

  /**
   * Run the task if there are any relevant paths after
   * filtering out any unwanted paths.
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

    return await this.taskRunner.run(filteredPaths);
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
    return await this.taskRunner.stop();
  }

  /**
   * Filter out all paths that do not match the included
   * and excluded paths.
   *
   * @param paths
   */
  private filterPaths(paths: string[]): string[] {
    return paths.filter((path) => {
      return this.includeTester(path) && !this.excludeTester(path);
    });
  }
}

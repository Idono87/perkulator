import cloneDeep from 'lodash.clonedeep';

import FileWatcher from './file-watcher/file-watcher';
import { PerkulatorOptions } from './types';
import validateOptions from './config/validation';
import TaskManager from './task/task-manager';

import type { ChangedPaths } from '~/types';

export default class Perkulator {
  /** File watcher instance */
  private readonly fileWatcher: FileWatcher;

  /** Task manager instance */
  private readonly taskManager: TaskManager;

  /** Instance of all the options */
  private readonly options: PerkulatorOptions;

  /** Currently running task execution */
  private pendingRun: Promise<void> | null = null;

  /** A pending restart waiting for the active task to stop */
  private pendingRestart: Promise<void> | null = null;

  private constructor(options: PerkulatorOptions) {
    this.options = options;
    this.taskManager = TaskManager.create(this.options.tasks);
    this.fileWatcher = FileWatcher.watch({
      onChange: this.fileChangeHandler.bind(this),
      ...options.watcher,
    });
  }

  /**
   * Creates and runs perkulator.
   *
   * @param options
   */
  public static watch(options: PerkulatorOptions): Perkulator {
    validateOptions(options);
    const consolidatedOptions = cloneDeep(options);
    Object.freeze(consolidatedOptions);

    const perkulator = new Perkulator(consolidatedOptions);

    return perkulator;
  }

  /**
   * Terminate perkulator.
   */
  public async close(): Promise<void> {
    this.taskManager.stop();
    await this.pendingRun;
    return await this.fileWatcher.close();
  }

  /**
   * Handle file changes.
   *
   * @internal
   */
  private fileChangeHandler(changedPaths: ChangedPaths): void {
    if (this.pendingRun !== null && this.pendingRestart === null) {
      this.pendingRestart = this.pendingRun.then(() => {
        this.pendingRestart = null;
        this.pendingRun = this.run(changedPaths);
      });

      this.taskManager.stop();
    } else if (this.pendingRun === null) {
      this.pendingRun = this.run(changedPaths);
    }
  }

  /**
   * Runs the task manager
   *
   * @internal
   */
  private async run(
    changedPaths = this.fileWatcher.changedPaths,
  ): Promise<void> {
    const isSuccessfull = await this.taskManager.run(changedPaths);

    if (isSuccessfull) {
      this.fileWatcher.clear();
    }

    this.pendingRun = null;
  }
}

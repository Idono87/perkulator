import cloneDeep from 'lodash.clonedeep';

import FileWatcher from './file-watcher/file-watcher';
import validateOptions from './config/validation';
import TaskManager from './task/task-manager';

import type { ChangedPaths, WatcherOptions } from './file-watcher/file-watcher';
import type { TaskOptions } from './task/task-runner';
import type { GroupOptions } from './task/group-runner';
import {
  initWorkerPool,
  getWorkerPool,
  WorkerPoolOptions,
} from './worker/worker-pool';
import { logger, LogLevels } from './logger';

export type TaskRunnableOptions = TaskOptions | GroupOptions;

/**
 * Perkulator configuration interface
 */

export interface PerkulatorOptions {
  watcher?: WatcherOptions;
  tasks: TaskRunnableOptions[];
  workerPool?: WorkerPoolOptions;
}

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
  private isRestarting: boolean = false;

  private constructor(options: PerkulatorOptions) {
    this.options = options;

    const poolSize = this.options.workerPool?.poolSize;
    initWorkerPool(poolSize === undefined ? 1 : poolSize);

    this.taskManager = TaskManager.create(this.options.tasks);

    this.fileWatcher = FileWatcher.watch({
      onChange: this.handleChangeEvents.bind(this),
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
    await this.fileWatcher.close();
    await getWorkerPool().terminateAllWorkers();
  }

  private handleChangeEvents(changedPaths: ChangedPaths): void {
    logger.log(LogLevels.INFO, 'Detected file changes');

    if (this.pendingRun === null) {
      logger.log(LogLevels.INFO, 'Starting tasks');
      this.pendingRun = this.run(changedPaths);
    } else {
      this.isRestarting = true;
      this.taskManager.stop();
    }
  }

  private async run(
    changedPaths = this.fileWatcher.changedPaths,
  ): Promise<void> {
    const isSuccessful = await this.taskManager.run(changedPaths);

    if (isSuccessful) {
      this.fileWatcher.clear();
    }

    this.isRestarting && logger.log(LogLevels.INFO, 'Restarting tasks');
    this.pendingRun = this.isRestarting ? this.run() : null;
    this.isRestarting = false;
  }
}

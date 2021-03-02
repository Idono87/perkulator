import cloneDeep from 'lodash.clonedeep';

import FileWatcher from './file-watcher/file-watcher';
import validateOptions from './config/validation';
import TaskManager from './task/task-manager';

import type { ChangedPaths, WatcherOptions } from './file-watcher/file-watcher';
import type { TaskOptions } from './task/task-runner';
import type { GroupOptions } from './task/group-runner';
import WorkerPool, { WorkerPoolOptions } from './worker/worker-pool';

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

  private readonly workerPool: WorkerPool;

  /** Instance of all the options */
  private readonly options: PerkulatorOptions;

  /** Currently running task execution */
  private pendingRun: Promise<void> | null = null;

  /** A pending restart waiting for the active task to stop */
  private isRestarting: boolean = false;

  private constructor(options: PerkulatorOptions) {
    this.options = options;

    const poolSize = this.options.workerPool?.poolSize;
    this.workerPool = new WorkerPool(poolSize === undefined ? 1 : poolSize);

    this.taskManager = TaskManager.create(this.options.tasks, this.workerPool);

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
    await this.workerPool.terminateAllWorkers();
  }

  private handleChangeEvents(changedPaths: ChangedPaths): void {
    if (this.pendingRun === null) {
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

    this.pendingRun = this.isRestarting ? this.run() : null;
    this.isRestarting = false;
  }
}

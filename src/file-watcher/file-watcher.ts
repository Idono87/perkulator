import { watch, FSWatcher, WatchOptions as FSWatcherOptions } from 'chokidar';

import { logger, LogLevels } from '../logger';

/**
 * Changed paths object.
 *
 * @internal
 */

export type ChangedPaths = Record<'add' | 'change' | 'remove', string[]>;

/**
 * File watcher on change event signatures.
 *
 * @internal
 */

export type OnChangeEvent = (changedPaths: ChangedPaths) => void;

/**
 * internal configuration options for the FileWatcher
 *
 * @internal
 */
export interface FileWatcherOptions extends WatcherOptions {
  /** Called when any changes have occurred. */
  onChange: OnChangeEvent;

  /**
   * The number of milliseconds another change can occur before onchange is called.
   * Is reset after each change.
   */
  onChangeTimeout?: number;
}

/**
 * Watcher configuration interface
 */
export interface WatcherOptions
  extends Pick<
    FSWatcherOptions,
    'useFsEvents' | 'depth' | 'interval' | 'binaryInterval' | 'awaitWriteFinish'
  > {
  include?: string[];
  exclude?: string[];
}

export const enum FileEvents {
  Add,
  Change,
  Remove,
}

/**
 *
 * Reports any file changes and fires appropriate events.
 *
 * Internally the filewatcher keeps track of changes through a list unique of paths.
 *
 * @internal
 *
 */
export default class FileWatcher {
  private readonly changeList: Map<string, FileEvents>;
  private readonly onChange: OnChangeEvent;
  private readonly onChangeTimeout: number;
  private onChangeTimer: NodeJS.Timeout | undefined;
  private readonly watcher: FSWatcher;
  private isReady: Boolean;

  private constructor({
    include,
    onChange,
    onChangeTimeout,
    exclude,
    ...options
  }: FileWatcherOptions) {
    this.changeList = new Map();
    this.onChange = onChange;
    this.onChangeTimeout = onChangeTimeout ?? 100;
    this.isReady = false;

    const watchOptions: FSWatcherOptions = {
      ignored: exclude,
      ...options,
    };

    this.watcher = watch(include ?? './', watchOptions);
    this.watcher
      .on('add', this.handleAdd.bind(this))
      .on('change', this.handleChange.bind(this))
      .on('error', this.handleError.bind(this))
      .on('ready', this.handleInitialScanReady.bind(this))
      .on('unlink', this.handleUnlink.bind(this));
  }

  /**
   * Retrieves the changed paths.
   */
  public get changedPaths(): ChangedPaths {
    const add: string[] = [];
    const change: string[] = [];
    const remove: string[] = [];

    const entries = this.changeList.entries();
    for (const [path, event] of entries) {
      switch (event) {
        case FileEvents.Add:
          add.push(path);
          break;
        case FileEvents.Change:
          change.push(path);
          break;
        case FileEvents.Remove:
          remove.push(path);
      }
    }
    return { add, change, remove };
  }

  /**
   * Create the filewatcher.
   *
   * @param options - Watcher options.
   *
   * @return {FileWatcher}
   */
  public static watch(options: FileWatcherOptions): FileWatcher {
    logger.log(LogLevels.VERBOSE, 'Starting file watcher.');
    return new FileWatcher(options);
  }

  /**
   * Clear the list of unique paths.
   */
  public clear(): void {
    logger.log(LogLevels.DEBUG, `Clearing change list.`);

    this.clearOnChangeTimer();
    this.changeList.clear();
  }

  /**
   * Clear the onChangeTimer
   */
  private clearOnChangeTimer(): void {
    this.onChangeTimer !== undefined && clearTimeout(this.onChangeTimer);
    this.onChangeTimer = undefined;

    logger.log(LogLevels.DEBUG, 'Cleared onChange timer.');
  }

  /**
   * Permanently close the watcher.
   */
  public async close(): Promise<void> {
    logger.log(LogLevels.VERBOSE, 'Closing file watcher.');
    await this.watcher.close();
    logger.log(LogLevels.VERBOSE, 'File watcher closed.');
  }

  /**
   * Resets the onChange callback grace period.
   */
  private setOnChangeTimer(): void {
    if (this.isReady === true) {
      this.clearOnChangeTimer();

      logger.log(LogLevels.DEBUG, 'Starting onChange timer.');
      this.onChangeTimer = setTimeout(
        this.handleReady.bind(this),
        this.onChangeTimeout,
      );
    }
  }

  /**
   * Handle new files.
   *
   * @param path - Path to file
   */
  private handleAdd(path: string): void {
    logger.log(LogLevels.DEBUG, `Path "${path}" has been added.`);

    this.changeList.set(path, FileEvents.Add);
    this.setOnChangeTimer();
  }

  /**
   * Handle reported file changes.
   *
   * @param path - Path to file
   */
  private handleChange(path: string): void {
    logger.log(LogLevels.DEBUG, `Path "${path}" has changed.`);

    this.changeList.set(path, FileEvents.Change);
    this.setOnChangeTimer();
  }

  /**
   * Handle watcher errors.
   *
   * @param err
   */
  private handleError(err: Error): void {
    logger.log(LogLevels.ERROR, err);
  }

  /**
   * Report changes to listener.
   */
  private handleReady(): void {
    logger.log(LogLevels.DEBUG, 'Initial scan completed.');

    if (this.changeList.size > 0) {
      this.onChange(this.changedPaths);
    }
  }

  /**
   *  Called when the initial scan is ready.
   */
  private handleInitialScanReady(): void {
    this.isReady = true;
    this.handleReady();
  }

  /**
   * Remove path from list of unique paths.
   *
   * @param path
   */
  private handleUnlink(path: string): void {
    logger.log(LogLevels.DEBUG, `Path "${path}" has been removed.`);

    this.changeList.set(path, FileEvents.Remove);
    this.setOnChangeTimer();
  }
}

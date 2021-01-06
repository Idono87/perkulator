import { watch, FSWatcher } from 'chokidar';

import { logger } from '~/loggers/internal';
import type { FileWatcherOptions, OnChangeEvent } from './types';
import { formatPerkulatorError } from '../formatters';

/**
 *
 * Reports any file changes and fires appropriate events.
 *
 * Internally the filewatcher keeps track of changes through a list unique of paths.
 *
 * @internal
 *
 */

/** File add event constant */
const ADD = Symbol('add');
/** File change event constant */
const CHANGE = Symbol('change');
/** File remove event constant */
const REMOVE = Symbol('remove');

type FileEvents = typeof ADD | typeof CHANGE | typeof REMOVE;

export default class FileWatcher {
  private readonly changeList: Map<string, FileEvents>;
  private readonly onChange: OnChangeEvent;
  private readonly onChangeTimeout: number;
  private onChangeTimer: NodeJS.Timeout | undefined;
  private readonly watcher: FSWatcher;

  private constructor({
    paths,
    onChange,
    onChangeTimeout,
    ...options
  }: FileWatcherOptions) {
    this.changeList = new Map();
    this.onChange = onChange;
    this.onChangeTimeout = onChangeTimeout ?? 100;

    this.watcher = watch(paths ?? './', options);
    this.watcher
      .on('add', this.handleAdd.bind(this))
      .on('change', this.handleChange.bind(this))
      .on('error', this.handleError.bind(this))
      .on('ready', this.handleReady.bind(this))
      .on('unlink', this.handleUnlink.bind(this));
  }

  /**
   * Create the filewatcher.
   *
   * @param options - Watcher options.
   *
   * @return {FileWatcher}
   */
  public static watch(options: FileWatcherOptions): FileWatcher {
    return new FileWatcher(options);
  }

  /**
   * Clear the list of unique paths.
   */
  public clear(): void {
    logger.log('debug', `Clearing change list.`);

    this.clearOnChangeTimer();
    this.changeList.clear();
  }

  /**
   * Clear the onChangeTimer
   */
  private clearOnChangeTimer(): void {
    this.onChangeTimer !== undefined && clearTimeout(this.onChangeTimer);
    this.onChangeTimer = undefined;

    logger.log('debug', 'Cleared onChange timer.');
  }

  /**
   * Permanently close the watcher.
   */
  public async close(): Promise<void> {
    logger.log('verbose', 'Closing file watcher.');
    await this.watcher.close();
    logger.log('verbose', 'File watcher closed.');
  }

  /**
   * Resets the onChange callback grace period.
   */
  private setOnChangeTimer(): void {
    this.clearOnChangeTimer();

    logger.log('debug', 'Starting onChange timer.');
    this.onChangeTimer = setTimeout(
      this.handleReady.bind(this),
      this.onChangeTimeout,
    );
  }

  /**
   * Handle new files.
   *
   * @param path - Path to file
   */
  private handleAdd(path: string): void {
    logger.log('debug', `Path "${path}" has been added.`);

    this.changeList.set(path, ADD);
    this.setOnChangeTimer();
  }

  /**
   * Handle reported file changes.
   *
   * @param path - Path to file
   */
  private handleChange(path: string): void {
    logger.log('debug', `Path "${path}" has changed.`);

    this.changeList.set(path, CHANGE);
    this.setOnChangeTimer();
  }

  /**
   * Handle watcher errors.
   *
   * @param err
   */
  private handleError(err: Error): void {
    logger.log('error', formatPerkulatorError(err));
  }

  /**
   * Report changes to listener.
   */
  private handleReady(): void {
    logger.log('debug', 'Initial scan completed.');

    if (this.changeList.size > 0) {
      const add: string[] = [];
      const change: string[] = [];
      const remove: string[] = [];

      const entries = this.changeList.entries();
      for (const [path, event] of entries) {
        switch (event) {
          case ADD:
            add.push(path);
            break;
          case CHANGE:
            change.push(path);
            break;
          case REMOVE:
            remove.push(path);
        }
      }

      this.onChange({ add, change, remove });
    }
  }

  /**
   * Remove path from list of unique paths.
   *
   * @param path
   */
  private handleUnlink(path: string): void {
    logger.log('debug', `Path "${path}" has been removed.`);

    this.changeList.set(path, REMOVE);
    this.setOnChangeTimer();
  }
}
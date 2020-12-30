import { watch, FSWatcher } from 'chokidar';

import type { FileWatcherOptions, OnChangeEvent } from './types';

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
  private readonly changeList: Set<string>;
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
    this.changeList = new Set();
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
    this.clearOnChangeTimer();
    this.changeList.clear();
  }

  /**
   * Clear the onChangeTimer
   */
  private clearOnChangeTimer(): void {
    this.onChangeTimer !== undefined && clearTimeout(this.onChangeTimer);
    this.onChangeTimer = undefined;
  }

  /**
   * Permanently close the watcher.
   */
  public async close(): Promise<void> {
    await this.watcher.close();
  }

  /**
   * Resets the onChange callback grace period.
   */
  private setOnChangeTimer(): void {
    this.clearOnChangeTimer();
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
    this.changeList.add(path);
    this.setOnChangeTimer();
  }

  /**
   * Handle reported file changes.
   *
   * @param path - Path to file
   */
  private handleChange(path: string): void {
    this.changeList.add(path);
    this.setOnChangeTimer();
  }

  /**
   * Handle watcher errors.
   *
   * @param err
   */
  private handleError(err: Error): void {
    throw err;
  }

  /**
   * Report changes to listener.
   */
  private handleReady(): void {
    this.changeList.size > 0 && this.onChange(Array.from(this.changeList));
  }

  /**
   * Remove path from list of unique paths.
   *
   * @param path
   */
  private handleUnlink(path: string): void {
    this.changeList.delete(path);
    this.setOnChangeTimer();
  }
}

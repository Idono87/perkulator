import type { WatchOptions } from 'chokidar';

/**
 * Configuration object for the FileWatcher
 *
 * @internal
 */
export type FileWatcherOptions = {
  /** Path(s) to watch for changes */
  paths?: string | readonly string[];

  /** Called when any changes have occurred. */
  onChange: OnChangeEvent;

  /**
   * The number of milliseconds another change can occur before onchange is called.
   * Is reset after each change.
   */
  onChangeTimeout?: number;
} & WatchOptions;

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

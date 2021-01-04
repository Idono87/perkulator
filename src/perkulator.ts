import FileWatcher from './file-watcher';

import type { ChangedPaths } from '~/file-watcher/types';
import { PerkulatorOptions } from './types';

export default class Perkulator {
  fileWatcher: FileWatcher;

  private constructor(fileWatcher: FileWatcher) {
    this.fileWatcher = fileWatcher;
  }

  public static watch(options: PerkulatorOptions): Perkulator {
    const fileWatcher = FileWatcher.watch({
      paths: options.paths,
      onChange: (paths: ChangedPaths): void => {},
    });

    return new Perkulator(fileWatcher);
  }
}

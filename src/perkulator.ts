import FileWatcher from './file-watcher';

import type { ChangedPaths } from '~/file-watcher/types';
import { PerkulatorOptions } from './types';
import { consolidateOptions, defaultOptions } from './config/config';
import validateOptions from './config/validation';

export default class Perkulator {
  fileWatcher: FileWatcher;

  private constructor(fileWatcher: FileWatcher) {
    this.fileWatcher = fileWatcher;
  }

  public static watch(options: PerkulatorOptions): Perkulator {
    validateOptions(options);
    const optionsConsolidated = consolidateOptions(options, defaultOptions);

    const fileWatcher = FileWatcher.watch({
      paths: optionsConsolidated.paths,
      onChange: (paths: ChangedPaths): void => {},
    });

    return new Perkulator(fileWatcher);
  }
}

import FileWatcher from './file-watcher';

import type { ChangedPaths } from '~/types';
import { PerkulatorOptions } from './types';
import { defaultOptions } from './config/config';
import validateOptions from './config/validation';

export default class Perkulator {
  fileWatcher: FileWatcher;

  private constructor(fileWatcher: FileWatcher) {
    this.fileWatcher = fileWatcher;
  }

  public static watch(options: PerkulatorOptions): Perkulator {
    validateOptions(options);
    const optionsConsolidated = Object.assign({}, defaultOptions, options);

    const fileWatcher = FileWatcher.watch({
      paths: optionsConsolidated.paths,
      onChange: (paths: ChangedPaths): void => {},
    });

    return new Perkulator(fileWatcher);
  }
}

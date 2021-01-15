import FileWatcher from './file-watcher';
import { PerkulatorOptions } from './types';
import { defaultOptions } from './config/config';
import validateOptions from './config/validation';
import TaskManager from './task/task-manager';
import { TaskResultCode } from './task/enum-task-result-code';

import type { ChangedPaths } from '~/types';

export default class Perkulator {
  private readonly fileWatcher: FileWatcher;
  private readonly taskManager: TaskManager;
  private readonly options: PerkulatorOptions;

  private constructor(options: PerkulatorOptions) {
    this.options = options;
    this.taskManager = TaskManager.create();
    this.fileWatcher = FileWatcher.watch({
      paths: this.options.paths,
      onChange: this.fileChangeHandler.bind(this),
    });
  }

  public static watch(options: PerkulatorOptions): Perkulator {
    validateOptions(options);
    const consolidatedOptions = Object.assign({}, defaultOptions, options);

    return new Perkulator(consolidatedOptions);
  }

  private async fileChangeHandler(changedPaths: ChangedPaths): Promise<void> {
    const result = await this.taskManager.run(changedPaths);

    if (result === TaskResultCode.Finished) {
      this.fileWatcher.clear();
    }
  }
}

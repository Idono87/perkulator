import ValidationError from '~/errors/validation-error';

import type { WatcherOptions } from '~/file-watcher/file-watcher';
import type { TaskGroupOptions } from '~/task/task-group';
import type { TaskOptions } from '~/task/task-runner';
import type { PerkulatorOptions, TaskRunnableOptions } from '~/perkulator';

/**
 * Return when a property fails validation.
 *
 * @internal
 */

export interface FailedValidationObject {
  property: string;
  expected: string;
  actual: any;
}

/**
 * Validate perkulator options.
 *
 * @param options
 * @internal
 */
export default function validateOptions(options: PerkulatorOptions): void {
  const results = validateOptionsObject(options);

  if (results !== undefined) {
    const { property, expected, actual } = results;
    throw new ValidationError(property, expected, actual);
  }
}

function validateOptionsObject(
  options: PerkulatorOptions,
): FailedValidationObject | undefined {
  if (options.watcher !== undefined) {
    if (Array.isArray(options.watcher) || typeof options.watcher !== 'object') {
      return {
        property: 'watcher',
        expected: '{...properties}',
        actual: options.watcher,
      };
    }

    const watcherResults = validateWatcherOptions(options.watcher);
    if (watcherResults !== undefined) {
      return watcherResults;
    }
  }

  if (options.tasks === undefined || !Array.isArray(options.tasks)) {
    return {
      property: 'tasks',
      expected: '[...objects]',
      actual: options.tasks,
    };
  }

  const tasksResults = validateTaskOptionsList(options.tasks);
  if (tasksResults !== undefined) {
    return tasksResults;
  }
}

/**
 * Validates watcher properties
 *
 * @param options
 * @internal
 */
function validateWatcherOptions(
  options: WatcherOptions,
): FailedValidationObject | undefined {
  // Watcher include
  if (options.include !== undefined) {
    if (!Array.isArray(options.include)) {
      return {
        property: 'watcher.include',
        expected: '[...values]',
        actual: options.include,
      };
    }

    for (let i = 0; i < options.include.length; i++) {
      const value = options.include[i];
      if (typeof value !== 'string') {
        return {
          property: `watcher.include[${i}]`,
          expected: 'string',
          actual: typeof value,
        };
      }
    }
  }

  // Watcher exclude
  if (options.exclude !== undefined) {
    if (!Array.isArray(options.exclude)) {
      return {
        property: 'watcher.exclude',
        expected: '[...values]',
        actual: options.exclude,
      };
    }

    for (let i = 0; i < options.exclude.length; i++) {
      const value = options.exclude[i];
      if (typeof value !== 'string') {
        return {
          property: `watcher.exclude[${i}]`,
          expected: 'string',
          actual: typeof value,
        };
      }
    }
  }
}

/**
 * Validates tasks properties
 *
 * @param options
 * @internal
 */
function validateTaskOptionsList(
  options: TaskRunnableOptions[],
): FailedValidationObject | undefined {
  if (options.length === 0) {
    return {
      property: `tasks`,
      expected: 'length > 0',
      actual: 'length === 0',
    };
  }
  for (let i = 0; i < options.length; i++) {
    const taskOptions = options[i];

    if (typeof taskOptions !== 'object' && !Array.isArray(taskOptions)) {
      return {
        property: `tasks[${i}]`,
        expected: 'object',
        actual: typeof taskOptions,
      };
    }

    let results: FailedValidationObject | undefined;
    if ('module' in taskOptions) {
      results = validateTaskOptionsObject(taskOptions, i);
    } else if ('tasks' in taskOptions) {
      results = validateTaskGroupOptionsObject(taskOptions, i);
    } else {
      results = {
        property: `tasks[${i}]`,
        expected: `TaskOptions | TaskGroupOptions`,
        actual: `unknown`,
      };
    }

    if (results !== undefined) {
      return results;
    }
  }
}

function validateTaskGroupOptionsObject(
  taskGroupOptions: TaskGroupOptions,
  index: number,
): FailedValidationObject | undefined {
  if (!Array.isArray(taskGroupOptions.tasks)) {
    return {
      property: `tasks[${index}].tasks`,
      expected: 'array',
      actual: typeof taskGroupOptions.tasks,
    };
  }

  for (let i = 0; i < taskGroupOptions.tasks.length; i++) {
    const taskOptions = taskGroupOptions.tasks[i];

    if (typeof taskOptions !== 'object' && !Array.isArray(taskOptions)) {
      return {
        property: `tasks[${index}].tasks[${i}]`,
        expected: 'object',
        actual: typeof taskOptions,
      };
    }

    const result = validateTaskOptionsObject(taskOptions, i);

    if (result !== undefined) {
      result.property = `tasks[${index}].${result.property}`;
      return result;
    }
  }
}

function validateTaskOptionsObject(
  taskOptions: TaskOptions,
  index: number,
): FailedValidationObject | undefined {
  // Module
  if (typeof taskOptions.module !== 'string') {
    return {
      property: `tasks[${index}].module`,
      expected: 'string',
      actual: typeof taskOptions,
    };
  }

  // Include
  if (taskOptions.include !== undefined) {
    if (!Array.isArray(taskOptions.include)) {
      return {
        property: `tasks[${index}].include`,
        expected: 'array',
        actual: typeof taskOptions,
      };
    }

    for (let j = 0; j < taskOptions.include.length; j++) {
      const value = taskOptions.include[j];
      const valueType = typeof value;
      if (valueType !== 'string') {
        return {
          property: `tasks[${index}].include[${j}]`,
          expected: 'string',
          actual: valueType,
        };
      }
    }
  }

  // Exclude
  if (taskOptions.exclude !== undefined) {
    if (!Array.isArray(taskOptions.exclude)) {
      return {
        property: `tasks[${index}].exclude`,
        expected: 'array',
        actual: typeof taskOptions,
      };
    }

    for (let j = 0; j < taskOptions.exclude.length; j++) {
      const value = taskOptions.exclude[j];
      const valueType = typeof value;
      if (valueType !== 'string') {
        return {
          property: `tasks[${index}].exclude[${j}]`,
          expected: 'string',
          actual: valueType,
        };
      }
    }
  }
}

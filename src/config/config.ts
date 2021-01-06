import defaultsDeep from 'lodash.defaultsdeep';
import path from 'path';
import fs from 'fs';

import { PerkulatorOptions } from '~/types';
import InvalidConfigPath from '~/errors/invalid-config-path';
import validateOptions from './validation';
import ConfigValidationError from '~/errors/config-validation-error';
import ValidationError from '~/errors/validation-error';

const DEFAULT_CONFIG_PATH = './.perkulator';
const CONFIG_TYPES = ['json'] as const;

/**
 * Default options
 *
 * @internal
 */
export const defaultOptions: Required<PerkulatorOptions> = {
  paths: ['./'],
};

/**
 * Merges provided configuration objects into one
 *
 * @param configObjects
 *
 */
export function consolidateOptions(
  ...configObjects: PerkulatorOptions[]
): Required<PerkulatorOptions> {
  return defaultsDeep({}, ...configObjects);
}

/**
 * Import specified config of type JSON. Defaults to "perkulator"
 * in the current working directory.
 *
 * @param filePath
 */
export function importConfig(filePath?: string): PerkulatorOptions {
  let resolvedPath: string | undefined;

  if (filePath !== undefined) {
    resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = undefined;
    }
  } else {
    const defaultPath = path.resolve(DEFAULT_CONFIG_PATH);
    const ext:
      | typeof CONFIG_TYPES[number]
      | undefined = CONFIG_TYPES.find((extension) =>
      fs.existsSync(`${defaultPath}.${extension}`),
    );

    if (ext !== undefined) {
      resolvedPath = `${defaultPath}.${ext}`;
    }
  }

  if (resolvedPath === undefined) {
    throw new InvalidConfigPath(
      filePath ?? `${DEFAULT_CONFIG_PATH}.{${CONFIG_TYPES.join(' | ')}}`,
    );
  }

  const serializedOptions = fs.readFileSync(resolvedPath, {
    encoding: 'utf-8',
  });

  const options = JSON.parse(serializedOptions);
  try {
    validateOptions(options);
  } catch (e) {
    const err = e as ValidationError;
    throw new ConfigValidationError(err.property, err.expected, err.actual);
  }

  return options;
}

import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

import validateOptions from './validation';
import InvalidConfigPath from '~/errors/invalid-config-path';
import ConfigFormatError from '~/errors/config-format-error';
import type { PerkulatorOptions } from '~/types';

const DEFAULT_CONFIG_PATH = './.perkulator';
const CONFIG_EXTENSIONS = ['json', 'yaml', 'yml'] as const;

/**
 * Default options
 *
 * @internal
 */
export const defaultOptions: PerkulatorOptions = {
  paths: ['./'],
  tasks: [],
};

/**
 * Import specified config of type JSON. Defaults to "perkulator"
 * in the current working directory.
 *
 * @param filePath
 */
export function importConfig(filePath?: string): PerkulatorOptions {
  const resolvedPath =
    filePath !== undefined
      ? findSpecifiedConfig(filePath)
      : findDefaultConfig();

  if (resolvedPath === undefined) {
    throw new InvalidConfigPath(
      filePath !== undefined
        ? filePath
        : `${DEFAULT_CONFIG_PATH}.{${CONFIG_EXTENSIONS.join(' | ')}}`,
    );
  }

  const serializedOptions = fs.readFileSync(resolvedPath, {
    encoding: 'utf-8',
  });

  const extension = path.extname(resolvedPath).slice(1);
  let options: any;
  switch (extension) {
    case 'json':
      options = JSON.parse(serializedOptions);
      break;
    case 'yaml':
    case 'yml':
      options = yaml.load(serializedOptions);
      break;
    default:
      throw new ConfigFormatError(resolvedPath);
  }

  validateOptions(options);

  return options as PerkulatorOptions;
}

/**
 * Checks existence of specified file.
 * If file exists the resolved path is returned or undefined.
 *
 * @param configPath
 *
 * @internal
 */
function findSpecifiedConfig(configPath: string): string | undefined {
  const resolvedPath = path.resolve(configPath);

  return fs.existsSync(resolvedPath) ? resolvedPath : undefined;
}

/**
 * Checks existence of default configuration file.
 * If file exists a resolved path is returned or undefined.
 *
 * @internal
 */
function findDefaultConfig(): string | undefined {
  for (const extension of CONFIG_EXTENSIONS) {
    const resolvedPath = findSpecifiedConfig(
      `${DEFAULT_CONFIG_PATH}.${extension}`,
    );
    if (resolvedPath !== undefined) {
      return resolvedPath;
    }
  }

  return undefined;
}

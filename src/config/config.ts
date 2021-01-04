import defaultsDeep from 'lodash.defaultsdeep';

import { PerkulatorOptions } from '~/types';

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

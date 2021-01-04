import Validator, { Rules, ErrorMessages } from 'validatorjs';

import ValidationError from '~/errors/validation-error';
import type { PerkulatorOptions } from '~/types';

/**
 * Validate perkulator options.
 *
 * @param options
 */
export default function validateOptions(options: PerkulatorOptions): void {
  /*
   * Validation rules
   */
  const rules: Rules = {
    paths: 'array',
    'paths.*': 'string',
  };

  /*
   * Used to return the expected property value/type
   */
  const messages: ErrorMessages = {
    array: 'array',
    string: 'string',
  };

  const validation = new Validator(options, rules, messages);
  validation.passes();

  if (validation.errorCount > 0) {
    const err = Object.entries(validation.errors.all())[0];
    const key = err[0];
    const expected = err[1][0];
    const actual = getPropertyValue(key, options);

    throw new ValidationError(key, expected, actual);
  }
}

/**
 * Returns a string representation of the requested property.
 *
 * @param key
 * @param options
 *
 * @internal
 */
function getPropertyValue(key: string, options: PerkulatorOptions): string {
  const value = key.split('.').reduce((object: any, key: string): any => {
    return object[key];
  }, options);

  return value.toString();
}

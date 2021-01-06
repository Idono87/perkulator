import ValidationError from './validation-error';

/**
 * Thrown when configuration file validation fails.
 *
 * @internal
 *
 */
export default class ConfigValidationError extends ValidationError {
  public constructor(property: string, expected: string, actual: string) {
    super(property, expected, actual);
  }
}

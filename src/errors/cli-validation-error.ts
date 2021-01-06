import ValidationError from './validation-error';

/**
 * Configuration validation error.
 *
 * @internal
 */
export default class CLIValidationError extends ValidationError {
  public constructor(property: string, expected: string, actual: string) {
    super(property, expected, actual);

    this.message = `Invalid option "${property}".`;
  }
}

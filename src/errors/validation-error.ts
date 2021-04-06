import BaseError from './base-error';

/**
 * Configuration validation error.
 *
 * @internal
 */
export default class ValidationError extends BaseError {
  public readonly property: string;
  public readonly expected: string;
  public readonly actual: string;

  public constructor(property: string, expected: string, actual: string) {
    super(`Invalid property "${property}".`);

    this.property = property;
    this.expected = expected;
    this.actual = actual;
  }
}

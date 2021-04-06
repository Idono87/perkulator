/**
 * Base Error from which all other perkulator errors should be derived from.
 *
 * @internal
 */
export default abstract class BaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

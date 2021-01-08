import BaseError from './base-error';

export default class MissingInterfaceError extends BaseError {
  public constructor(name: string) {
    super(`Interface "${name}" was not found.`);
  }
}

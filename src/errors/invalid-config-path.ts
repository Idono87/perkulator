import BaseError from './base-error';

export default class InvalidConfigPath extends BaseError {
  public constructor(path: string) {
    super(`Could not find configuration file at "${path}".`);
  }
}

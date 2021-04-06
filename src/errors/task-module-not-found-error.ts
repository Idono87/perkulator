import BaseError from './base-error';

export default class TaskModuleNotFoundError extends BaseError {
  public constructor(path: string) {
    super(`Failed to find module "${path}"`);
  }
}

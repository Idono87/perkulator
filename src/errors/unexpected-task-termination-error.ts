import BaseError from './base-error';

export default class UnexpectedTaskTerminationError extends BaseError {
  public constructor(taskName: string) {
    super(`Task "${taskName}" has unexpectedly terminated.`);
  }
}

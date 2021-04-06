import BaseError from './base-error';

export default class TimeoutError extends BaseError {
  public constructor() {
    super(`Procedure timed out.`);
  }
}

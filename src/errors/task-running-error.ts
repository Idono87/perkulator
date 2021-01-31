import BaseError from './base-error';

export default class TaskRunningError extends BaseError {
  public constructor(msg: string) {
    super(msg);
  }
}

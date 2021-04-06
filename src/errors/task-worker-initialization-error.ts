import BaseError from './base-error';

export default class TaskWorkerInitializationError extends BaseError {
  public constructor(msg: string) {
    super(msg);
  }
}

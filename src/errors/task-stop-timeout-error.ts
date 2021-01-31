import BaseError from './base-error';

export default class TaskStopTimeoutError extends BaseError {
  public constructor() {
    super(`Failed to stop task. Stop request timed out.`);
  }
}

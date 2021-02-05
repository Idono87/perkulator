import BaseError from './base-error';

export default class TaskStopTimeoutError extends BaseError {
  public constructor(taskName: string) {
    super(`Failed to stop task "${taskName}". Stop request timed out.`);
  }
}

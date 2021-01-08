import BaseError from './base-error';

export default class TaskTerminationTimeoutError extends BaseError {
  public constructor() {
    super(`Failed to terminate task. Termination timed out.`);
  }
}

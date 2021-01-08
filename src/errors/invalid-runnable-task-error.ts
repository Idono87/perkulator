import BaseError from './base-error';

export default class InvalidRunnableTaskError extends BaseError {
  public constructor(path: string) {
    super(
      `Could not find runnable task function. Module "${path}" is not a runnable task.`,
    );
  }
}

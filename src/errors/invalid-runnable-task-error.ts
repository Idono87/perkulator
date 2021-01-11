import BaseError from './base-error';

export default class InvalidRunnableTaskError extends BaseError {
  public constructor(path: string, func: string) {
    super(
      `Could not find implementation of function "${func}". Module "${path}" is not a runnable task.`,
    );
  }
}

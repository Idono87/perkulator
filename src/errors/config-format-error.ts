import BaseError from './base-error';

/**
 * Thrown when a unsupported file extension is being parsed.
 */
export default class ConfigFormatError extends BaseError {
  public constructor(path: string) {
    super(`Failed to parse "${path}". Format not supported.`);
  }
}

import TimeoutError from '~/errors/timeout-error';

type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject = (reason?: any) => void;

/**
 * Creates a deferred promise that throws TimeoutError if
 * not stopped in time.
 */
export default class DeferredTimeout<T> extends Promise<T> {
  private readonly resolve: Resolve<T>;
  private readonly reject: Reject;
  private readonly timeout: NodeJS.Timeout;

  public constructor(def = (res: Resolve<T>, rej: Reject) => {}, time = 10000) {
    let res: Resolve<T> = () => {};
    let rej: Reject = () => {};

    super((resolve, reject) => {
      res = resolve;
      rej = reject;
    });

    this.resolve = res;
    this.reject = rej;

    this.timeout = setTimeout(() => this.reject(new TimeoutError()), time);

    const resolve = (value: T | PromiseLike<T>): void => {
      this.stop(value);
    };

    const reject = (reason?: any): void => {
      clearTimeout(this.timeout);
      this.reject(reason);
    };

    def(resolve, reject);
  }

  public stop(value: T | PromiseLike<T>): void {
    clearTimeout(this.timeout);
    this.resolve(value);
  }
}

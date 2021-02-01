type RejectFunction = (reason?: any) => void;
type ResolveFunction<T> = (value: T) => void;
interface FakePromise<T> extends Promise<T> {
  reject: RejectFunction;
  resolve: ResolveFunction<T>;
}

const unresolvedFakePromises: Set<FakePromise<void>> = new Set();

/**
 * Create a fake promise
 *
 * @internal
 */
export function createFakePromise<T = any>(): FakePromise<T> {
  let _reject: RejectFunction;
  let _resolve: ResolveFunction<void>;

  const pendingPromise: any = new Promise((resolve, reject) => {
    _reject = reject;
    _resolve = resolve;
  });

  pendingPromise.reject = (value: T) => {
    unresolvedFakePromises.delete(pendingPromise);
    _reject(value);
  };

  pendingPromise.resolve = (reason: any) => {
    unresolvedFakePromises.delete(pendingPromise);
    _resolve(reason);
  };

  unresolvedFakePromises.add(pendingPromise);

  return pendingPromise;
}

/**
 * Resolves all hanging promises.
 *
 * @internal
 */
export function resolveFakePromises(): void {
  for (const promise of unresolvedFakePromises) {
    promise.resolve();
  }

  unresolvedFakePromises.clear();
}

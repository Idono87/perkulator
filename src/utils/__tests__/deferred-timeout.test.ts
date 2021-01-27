import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { createSandbox, SinonFakeTimers } from 'sinon';

import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TimeoutError from '~/errors/timeout-error';
import DeferredTimeout from '../deferred-timeout';

use(chaiAsPromised);

const Sinon = createSandbox();
let fakeTimer: SinonFakeTimers;

describe('Util - Deferred Timeout', function () {
  beforeEach(function () {
    fakeTimer = Sinon.useFakeTimers();
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to stop the timeout', function () {
    const pendingTimeout = new DeferredTimeout<void>(undefined, 1000);
    pendingTimeout.stop();

    void fakeTimer.tickAsync(2000);

    return expect(pendingTimeout).to.eventually.be.undefined;
  });

  it('Expect to stop the timeout if task finishes', function () {
    const pendingTimeout = new DeferredTimeout<void>((resolve) => {
      resolve();
    }, 1000);

    void fakeTimer.tickAsync(2000);

    return expect(pendingTimeout).to.eventually.be.undefined;
  });

  it('Expect to timeout with a timeout error', function () {
    const pendingTimeout = new DeferredTimeout<void>(undefined, 1000);

    void fakeTimer.tickAsync(2000);

    return expect(pendingTimeout).to.be.rejectedWith(TimeoutError);
  });

  it('Expect to task to reject with an error', function () {
    const pendingTimeout = new DeferredTimeout<void>((_, reject) => {
      reject(new InvalidRunnableTaskError('hello', 'world'));
    }, 1000);

    void fakeTimer.tickAsync(2000);

    return expect(pendingTimeout).to.be.rejectedWith(InvalidRunnableTaskError);
  });

  it('Expect to chain promise', function () {
    const pendingTimeout = new DeferredTimeout<void>(undefined, 1000);
    pendingTimeout.stop();

    void fakeTimer.tickAsync(2000);

    return expect(pendingTimeout.then(() => Promise.resolve(true))).to
      .eventually.be.true;
  });
});

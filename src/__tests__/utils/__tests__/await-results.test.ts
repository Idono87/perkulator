import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import awaitResult from '../await-result';
import { createSandbox } from 'sinon';

use(chaiAsPromised);
const Sinon = createSandbox();

describe('Utils - Await Results', function () {
  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to pass', function () {
    function runnable(): void {
      expect(true).to.be.true;
    }

    return expect(awaitResult(runnable)).to.eventually.be.fulfilled;
  });

  it('Expect delayed result to pass', function () {
    const timer = Sinon.useFakeTimers();

    let pass: boolean = false;
    setTimeout(() => {
      pass = true;
    }, 100);

    const pendingPromise = awaitResult(() => {
      expect(pass).to.be.true;
    });

    void timer.runAllAsync();

    return expect(pendingPromise).to.eventually.be.fulfilled;
  });

  it('Expect to fail with a timeout', async function () {
    const timer = Sinon.useFakeTimers();

    function runnable(): void {
      expect(true).to.be.false;
    }
    const pendingResult = awaitResult(runnable, 100, 10);

    await timer.runAllAsync();

    return expect(pendingResult).to.be.rejected;
  });
});

import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { TaskProcessDirective } from '~/task/task-runner-process-adapter';
import {
  awaitResult,
  createChangedPaths,
  createFakePromise,
  createTaskOptions,
  PROCESS_READY_EVENT,
  resolveFakePromises,
  RESULT_EVENT,
  STOP_EVENT,
  UPDATE_EVENT,
} from '~/test-utils';

import type { TaskProcessDirectiveMessage } from '~/task/task-runner-process-adapter';

/* 
  IMPORTAN! Import for side effects 
  otherwise test will fail
*/
import '~/task/task-proxy-process-adapter';

use(sinonChai);

const Sinon = createSandbox();

export let run: SinonStub;
export let stop: SinonStub;

let sendStub: SinonStub;

const startDirective: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: createTaskOptions(__filename),
};

const runDirective: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.run,
  changedPaths: createChangedPaths(),
};

const stopDirective: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.stop,
};

describe('Perkulator integration tests forked proxy adapter', function () {
  beforeEach(function () {
    process.send = sendStub = Sinon.stub();
    process.connected = true;
    run = Sinon.stub();
    stop = Sinon.stub();
  });

  afterEach(function () {
    Sinon.restore();
    process.send = undefined;
    process.connected = false;
    resolveFakePromises();
  });

  it('Expect finished task to send results event', async function () {
    run.resolves({});

    sendStub.withArgs(PROCESS_READY_EVENT).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(RESULT_EVENT);
    });
  });

  it('Expect stopped task to send stop event', async function () {
    const pendingPromise = createFakePromise<undefined>();

    stop.callsFake(() => {
      pendingPromise.resolve(undefined);
    });

    sendStub.withArgs(PROCESS_READY_EVENT).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    run.callsFake(() => {
      process.emit('message' as any, stopDirective as any);
      return pendingPromise;
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(STOP_EVENT);
    });
  });

  it('Expect task update to send update event', async function () {
    run.callsArg(1);

    sendStub.withArgs(PROCESS_READY_EVENT).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(UPDATE_EVENT);
    });
  });
});

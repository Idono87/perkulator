import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import {
  awaitResult,
  createFakePromise,
  createTaskOptions,
  PROCESS_READY_EVENT,
  resolveFakePromises,
  RESULT_EVENT,
  STOP_EVENT,
  UPDATE_EVENT,
} from '~/__tests__/utils';

/* 
  IMPORTAN! Import for side effects 
  otherwise test will fail
*/
import '~/task/task-proxy-process-adapter';
import {
  RUN_DIRECTIVE,
  STOP_DIRECTIVE,
} from '~/__tests__/utils/process-directives';
import {
  TaskProcessDirective,
  TaskProcessDirectiveMessage,
} from '~/task/task-runner-process-adapter';

use(sinonChai);

const Sinon = createSandbox();

export let run: SinonStub;
export let stop: SinonStub;

let sendStub: SinonStub;

const START_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: createTaskOptions(__filename),
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
      process.emit('message' as any, RUN_DIRECTIVE as any);
    });

    process.emit('message' as any, START_DIRECTIVE as any);

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
      process.emit('message' as any, RUN_DIRECTIVE as any);
    });

    run.callsFake(() => {
      process.emit('message' as any, STOP_DIRECTIVE as any);
      return pendingPromise;
    });

    process.emit('message' as any, START_DIRECTIVE as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(STOP_EVENT);
    });
  });

  it('Expect task update to send update event', async function () {
    run.callsArg(1);

    sendStub.withArgs(PROCESS_READY_EVENT).callsFake(() => {
      process.emit('message' as any, RUN_DIRECTIVE as any);
    });

    process.emit('message' as any, START_DIRECTIVE as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(UPDATE_EVENT);
    });
  });
});

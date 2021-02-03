import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import {
  TaskDirective,
  TaskProcessDirective,
} from '~/task/enum-task-directive';
import {
  TaskEventType,
  TaskProcessEventType,
} from '~/task/enum-task-event-type';

import '~/task/task-proxy-process-adapter';
import {
  awaitResult,
  createChangedPaths,
  createFakePromise,
  createPerkulatorOptions,
  resolveFakePromises,
} from '~/test-utils';
import type {
  PerkulatorOptions,
  TaskDirectiveMessage,
  TaskEvent,
  TaskProcessDirectiveMessage,
  TaskProcessEvent,
} from '~/types';

use(sinonChai);

const Sinon = createSandbox();

export let run: SinonStub;
export let stop: SinonStub;

let sendStub: SinonStub;

const options: PerkulatorOptions = createPerkulatorOptions();
options.tasks = [{ module: __filename }];

const startDirective: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: options.tasks[0],
};

const runDirective: TaskDirectiveMessage = {
  directive: TaskDirective.run,
  changedPaths: createChangedPaths(),
};

const stopDirective: TaskDirectiveMessage = {
  directive: TaskDirective.stop,
};

const expectedResultEvent: TaskEvent = {
  eventType: TaskEventType.result,
  result: {},
};

const expectedStopEvent: TaskEvent = {
  eventType: TaskEventType.stop,
};

const expectedUpdateEvent: TaskEvent = {
  eventType: TaskEventType.update,
  update: undefined,
};

const expectedReadyEvent: TaskProcessEvent = {
  eventType: TaskProcessEventType.ready,
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

    sendStub.withArgs(expectedReadyEvent).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(expectedResultEvent);
    });
  });

  it('Expect stopped task to send stop event', async function () {
    const pendingPromise = createFakePromise<undefined>();

    stop.callsFake(() => {
      pendingPromise.resolve(undefined);
    });

    sendStub.withArgs(expectedReadyEvent).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    run.callsFake(() => {
      process.emit('message' as any, stopDirective as any);
      return pendingPromise;
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(expectedStopEvent);
    });
  });

  it('Expect task update to send update event', async function () {
    run.callsArg(1);

    sendStub.withArgs(expectedReadyEvent).callsFake(() => {
      process.emit('message' as any, runDirective as any);
    });

    process.emit('message' as any, startDirective as any);

    await awaitResult(() => {
      expect(sendStub).to.be.calledWith(expectedUpdateEvent);
    });
  });
});

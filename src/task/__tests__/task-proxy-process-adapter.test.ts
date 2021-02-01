import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskProxy from '~/task/task-proxy';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
} from '~/test-utils';
import {
  TaskEvent,
  TaskProcessDirectiveMessage,
  TaskProcessEvent,
} from '~/types';
import { TaskDirective, TaskProcessDirective } from '../enum-task-directive';
import { TaskEventType, TaskProcessEventType } from '../enum-task-event-type';

use(sinonChai);

const Sinon = createSandbox();

let taskProxyStub: SinonStubbedInstance<TaskProxy>;
let taskProxyCreateStub: SinonStub;

function emitMessage(directive: TaskProcessDirectiveMessage): void {
  process.emit('message' as any, directive as any);
}

describe('Task proxy process adapter', function () {
  before(async function () {
    process.connected = Sinon.stub() as any;
    process.send = Sinon.stub();

    taskProxyStub = Sinon.createStubInstance(TaskProxy);
    taskProxyCreateStub = Sinon.stub(TaskProxy, 'create').returns(
      (taskProxyStub as unknown) as TaskProxy,
    );

    await import('~/task/task-proxy-process-adapter');
  });

  afterEach(function () {
    Sinon.resetHistory();
  });

  after(function () {
    process.connected = false;
    delete process.send;
    Sinon.restore();
  });

  it('Expect task proxy to receive options', function () {
    const options = createPerkulatorOptions().tasks[0];

    emitMessage({
      directive: TaskProcessDirective.start,
      options,
    });

    expect(taskProxyCreateStub).to.be.calledOnceWith(options);
  });

  it('Expect to receive ready message', function () {
    const options = createPerkulatorOptions().tasks[0];
    const response: TaskProcessEvent = {
      eventType: TaskProcessEventType.ready,
    };

    emitMessage({
      directive: TaskProcessDirective.start,
      options,
    });

    expect(process.send).to.be.calledOnceWith(response);
  });

  it('Expect task proxy run to be called', function () {
    const changedPaths = createChangedPaths();

    emitMessage({
      directive: TaskDirective.run,
      changedPaths,
    });

    expect(taskProxyStub.run).to.be.calledOnceWith(changedPaths);
  });

  it('Expect task proxy stop to be called', function () {
    emitMessage({
      directive: TaskDirective.stop,
    });

    expect(taskProxyStub.stop).to.be.calledOnce;
  });

  it('Expect exit to be called', function () {
    const exitStub = Sinon.stub(process, 'exit');

    emitMessage({ directive: TaskProcessDirective.exit });

    expect(exitStub).to.be.calledOnce;

    exitStub.restore();
  });

  it('Expect uncaught exception to send error message');
});

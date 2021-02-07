import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskProxy from '~/task/task-proxy';
import { createChangedPaths, createPerkulatorOptions } from '~/test-utils';
import {
  TaskEvent,
  TaskEventListener,
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
    taskProxyStub.run.resetHistory();
    taskProxyStub.stop.resetHistory();
    (process.send as SinonStub).resetHistory();
    ((process.connected as unknown) as SinonStub).resetHistory();
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

  it('Expect to receive ready event', function () {
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

  it('Expect proxy event to be sent as a message', function () {
    const expectedResult: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };
    const eventListener: TaskEventListener =
      taskProxyCreateStub.firstCall.args[1];

    eventListener(expectedResult);

    expect(process.send).to.be.calledOnceWith(expectedResult);
  });
});

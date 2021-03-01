import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskProxy from '~/task/task-proxy';
import { PROCESS_READY_EVENT, RESULT_EVENT } from '~/__tests__/test-utils';

import type { RunnerEventListener } from '~/task/task-manager';
import type { TaskProcessDirectiveMessage } from '~/task/task-runner-process-adapter';
import type { TaskEvent } from '~/task/task-runner';
import {
  EXIT_DIRECTIVE,
  RUN_DIRECTIVE,
  START_DIRECTIVE,
  STOP_DIRECTIVE,
} from '~/__tests__/test-utils/process-directives';

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
    emitMessage(START_DIRECTIVE);

    expect(taskProxyCreateStub).to.be.calledOnceWith(
      (START_DIRECTIVE as any).options,
    );
  });

  it('Expect to receive ready event', function () {
    emitMessage(START_DIRECTIVE);

    expect(process.send).to.be.calledOnceWith(PROCESS_READY_EVENT);
  });

  it('Expect task proxy run to be called', function () {
    emitMessage(RUN_DIRECTIVE);

    expect(taskProxyStub.run).to.be.calledOnceWith(
      (RUN_DIRECTIVE as any).changedPaths,
    );
  });

  it('Expect task proxy stop to be called', function () {
    emitMessage(STOP_DIRECTIVE);

    expect(taskProxyStub.stop).to.be.calledOnce;
  });

  it('Expect exit to be called', function () {
    const exitStub = Sinon.stub(process, 'exit');

    emitMessage(EXIT_DIRECTIVE);

    expect(exitStub).to.be.calledOnce;

    exitStub.restore();
  });

  it('Expect proxy event to be sent as a message', function () {
    const eventListener: RunnerEventListener<TaskEvent> =
      taskProxyCreateStub.firstCall.args[1];

    eventListener(RESULT_EVENT);

    expect(process.send).to.be.calledOnceWith(RESULT_EVENT);
  });
});

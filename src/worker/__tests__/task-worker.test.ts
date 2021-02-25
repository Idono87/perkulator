import { expect, use } from 'chai';
import {
  createSandbox,
  createStubInstance,
  SinonStub,
  SinonStubbedInstance,
} from 'sinon';
import sinonChai from 'sinon-chai';
import worker from 'worker_threads';

import TaskWorkerInitializationError from '~/errors/task-worker-initialization-error';
import TaskProxy from '~/task/task-proxy';
import {
  awaitResult,
  createChangedPaths,
  createFakePromise,
  createTaskOptions,
  resolveFakePromises,
  RESULT_EVENT,
} from '~/test-utils';
import {
  TaskWorkerDirectiveType,
  TaskWorkerEventType,
  TaskWorkerFinishedEvent,
} from '../worker-pool';

import type { TaskWorkerRunDirective } from '../worker-pool';
import type { FakePromise } from '~/test-utils';
import TaskWorkerError from '~/errors/task-worker-error';

use(sinonChai);
const Sinon = createSandbox();

describe('Task Worker', function () {
  let messagePortStubbedInstance: SinonStubbedInstance<worker.MessagePort>;
  let parentPortStubbedInstance: SinonStubbedInstance<worker.MessagePort>;
  let taskProxyCreateStub: SinonStub;
  let taskProxyStubbedInstance: SinonStubbedInstance<TaskProxy>;

  beforeEach(function () {
    Sinon.stub(worker, 'isMainThread').get(() => false);

    messagePortStubbedInstance = createStubInstance(worker.MessagePort);

    parentPortStubbedInstance = createStubInstance(worker.MessagePort);
    Sinon.stub(worker, 'parentPort').get(() => parentPortStubbedInstance);

    taskProxyStubbedInstance = Sinon.createStubInstance(TaskProxy);
    taskProxyCreateStub = Sinon.stub(TaskProxy, 'create').returns(
      (taskProxyStubbedInstance as unknown) as TaskProxy,
    );
  });

  afterEach(function () {
    Sinon.restore();

    /* eslint-disable-next-line */
    delete require.cache[require.resolve('../task-worker')];
  });

  describe('Worker initialization', function () {
    it(`Expect to throw ${TaskWorkerInitializationError.name} if module is initialized in main thread`, async function () {
      Sinon.stub(worker, 'isMainThread').get(() => true);

      expect(() => require('../task-worker')).to.throw(
        TaskWorkerInitializationError,
        'Worker can not be run in the main thread.',
      );
    });

    it(`Expect to throw ${TaskWorkerInitializationError.name} if module is missing the parent port`, async function () {
      Sinon.stub(worker, 'parentPort').get(() => null);

      expect(() => require('../task-worker')).to.throw(
        TaskWorkerInitializationError,
        'Parent port is missing. Could not initialize the task worker.',
      );
    });

    it('Expect to attach listeners to parent port', function () {
      require('../task-worker');

      expect(parentPortStubbedInstance.on).to.be.calledWith(
        'message',
        Sinon.match.func,
      );
      expect(parentPortStubbedInstance.on).to.be.calledWith(
        'close',
        Sinon.match.func,
      );
      expect(parentPortStubbedInstance.on).to.be.calledTwice;
    });
  });

  describe('Running task', function () {
    let pendingRunPromise: FakePromise<void>;

    beforeEach(function () {
      require('../task-worker');

      pendingRunPromise = createFakePromise();

      taskProxyStubbedInstance.run.returns(pendingRunPromise);

      const RUN_DIRECTIVE: TaskWorkerRunDirective = {
        type: TaskWorkerDirectiveType.RUN,
        taskOptions: createTaskOptions(),
        changedPaths: createChangedPaths(),
        port: (messagePortStubbedInstance as unknown) as MessagePort,
      };

      parentPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(1, RUN_DIRECTIVE);
    });

    afterEach(() => {
      resolveFakePromises();
    });

    it('Expect task to be run', function () {
      expect(taskProxyCreateStub).to.be.calledOnce;
      expect(taskProxyStubbedInstance.run).to.be.calledOnce;
    });

    it('Expect a task event to be passed to the message port', function () {
      taskProxyCreateStub.firstCall.callArgWith(1, RESULT_EVENT);

      expect(messagePortStubbedInstance.postMessage).to.be.calledOnceWith(
        RESULT_EVENT,
      );
    });

    it('Expect worker to notify parent with finished event', async function () {
      pendingRunPromise.resolve();

      const finishedEvent: TaskWorkerFinishedEvent = {
        type: TaskWorkerEventType.FINISHED,
      };

      await awaitResult(() => {
        expect(parentPortStubbedInstance.postMessage).to.be.calledOnceWith(
          finishedEvent,
        );
      });
    });

    it('Expect worker to post error when an existing task is running', async function () {
      const RUN_DIRECTIVE: TaskWorkerRunDirective = {
        type: TaskWorkerDirectiveType.RUN,
        taskOptions: createTaskOptions(),
        changedPaths: createChangedPaths(),
        port: (messagePortStubbedInstance as unknown) as MessagePort,
      };

      parentPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(1, RUN_DIRECTIVE);

      await awaitResult(() => {
        expect(parentPortStubbedInstance.postMessage).to.be.calledOnceWith(
          Sinon.match.hasNested('type', TaskWorkerEventType.ERROR),
        );

        expect(parentPortStubbedInstance.postMessage).to.be.calledOnceWith(
          Sinon.match.hasNested(
            'error',
            Sinon.match.instanceOf(TaskWorkerError),
          ),
        );
      });
    });
  });
});

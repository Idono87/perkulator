import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import worker, { MessagePort } from 'worker_threads';

import WorkerError from '~/errors/worker-error';
import WorkerPool, {
  EMIT_WORKER_TASK_ERROR_KEY,
  RUN_WORKER_TASK_KEY,
  TaskWorkerFinishedEvent,
  WorkerEventType,
  WorkerLifecycleDirectiveType,
} from '~/worker/worker-pool';
import WorkerTask from '~/worker/worker-task';

use(sinonChai);
const Sinon = createSandbox();

describe('WorkerPool', function () {
  afterEach(function () {
    Sinon.restore();
  });

  describe('WorkerPool.create', function () {
    it('Expect to create with 5 workers', function () {
      const poolSize = 5;

      const Worker = worker.Worker;
      const workerStub = Sinon.stub(worker, 'Worker').callsFake(() => {
        return Sinon.createStubInstance(Worker);
      });

      /* eslint-disable-next-line no-new */
      new WorkerPool(poolSize);

      expect(workerStub).to.have.callCount(poolSize);
    });
  });

  describe('WorkerPool.terminateAllWorkers', function () {
    it('Expect to terminate all workers', async function () {
      const poolSize = 5;

      let terminateCallCount = 0;
      const Worker = worker.Worker;
      Sinon.stub(worker, 'Worker').callsFake(() => {
        return Sinon.createStubInstance(Worker, {
          terminate: Sinon.stub<any, Promise<number>>().callsFake(
            (): any => terminateCallCount++,
          ),
        });
      });

      const workerPool = new WorkerPool(poolSize);
      await workerPool.terminateAllWorkers();

      expect(terminateCallCount).to.equal(poolSize);
    });

    it('Expect terminated workers to not be replaced', async function () {
      const poolSize = 5;

      const Worker = worker.Worker;
      const workerStub = Sinon.stub(worker, 'Worker').callsFake(() => {
        const stubbedInstance = Sinon.createStubInstance(Worker, {
          terminate: Sinon.stub<any, Promise<number>>().callsFake((): any => {
            stubbedInstance.on
              .withArgs('exit', Sinon.match.func)
              .callArg(/* registered exit listener */ 1);
          }),
        });

        return stubbedInstance;
      });

      const workerPool = new WorkerPool(poolSize);
      await workerPool.terminateAllWorkers();

      expect(workerStub.callCount).to.equal(poolSize);
    });
  });

  describe('Worker events', function () {
    it('Expect worker exit event to replace the terminated worker', function () {
      const workerStubbedInstance = Sinon.createStubInstance(worker.Worker);
      const workerStub = Sinon.stub(worker, 'Worker').returns(
        workerStubbedInstance,
      );

      /* eslint-disable-next-line no-new */
      new WorkerPool(/* poolSize */ 1);
      workerStubbedInstance.on
        .withArgs('exit', Sinon.match.func)
        .callArg(/* registered exit listener */ 1);

      expect(workerStub).to.be.calledTwice;
    });
  });

  describe('WorkerPool.runTask', function () {
    let workerTaskStubbedInstance: SinonStubbedInstance<WorkerTask>;
    let workerStubbedInstance: SinonStubbedInstance<worker.Worker>;

    beforeEach(function () {
      workerTaskStubbedInstance = Sinon.createStubInstance(WorkerTask);
      // Symbol does not stub with "createStubInstance"
      workerTaskStubbedInstance[RUN_WORKER_TASK_KEY] = Sinon.stub() as any;

      workerStubbedInstance = Sinon.createStubInstance(worker.Worker);
      Sinon.stub(worker, 'Worker').returns(workerStubbedInstance);
    });

    it('Expect worker to be initialized for a new run', function () {
      const workerPool = new WorkerPool(1);
      workerPool.runTask(workerTaskStubbedInstance as any);

      expect(workerStubbedInstance.postMessage).to.be.calledOnceWith(
        Sinon.match
          .has('type', WorkerLifecycleDirectiveType.INIT)
          .and(Sinon.match.has('port', Sinon.match.instanceOf(MessagePort))),
      );
    });

    it('Expect to run worker task', function () {
      const workerPool = new WorkerPool(1);
      workerPool.runTask(workerTaskStubbedInstance as any);

      expect(
        workerTaskStubbedInstance[RUN_WORKER_TASK_KEY],
      ).to.be.calledOnceWith(Sinon.match.instanceOf(MessagePort));
    });

    it('Expect worker task to be queued when there are no free workers', function () {
      const workerPool = new WorkerPool(1);
      workerPool.runTask(workerTaskStubbedInstance as any);
      workerPool.runTask(workerTaskStubbedInstance as any);

      expect(workerTaskStubbedInstance[RUN_WORKER_TASK_KEY]).to.be.calledOnce;
    });

    it('Expect worker task to be dequeued and execute when a worker is idle', function () {
      const workerPool = new WorkerPool(1);
      workerPool.runTask(workerTaskStubbedInstance as any);
      workerPool.runTask(workerTaskStubbedInstance as any);

      const FINISHED_EVENT: TaskWorkerFinishedEvent = {
        type: WorkerEventType.FINISHED,
      };
      workerStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* listener */ 1, FINISHED_EVENT);

      expect(workerTaskStubbedInstance[RUN_WORKER_TASK_KEY]).to.be.calledTwice;
    });

    it('Throw an error when the worker fails to run the task', function () {
      workerTaskStubbedInstance[EMIT_WORKER_TASK_ERROR_KEY] = Sinon.stub();

      const workerPool = new WorkerPool(1);
      workerPool.runTask(workerTaskStubbedInstance as any);

      workerStubbedInstance.on
        .withArgs('exit', Sinon.match.func)
        .callArg(/* listener */ 1);

      expect(
        workerTaskStubbedInstance[EMIT_WORKER_TASK_ERROR_KEY],
      ).to.be.calledOnceWith(
        Sinon.match
          .instanceOf(WorkerError)
          .and(
            Sinon.match.has(
              'message',
              'Unexpected worker failure. Failed to run task.',
            ),
          ),
      );
    });
  });
});

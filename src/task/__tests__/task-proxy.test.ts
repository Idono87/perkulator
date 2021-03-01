import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskProxy from '../task-proxy';
import {
  awaitResult,
  createChangedPaths,
  ERROR_EVENT,
  RESULT_EVENT,
  STOP_EVENT,
  UPDATE_EVENT,
} from '~/__tests__/test-utils';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';

import type { RunnableTask } from '../task-proxy';
import type { TaskOptions } from '~/task/task-runner';

use(sinonChai);

const Sinon = createSandbox();

export let run:
  | undefined
  | SinonStub<Parameters<RunnableTask['run']>, ReturnType<RunnableTask['run']>>;

export let stop:
  | undefined
  | SinonStub<
      Parameters<RunnableTask['stop']>,
      ReturnType<RunnableTask['stop']>
    >;

let runnerMessageListener: SinonStub;

let options: TaskOptions;

describe('Task Proxy', function () {
  beforeEach(function () {
    run = Sinon.stub();
    stop = Sinon.stub();
    runnerMessageListener = Sinon.stub();

    options = { module: __filename };
  });

  afterEach(function () {
    Sinon.restore();
  });

  describe('Create', function () {
    it('Expect an instantiated task proxy', function () {
      expect(TaskProxy.create(options, runnerMessageListener)).to.be.instanceOf(
        TaskProxy,
      );
    });

    it('Expect to throw if no module exists', function () {
      options = { module: '/not/a/real/path' };

      expect(() => TaskProxy.create(options, runnerMessageListener)).to.throw(
        TaskModuleNotFoundError,
      );
    });

    it('Expect to throw if run function is missing', function () {
      run = undefined;

      expect(() => TaskProxy.create(options, runnerMessageListener)).to.throw(
        InvalidRunnableTaskError,
      );
    });

    it('Expect to throw if stop function is missing', function () {
      stop = undefined;

      expect(() => TaskProxy.create(options, runnerMessageListener)).to.throw(
        InvalidRunnableTaskError,
      );
    });
  });

  describe('Runnable execution', function () {
    it('Expect options to be passed to the run function', function () {
      options = {
        module: __filename,
        options: {
          testOption: 'test',
        },
      };
      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      void taskProxy.run(createChangedPaths());

      expect(run?.firstCall.args[2]).to.deep.equal(options.options);
    });

    it('Expect result message', async function () {
      run?.returns(/* result=* */ {});

      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      void taskProxy.run(createChangedPaths());

      await awaitResult(() => {
        expect(runnerMessageListener).to.be.calledOnceWith(RESULT_EVENT);
      });
    });

    it('Expect stop message', async function () {
      stop?.callsFake(() => {
        run?.returns(undefined);
      });

      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      void taskProxy.run(createChangedPaths());
      taskProxy.stop();

      await awaitResult(() => {
        expect(runnerMessageListener).to.be.calledOnceWith(STOP_EVENT);
      });
    });

    it('Expect update message', async function () {
      run?.callsFake((_, update) => {
        update(undefined);
        return undefined;
      });

      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      void taskProxy.run(createChangedPaths());

      await awaitResult(() => {
        expect(runnerMessageListener).to.be.calledWith(UPDATE_EVENT);
      });
    });

    it('Expect error message', async function () {
      run?.throws((ERROR_EVENT as any).error);

      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      void taskProxy.run(createChangedPaths());

      await awaitResult(() => {
        expect(runnerMessageListener).to.be.calledWith(ERROR_EVENT);
      });
    });

    it('Expect run to eventually be resolved', async function () {
      run?.returns(/* result=* */ {});

      const taskProxy = TaskProxy.create(options, runnerMessageListener);

      expect(await taskProxy.run(createChangedPaths())).to.be.undefined;
    });
  });
});

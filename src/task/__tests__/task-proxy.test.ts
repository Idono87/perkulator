import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskProxy from '../task-proxy';
import { awaitResult, createChangedPaths } from '~/test-utils';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import { TaskEventType } from '../enum-task-event-type';

import type {
  RunnableTask,
  TaskEvent,
  TaskOptions,
  TaskResultsObject,
} from '~/types';

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

  it('Expect to be created', function () {
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

  it('Expect options to be passed to the run function', function () {
    options = {
      module: __filename,
      options: {
        testOption: 'test',
      },
    };
    const taskProxy = TaskProxy.create(options, runnerMessageListener);

    taskProxy.run(createChangedPaths());

    expect(run?.firstCall.args[2]).to.deep.equal(options.options);
  });

  it('Expect result message', async function () {
    const result: TaskResultsObject = { errors: [], results: [] };
    const expectedResult: TaskEvent = {
      eventType: TaskEventType.result,
      result,
    };

    run?.returns(result);

    const taskProxy = TaskProxy.create(options, runnerMessageListener);

    taskProxy.run(createChangedPaths());

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedResult);
    });
  });

  it('Expect stop message', async function () {
    const expectedResult: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    stop?.callsFake(() => {
      run?.returns(undefined);
    });

    const taskProxy = TaskProxy.create(options, runnerMessageListener);

    taskProxy.run(createChangedPaths());
    taskProxy.stop();

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedResult);
    });
  });

  it('Expect update message', async function () {
    const updateMessage = 'Hello World!';
    const expectedResult: TaskEvent = {
      eventType: TaskEventType.update,
      update: updateMessage,
    };

    run?.callsFake((_, update) => {
      update(updateMessage);
      return undefined;
    });

    const taskProxy = TaskProxy.create(options, runnerMessageListener);

    taskProxy.run(createChangedPaths());

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledWith(expectedResult);
    });
  });

  it('Expect error message', async function () {
    const error = new Error('Test Error');
    const expectedResult: TaskEvent = {
      eventType: TaskEventType.error,
      error,
    };

    run?.throws(error);

    const taskProxy = TaskProxy.create(options, runnerMessageListener);

    taskProxy.run(createChangedPaths());

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledWith(expectedResult);
    });
  });
});

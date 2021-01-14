import { expect } from 'chai';
import { SinonStub, createSandbox, SinonSandbox } from 'sinon';

import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import TaskProxy from '../task-proxy';
import { TaskResultCode } from '../enum-task-result-code';
import type { TaskResultObject, TaskResults } from '~/types';
import { createFakePromise } from '~/__tests__/utils';

export let run: SinonStub | undefined;
export let stop: SinonStub | undefined;
let Sinon: SinonSandbox;

function createRunnableResult(
  resultCount = 10,
  errorCount = 0,
): TaskResultObject {
  const results: Object[] = [];
  const errors: Error[] = [];
  for (let i = 0; i < resultCount; i++) {
    results.push({ message: `Test ${i}` });
  }

  for (let i = 0; i < errorCount; i++) {
    errors.push(new Error(`Test ${i}`));
  }

  return { results, errors };
}

function createExpectedResult(
  resultCode: TaskResultCode,
  { results, errors }: TaskResultObject,
): TaskResults {
  const taskResult: TaskResults = {
    resultCode: resultCode,
  };

  if (Array.isArray(results) && results.length > 0) {
    taskResult.results = [];
    for (const result of results) {
      taskResult.results.push(JSON.stringify(result));
    }
  }

  if (Array.isArray(errors) && errors.length > 0) {
    taskResult.errors = [];
    for (const error of errors) {
      taskResult.errors.push(`${error.name}: ${error.message}`);
    }
  }

  return taskResult;
}

describe('Task Proxy', function () {
  Sinon = createSandbox();

  afterEach(function () {
    Sinon.restore();
  });

  it(`Expect ${TaskProxy.create.name} to return an instance of "${TaskProxy.name}"`, function () {
    run = Sinon.stub();
    stop = Sinon.stub();

    const path = __filename;
    const options: any = {};

    expect(TaskProxy.create(path, options)).to.be.instanceOf(TaskProxy);
  });

  it(`Expect ${TaskProxy.create.name} to throw a "${InvalidRunnableTaskError.name}"
    if "run" is not implemented`, function () {
    run = undefined;
    stop = Sinon.stub();

    const path = __filename;
    const options: any = {};

    expect(() => TaskProxy.create(path, options)).to.throw(
      InvalidRunnableTaskError,
    );
  });

  it(`Expect ${TaskProxy.create.name} to throw a "${InvalidRunnableTaskError.name}"
    if "stop" is not implemented`, function () {
    run = Sinon.stub();
    stop = undefined;

    const path = __filename;
    const options: any = {};

    expect(() => TaskProxy.create(path, options)).to.throw(
      InvalidRunnableTaskError,
    );
  });

  it(`Expect ${TaskProxy.create.name} to throw a "${TaskModuleNotFoundError.name}"`, function () {
    run = Sinon.stub();
    stop = Sinon.stub();

    const path = '/not/a/real/path';
    const options: any = {};

    expect(() => TaskProxy.create(path, options)).to.throw(
      TaskModuleNotFoundError,
    );
  });

  it(`Expect task to return a finished result`, function () {
    const returnedResult = createRunnableResult(10);
    const expectedResult = createExpectedResult(
      TaskResultCode.Finished,
      returnedResult,
    );

    run = Sinon.stub().resolves(returnedResult);
    stop = Sinon.stub();

    const path = __filename;
    const options: any = {};
    const proxy = TaskProxy.create(path, options);

    return expect(proxy.runTask()).to.eventually.deep.equal(expectedResult);
  });

  it(`Expect task to return a terminated result`, function () {
    const returnedResult = createRunnableResult(0, 0);
    const expectedResult = createExpectedResult(
      TaskResultCode.Terminated,
      returnedResult,
    );

    const pendingRun = createFakePromise();
    run = Sinon.stub().resolves(pendingRun);
    stop = Sinon.stub();

    const path = __filename;
    const options: any = {};
    const proxy = TaskProxy.create(path, options);
    setImmediate(() => {
      void proxy.stopTask();
      pendingRun.resolve(undefined);
    });

    return expect(proxy.runTask()).to.eventually.deep.equal(expectedResult);
  });

  it(`Expect task to return an error result`, function () {
    const returnedResult = createRunnableResult(10, 5);
    const expectedResult = createExpectedResult(
      TaskResultCode.Error,
      returnedResult,
    );

    run = Sinon.stub().resolves(returnedResult);
    stop = Sinon.stub();

    const path = __filename;
    const options: any = {};
    const proxy = TaskProxy.create(path, options);

    return expect(proxy.runTask()).to.eventually.deep.equal(expectedResult);
  });
});

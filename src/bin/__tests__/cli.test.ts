import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';

import { runCli } from '~/bin/perkulator';
import * as validateOptions from '~/config/validation';
import ValidationError from '~/errors/validation-error';
import Perkulator from '~/perkulator';
import { logger } from '~/loggers/internal';
import CLIValidationError from '~/errors/cli-validation-error';

function createDefaultArgv(): string[] {
  return ['/fake/path/one', '/fake/path/two'];
}

describe('Bin Script', function () {
  const Sinon = createSandbox();
  let perkulatorWatchStub: SinonStub;
  let validateOptionsStub: SinonStub;
  let loggerLogStub: SinonStub;

  before(function () {
    perkulatorWatchStub = Sinon.stub(Perkulator, 'watch');
    validateOptionsStub = Sinon.stub(validateOptions, 'default');
    loggerLogStub = Sinon.stub(logger, 'log');
  });

  afterEach(function () {
    Sinon.resetBehavior();
    Sinon.resetHistory();
  });

  after(function () {
    Sinon.restore();
  });

  it('Expect to instantiate a Perkulator object', function () {
    const argv = createDefaultArgv();
    runCli(argv);

    expect(perkulatorWatchStub.args[0][0]).to.deep.equal({ paths: [] });
  });

  it('Expect to instantiate a perkulator object with provided paths', function () {
    const paths = ['/test/path/one', '/test/path/two'];
    const argv = createDefaultArgv().concat(paths);
    runCli(argv);

    expect(perkulatorWatchStub.args[0][0]).to.deep.equal({ paths });
  });

  it('Expect to log a CLIValidationError and exit when validation fails', function () {
    validateOptionsStub.throws(new ValidationError('test', 'test', 'test'));
    const argv = createDefaultArgv();
    runCli(argv);

    const error = loggerLogStub.firstCall.args[1];
    expect(error).to.be.instanceOf(CLIValidationError);
  });

  it("Expect to log a CommanderError and exit when option doesn't exist", function () {
    // Silence error from commander
    const consoleLogStub = Sinon.stub(console, 'error');
    const processExitStub = Sinon.stub(process, 'exit');
    const argv = createDefaultArgv().concat(['--fake-option', 'test']);
    runCli(argv);

    // Important! Restore error function
    consoleLogStub.restore();

    expect(processExitStub.calledOnce).to.be.true;
  });
});

import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { runCli } from '~/bin/perkulator';
import * as Config from '~/config/config';
import Perkulator from '~/perkulator';
import { logger } from '~/loggers/internal';
import InvalidConfigPath from '~/errors/invalid-config-path';

use(sinonChai);

function createDefaultArgv(): string[] {
  return ['/fake/path/one', '/fake/path/two'];
}

describe('Bin Script', function () {
  const Sinon = createSandbox();
  let perkulatorWatchStub: SinonStub;
  let importConfigStub: SinonStub;
  let loggerLogStub: SinonStub;

  before(function () {
    perkulatorWatchStub = Sinon.stub(Perkulator, 'watch');
    importConfigStub = Sinon.stub(Config, 'importConfig');
    loggerLogStub = Sinon.stub(logger, 'log');
  });

  afterEach(function () {
    Sinon.resetBehavior();
    Sinon.resetHistory();
  });

  after(function () {
    Sinon.restore();
  });

  it('Expect to instantiate a Perkulator object with default config file', function () {
    importConfigStub.returns({});
    const argv = createDefaultArgv();
    runCli(argv);

    expect(perkulatorWatchStub).to.be.calledOnceWith({});
  });

  it('Expect to instantiate a Perkulator object with specified config file', function () {
    importConfigStub.returns({});
    const argv = createDefaultArgv().concat('/fake/config/path');
    runCli(argv);

    expect(perkulatorWatchStub).to.be.calledOnceWith({});
  });

  it(`Expect to throw "${InvalidConfigPath.name}" if no default config exists`, function () {
    const error = new InvalidConfigPath('/fake/default/path');
    importConfigStub.throws(error);
    const argv = createDefaultArgv();
    runCli(argv);

    expect(loggerLogStub).to.be.calledOnceWith('error', error);
  });

  it(`Expect to throw "${InvalidConfigPath.name}" if specified config doesn't exist`, function () {
    const configPath = '/fake/default/path';
    const error = new InvalidConfigPath(configPath);
    importConfigStub.throws(error);
    const argv = createDefaultArgv().concat(configPath);
    runCli(argv);

    expect(loggerLogStub).to.be.calledOnceWith('error', error);
  });

  it("Expect to exit when option doesn't exist", function () {
    // Silence error from commander
    const consoleLogStub = Sinon.stub(console, 'error');
    const processExitStub = Sinon.stub(process, 'exit');
    const argv = createDefaultArgv().concat(['--fake-option', 'test']);
    runCli(argv);

    // Important! Restore error function
    consoleLogStub.restore();

    expect(processExitStub).to.be.calledOnce;
  });
});

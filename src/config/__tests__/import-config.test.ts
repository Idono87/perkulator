import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import fs from 'fs';
import path from 'path';

import { importConfig } from '../config';
import InvalidConfigPath from '~/errors/invalid-config-path';
import type { PerkulatorOptions } from '~/types';
import ConfigValidationError from '~/errors/config-validation-error';

describe('Importing Config', function () {
  const Sinon = createSandbox();

  let fsReadFileSyncStub: SinonStub;
  let fsExistsSyncStub: SinonStub;

  const passingOptions: PerkulatorOptions = {
    paths: ['/test/path'],
  };

  const failingOptions = {
    paths: 'Should fail on validation',
  };

  before(function () {
    fsReadFileSyncStub = Sinon.stub(fs, 'readFileSync');
    fsExistsSyncStub = Sinon.stub(fs, 'existsSync');
  });

  afterEach(function () {
    Sinon.resetBehavior();
  });

  after(function () {
    Sinon.restore();
  });

  it('Expect to return options object with the default json config path', function () {
    fsExistsSyncStub.withArgs(path.resolve('./.perkulator.json')).returns(true);
    fsReadFileSyncStub.returns(JSON.stringify(passingOptions));

    expect(importConfig()).to.deep.equal(passingOptions);
  });

  it('Expect to return options object with provided path', function () {
    const testPath = './test';
    fsExistsSyncStub.withArgs(path.resolve(testPath)).returns(true);
    fsReadFileSyncStub.returns(JSON.stringify(passingOptions));

    expect(importConfig(testPath)).to.deep.equal(passingOptions);
  });

  it(`Expect to throw "${InvalidConfigPath.name}" when default path doesn't exist`, function () {
    fsExistsSyncStub.returns(false);

    expect(() => importConfig()).to.throw(InvalidConfigPath);
  });

  it(`Expect to throw "${InvalidConfigPath.name}" when provided path doesn't exist`, function () {
    fsExistsSyncStub.returns(false);

    expect(() => importConfig('./test/path')).to.throw(InvalidConfigPath);
  });

  it(`Expect to throw "${ConfigValidationError.name}" when config fails validation`, function () {
    fsExistsSyncStub.returns(true);
    fsReadFileSyncStub.returns(JSON.stringify(failingOptions));

    expect(() => importConfig()).to.throw(ConfigValidationError);
  });
});

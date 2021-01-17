import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import { importConfig } from '../config';
import InvalidConfigPath from '~/errors/invalid-config-path';
import ValidationError from '~/errors/validation-error';
import type { PerkulatorOptions } from '~/types';
import ConfigFormatError from '~/errors/config-format-error';

describe('Importing Config', function () {
  const Sinon = createSandbox();

  let fsReadFileSyncStub: SinonStub;
  let fsExistsSyncStub: SinonStub;

  const passingOptions: PerkulatorOptions = {
    paths: ['/test/path'],
    tasks: [],
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

  it('Expect to return options object with the default yaml config path', function () {
    fsExistsSyncStub
      .withArgs(path.resolve('./.perkulator.json'))
      .returns(false);
    fsExistsSyncStub.withArgs(path.resolve('./.perkulator.yaml')).returns(true);
    fsReadFileSyncStub.returns(yaml.dump(passingOptions));

    expect(importConfig()).to.deep.equal(passingOptions);
  });

  it('Expect to return options object with provided path', function () {
    const testPath = './test.json';
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

  it(`Expect to throw "${ValidationError.name}" when config fails validation`, function () {
    fsExistsSyncStub.returns(true);
    fsReadFileSyncStub.returns(JSON.stringify(failingOptions));

    expect(() => importConfig()).to.throw(ValidationError);
  });

  it(`Expect to throw "${ConfigFormatError.name}" when supplying unsupported format`, function () {
    fsExistsSyncStub.returns(true);
    fsReadFileSyncStub.returns(JSON.stringify(passingOptions));

    expect(() => importConfig('./not/a/real/path.fake')).to.throw(
      ConfigFormatError,
    );
  });
});

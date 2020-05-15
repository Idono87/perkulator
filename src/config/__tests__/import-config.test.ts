import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';

import importConfig from '..';
import * as validator from '../validate-root-config';
import { ConfigError } from '../../errors/config-error';

import { Config } from '../config';

describe('Import Config', function () {
    let validatorStub: sinon.SinonStub;
    let readFileSyncStub: sinon.SinonStub;

    const config: Config = {
        tasks: [
            {
                script: 'valid script',
            },
        ],
    };

    before(function () {
        validatorStub = sinon.stub(validator, 'validateConfigObject');
        readFileSyncStub = sinon.stub(fs, 'readFileSync');
    });

    beforeEach(function () {
        validatorStub.resetBehavior();
        readFileSyncStub.resetHistory();
        readFileSyncStub.resetBehavior();
        readFileSyncStub.returns(JSON.stringify(config));
    });

    after(function () {
        validatorStub.restore();
        readFileSyncStub.restore();
    });

    it('returns config object with default path', function () {
        const config = { tasks: ['this is a valid config object'] };
        readFileSyncStub.returns(JSON.stringify(config));

        expect(importConfig({})).to.deep.equal(config);
    });

    it('returns conf with defined path', function () {
        const config = { tasks: ['this is a valid config object'] };
        readFileSyncStub.returns(JSON.stringify(config));

        expect(importConfig({}, 'a different path')).to.deep.equal(config);
        expect(readFileSyncStub.args[0][0]).to.equal(
            path.resolve('a different path'),
        );
    });

    it('returns with overridden options', function () {
        const config = {
            tasks: ['override'],
            include: ['override'],
            exclude: ['override'],
            clear: false,
        };
        const options = {
            tasks: ['valid'],
            include: ['valid'],
            exclude: ['valid'],
            clear: true,
        };
        readFileSyncStub.returns(JSON.stringify(config));

        expect(importConfig(options as any)).to.deep.equal(options);
    });

    it('file does not exist', function () {
        readFileSyncStub.throws(new Error('This is an ENOENT'));

        expect(() => importConfig({})).to.throw(Error);
    });

    it('fail validation', function () {
        validatorStub.throws(new ConfigError('Failed validation'));

        expect(() => importConfig({})).to.throw(ConfigError);
    });
});

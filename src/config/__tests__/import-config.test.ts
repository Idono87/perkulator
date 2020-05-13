import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';

import { importConfig } from '../config-parser';
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

    it('returns config object', function () {
        const config = { tasks: ['this is a valid config object'] };
        readFileSyncStub.returns(JSON.stringify(config));

        expect(importConfig('valid path')).to.deep.equal(config);
    });

    it('file does not exist', function () {
        readFileSyncStub.throws(new Error('This is an ENOENT'));

        expect(() => importConfig('a path')).to.throw(Error);
    });

    it('fail validation', function () {
        validatorStub.throws(new ConfigError('Failed validation'));

        expect(() => importConfig('a path')).to.throw(ConfigError);
    });
});

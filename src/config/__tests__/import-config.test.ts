import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';

import importConfig from '..';
import * as validator from '../validate-root-config';

describe('Import Config', function () {
    let validatorStub: sinon.SinonStub;
    let readFileSyncStub: sinon.SinonStub;

    before(function () {
        validatorStub = sinon.stub(validator, 'validateConfigObject');
        readFileSyncStub = sinon.stub(fs, 'readFileSync');
    });

    beforeEach(function () {
        validatorStub.resetBehavior();
        readFileSyncStub.resetHistory();
        readFileSyncStub.resetBehavior();
    });

    after(function () {
        validatorStub.restore();
        readFileSyncStub.restore();
    });

    it('Expect to import with default config path', function () {
        const config = { tasks: ['this is a valid config object'] };
        readFileSyncStub.returns(JSON.stringify(config));

        expect(importConfig()).to.deep.equal(config);
    });

    it('Expect to import with custom config path', function () {
        const config = { tasks: ['this is a valid config object'] };
        readFileSyncStub.returns(JSON.stringify(config));

        importConfig('a different path');
        expect(readFileSyncStub.args[0][0]).to.equal(
            path.resolve('a different path'),
        );
    });
});

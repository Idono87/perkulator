import { expect } from 'chai';
import sinon from 'sinon';

import { validateConfigObject } from '../validate-root-config';
import * as taskValidator from '../validate-task-config';
import { ConfigError } from '../../errors/config-error';

describe('Validate Root Config', function () {
    let validateTaskObjectStub: sinon.SinonStub;

    before(function () {
        validateTaskObjectStub = sinon.stub(taskValidator, 'validateTaskList');
    });

    after(function () {
        validateTaskObjectStub.restore();
    });

    /**
     *
     *
     * Type Tests
     *
     *
     */

    it('valid base config object', function () {
        const configObject = { tasks: [] };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('invalid config object', function () {
        const configObject = ['Hello World'];

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('invalid tasks list', function () {
        const configObject = { tasks: {} };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('valid include list', function () {
        const configObject = {
            include: ['valid string'],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('valid include string', function () {
        const configObject = {
            include: 'valid string',
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('invalid include', function () {
        const configObject = {
            include: {},
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('invalid include list items', function () {
        const configObject = {
            include: [{}],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('valid exclude list', function () {
        const configObject = {
            exclude: ['valid string'],
            tasks: [],
        };
        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('valid exclude string', function () {
        const configObject = {
            exclude: 'valid string',
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('invalid exclude', function () {
        const configObject = {
            exclude: {},
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('invalid exclude list items', function () {
        const configObject = {
            exclude: [{}],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('invalid exclude', function () {
        const configObject = {
            unknown: 'should throw',
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    /**
     *
     * Required Tests
     *
     */

    it('config requires a tasks property', function () {
        const configObject = {};

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('include list requires one string', function () {
        const configObject = { include: [], task: [] };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });

    it('exclude list requires one string', function () {
        const configObject = { exclude: [], task: [] };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError);
    });
});

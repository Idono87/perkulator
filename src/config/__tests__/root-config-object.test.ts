import { expect } from 'chai';
import sinon from 'sinon';

import { validateConfigObject } from '../validate-root-config';
import * as taskValidator from '../validate-task-config';
import { ConfigError } from '../../errors/config-error';
import {
    INVALID_ROOT_OBJECT,
    INVALID_ROOT_INCLUDE_PROPERTY,
    INVALID_ROOT_EXCLUDE_PROPERTY,
    INVALID_ROOT_TASKS_PROPERTY,
    INVALID_ROOT_DEFAULT_GROUP_PROPERTY,
    MISSING_ROOT_PROPERTY_TASK,
    UNKNOWN_ROOT_PROPERTY,
    INVALID_ROOT_GROUPS_PROPERTY,
    INVALID_ROOT_GROUPS_OBJECT_PROPERTY,
} from '../error-strings';

describe('Validate Root Config', function () {
    let validateTaskObjectStub: sinon.SinonStub;

    before(function () {
        validateTaskObjectStub = sinon.stub(taskValidator, 'validateTaskList');
    });

    after(function () {
        validateTaskObjectStub.restore();
    });

    it('Expect to pass with a valid root object.', function () {
        const configObject = { tasks: [] };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('Expect to throw with an invalid root object type.', function () {
        const configObject = ['Hello World'];

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_OBJECT);
    });

    it('Expect to throw with an invalid task property.', function () {
        const configObject = { tasks: {} };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_TASKS_PROPERTY);
    });

    it('Expect to pass with a valid include list.', function () {
        const configObject = {
            include: ['valid string'],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('Expect to pass with a valid include string.', function () {
        const configObject = {
            include: 'valid string',
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('Expect to throw with an invalid include type.', function () {
        const configObject = {
            include: {},
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_INCLUDE_PROPERTY);
    });

    it('Expect to throw with an invalid include list item type.', function () {
        const configObject = {
            include: [{}],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_INCLUDE_PROPERTY);
    });

    it('Expect to pass with a valid exclude list.', function () {
        const configObject = {
            exclude: ['valid string'],
            tasks: [],
        };
        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('Expect to pass with a valid exclude string', function () {
        const configObject = {
            exclude: 'valid string',
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.not.throw();
    });

    it('Expect to throw with an invalid exclude type', function () {
        const configObject = {
            exclude: {},
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_EXCLUDE_PROPERTY);
    });

    it('Expect to throw with an invalid exclude list item type.', function () {
        const configObject = {
            exclude: [{}],
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_EXCLUDE_PROPERTY);
    });

    it('Expect to throw with an invalid default group type.', function () {
        const configObject = {
            defaultGroup: {},
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_DEFAULT_GROUP_PROPERTY);
    });

    it('Expect to throw with an invalid groups property type', function () {
        const configObject = {
            groups: 'not an object',
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_GROUPS_PROPERTY);
    });

    it('Expect to throw with an invalid groups child property value type', function () {
        const configObject = {
            groups: { testGroup: 'not an object' },
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_GROUPS_OBJECT_PROPERTY);
    });

    it('Expect to throw with an invalid group item value type', function () {
        const configObject = {
            groups: { testGroup: ['valid item', {}] },
            tasks: [],
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, INVALID_ROOT_GROUPS_OBJECT_PROPERTY);
    });

    it('Expect to throw when there are unknown properties.', function () {
        const configObject = {
            unknown: 'should throw',
        };

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(
            ConfigError,
            UNKNOWN_ROOT_PROPERTY.replace('{{1}}', 'unknown'),
        );
    });

    it('Expect to throw when required tasks property is missing.', function () {
        const configObject = {};

        expect(function () {
            validateConfigObject(configObject);
        }).to.throw(ConfigError, MISSING_ROOT_PROPERTY_TASK);
    });
});

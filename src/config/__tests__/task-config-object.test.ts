import { expect } from 'chai';

import { validateTaskList } from '../validate-task-config';
import { ConfigError } from '../../errors/config-error';
import {
    INVALID_TASK_OBJECT_OR_ARRAY,
    INVALID_TASK_OBJECT,
    INVALID_TASK_NAME_PROPERTY,
    INVALID_TASK_INCLUDE_PROPERTY,
    INVALID_TASK_EXCLUDE_PROPERTY,
    INVALID_TASK_RUNNER_PROPERTY,
    INVALID_TASK_ARGS_PROPERTY,
    INVALID_TASK_EXEC_PROPERTY,
    UNKNOWN_TASK_PROPERTY,
    EXCLUSIVE_PROPERTIES,
    EXCLUSIVE_REQUIRED_PROPERTIES,
} from '../error-strings';
import { CONFIG_TASK_RUNNER, CONFIG_TASK_EXEC } from '../../constants';

describe('Validate Task Config', function () {
    /**
     *
     *
     * Type Tests
     *
     *
     */

    it('Expect to pass with valid tasks configuration.', function () {
        const taskList = [
            {
                name: 'valid name',
                include: 'a valid path',
                exclude: 'a valid path',
                runner: 'validate path',
                args: ['valid args'],
                alwaysRun: true,
                options: {},
            },
            [
                {
                    include: ['a valid path'],
                    exclude: ['a valid path'],
                    exec: 'validate path',
                    args: ['valid args'],
                    alwaysRun: false,
                    skipPaths: false,
                },
            ],
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.not.throw();
    });

    it('Expect to throw with an invalid type.', function () {
        const taskList: any[] = ['invalid object'];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(
            ConfigError,
            INVALID_TASK_OBJECT_OR_ARRAY.replace('{{1}}', `"${0}"`),
        );
    });

    it(`Expect to throw when nested list item isn't an object.`, function () {
        const taskList: any[] = [['invalid object']];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(
            ConfigError,
            INVALID_TASK_OBJECT.replace('{{1}}', `"${0}"`),
        );
    });

    it('Expect to throw when name property is an invalid type.', function () {
        const taskList: any[] = [
            {
                runner: '',
                name: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_NAME_PROPERTY);
    });

    it('Expect to throw on invalid runner property type', function () {
        const taskList: any[] = [
            {
                runner: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_RUNNER_PROPERTY);
    });

    it('Expect to throw on invalid include property type.', function () {
        const taskList: any[] = [
            {
                include: {},
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_INCLUDE_PROPERTY);
    });

    it('Expect to throw on invalid include list item type.', function () {
        const taskList: any[] = [
            {
                include: ['valid', {}],
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_INCLUDE_PROPERTY);
    });

    it('Expect to throw on invalid exclude property type.', function () {
        const taskList: any[] = [
            {
                exclude: {},
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_EXCLUDE_PROPERTY);
    });

    it('Expect to throw on invalid exclude list item type.', function () {
        const taskList: any[] = [
            {
                exclude: ['valid', {}],
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_EXCLUDE_PROPERTY);
    });

    it('Expect to throw on invalid args property type.', function () {
        const taskList: any[] = [
            {
                args: {},
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_ARGS_PROPERTY);
    });

    it('Expect to throw on invalid args list item type.', function () {
        const taskList: any[] = [
            {
                args: ['valid', {}],
                runner: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_ARGS_PROPERTY);
    });

    it('Expect to throw on invalid exec property type', function () {
        const taskList: any[] = [
            {
                exec: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, INVALID_TASK_EXEC_PROPERTY);
    });

    it('expect invalid alwaysRun property to throw an error', function () {
        const taskList: any[] = [
            {
                exec: 'has to be set',
                alwaysRun: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, 'Expected "alwaysRun" to be boolean');
    });

    it('expect invalid skipPaths property to throw an error', function () {
        const taskList: any[] = [
            {
                exec: 'has to be set',
                skipPaths: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError, 'Expected "skipPaths" to be boolean');
    });

    it('Expect to throw on unknown properties.', function () {
        const taskList: any[] = [
            {
                unknown: 'should throw',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(
            ConfigError,
            UNKNOWN_TASK_PROPERTY.replace('{{1}}', 'unknown'),
        );
    });

    /**
     *
     *
     * Exclusive Tests
     *
     *
     */

    it('Expect to throw when more than one exclusive property is defined.', function () {
        const taskList: any[] = [
            {
                runner: 'test runner',
                exec: 'test command',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(
            ConfigError,
            EXCLUSIVE_PROPERTIES.replace(
                '{{1}}',
                `${CONFIG_TASK_RUNNER}, ${CONFIG_TASK_EXEC}`,
            ),
        );
    });

    it('Expect to throw when required properties are missing.', function () {
        const taskList: any[] = [{}];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(
            ConfigError,
            EXCLUSIVE_REQUIRED_PROPERTIES.replace(
                '{{1}}',
                `${CONFIG_TASK_RUNNER}, ${CONFIG_TASK_EXEC}`,
            ),
        );
    });
});

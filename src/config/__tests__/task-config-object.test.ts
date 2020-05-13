import { expect } from 'chai';

import { validateTaskList } from '../validate-task-config';
import { ConfigError } from '../../errors/config-error';

describe('Validate Task Config', function () {
    /**
     *
     *
     * Type Tests
     *
     *
     */

    it('valid base config object', function () {
        const taskList = [
            {
                name: 'valid name',
                include: ['a valid path'],
                exclude: ['a valid path'],
                script: 'validate path',
                args: ['valid args'],
            },
            [
                {
                    include: ['a valid path'],
                    exclude: ['a valid path'],
                    script: 'validate path',
                    args: ['valid args'],
                },
            ],
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.not.throw();
    });

    it('valid base config object without optional properties', function () {
        const taskList = [
            {
                script: 'validate path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.not.throw();
    });

    it('valid base config object with empty include and exclude', function () {
        const taskList = [
            {
                include: [],
                exclude: [],
                script: 'validate path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.not.throw();
    });

    it('valid base config object with string include and exclude', function () {
        const taskList = [
            {
                include: 'valid path',
                exclude: 'valid path',
                script: 'validate path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.not.throw();
    });

    it('invalid task object config', function () {
        const taskList: any[] = [
            {
                script: 'valid path',
            },
            'invalid object',
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid parallel task object config', function () {
        const taskList: any[] = [
            [
                {
                    script: 'valid path',
                },
                'invalid object',
            ],
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid name property', function () {
        const taskList: any[] = [
            {
                name: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid script property', function () {
        const taskList: any[] = [
            {
                script: {},
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid include property', function () {
        const taskList: any[] = [
            {
                include: {},
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid include item', function () {
        const taskList: any[] = [
            {
                include: ['valid', {}],
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid exclude property', function () {
        const taskList: any[] = [
            {
                exclude: {},
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid include item', function () {
        const taskList: any[] = [
            {
                exclude: ['valid', {}],
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid args property', function () {
        const taskList: any[] = [
            {
                args: {},
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('invalid args item', function () {
        const taskList: any[] = [
            {
                args: ['valid', {}],
                script: 'valid path',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('unknown property', function () {
        const taskList: any[] = [
            {
                unknown: 'should throw',
            },
        ];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    /**
     *
     *
     * Require Tests
     *
     *
     */

    it('task list requires at least one task object', function () {
        const taskList: any[] = [];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('parallel task list requires at least one task object', function () {
        const taskList: any[] = [[]];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });

    it('task item requires a script property', function () {
        const taskList: any[] = [{}];

        expect(function () {
            validateTaskList(taskList);
        }).to.throw(ConfigError);
    });
});

import _ from 'lodash';

import { ConfigError } from '../errors/config-error';

export const validateTaskList = (taskList: any[]): void => {
    taskList.forEach((value, index) => {
        const isArray = _.isArray(value);
        if (!isArray && !_.isObject(value)) {
            throw new ConfigError(
                `Expected "tasks" at index "${index}" to be an object or an array.`,
            );
        }

        isArray ? validateParallelTaskList(value) : validateTaskObject(value);
    });

    requireAtLeastOneTaskObject(taskList);
};

const validateParallelTaskList = (taskList: any[]): void => {
    taskList.forEach((value, index) => {
        const isArray = _.isArray(value);
        if (!isArray && !_.isObject(value)) {
            throw new ConfigError(
                `Expected "tasks" at index "${index}" to be an object or an array.`,
            );
        }

        validateTaskObject(value);
    });

    requireAtLeastOneTaskObject(taskList);
};

const requireAtLeastOneTaskObject = (taskList: any[]): void => {
    if (taskList.length === 0) {
        throw new ConfigError('Expected a minimum of one task to be defined.');
    }
};

const validateTaskObject = (taskObject: any): void => {
    Object.entries(taskObject).forEach(([property, value]) => {
        switch (property) {
            case 'name':
                validateTaskName(value);
                break;
            case 'include':
                validateTaskInclude(value);
                break;
            case 'exclude':
                validateTaskExclude(value);
                break;
            case 'script':
                validateTaskScript(value);
                break;
            case 'args':
                validateTaskArgsArray(value);
                break;
            default:
                throw new ConfigError(`Unexpected property "${property}".`);
        }
    });

    requireTaskScriptProperty(taskObject);
};

const validateTaskName = (name: any): void => {
    if (!_.isString(name)) {
        throw new ConfigError('Expected "name" to be a string.');
    }
};

const validateTaskInclude = (includeList: any): void => {
    const isArray = _.isArray(includeList);

    if (!_.isString(includeList) && !isArray) {
        throw new ConfigError(
            'Expected "include" on task to be a string or a list',
        );
    }

    if (isArray) {
        includeList.forEach((value: any, index: number) => {
            if (!_.isString(value)) {
                throw new ConfigError(
                    `Expected "include" on task at index "${index}" to be a string`,
                );
            }
        });
    }
};

const validateTaskExclude = (excludeList: any): void => {
    const isArray = _.isArray(excludeList);

    if (!_.isString(excludeList) && !isArray) {
        throw new ConfigError(
            'Expected "exclude" on task to be a string or a list',
        );
    }

    if (isArray) {
        excludeList.forEach((value: any, index: number) => {
            if (!_.isString(value)) {
                throw new ConfigError(
                    `Expected "exclude" on task at index "${index}" to be a string`,
                );
            }
        });
    }
};

const validateTaskScript = (script: any): void => {
    if (!_.isString(script)) {
        throw new ConfigError('Expected "script" to be a string');
    }
};

const validateTaskArgsArray = (argsArray: any): void => {
    if (!_.isArray(argsArray)) {
        throw new ConfigError('Expected "args" to be an array.');
    }

    argsArray.forEach((value, index) => {
        if (!_.isString(value)) {
            throw new ConfigError(
                `Expected "args" at index "${index}" to be a string.`,
            );
        }
    });
};

const requireTaskScriptProperty = (taskObject: any): void => {
    if (!_.has(taskObject, 'script')) {
        throw new ConfigError(`Expected task to contain a script property.`);
    }
};

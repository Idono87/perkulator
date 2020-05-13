import _ from 'lodash';

import { ConfigError } from '../errors/config-error';
import { validateTaskList } from './validate-task-config';

export const validateConfigObject = (configObject: any): void => {
    // Validate the config object.
    if (_.isArray(configObject)) {
        throw new ConfigError(
            'Expected JSON to start with curly brackets "{".',
        );
    }

    Object.entries(configObject).forEach(([property, value]) => {
        switch (property) {
            case 'clear':
                validateClearProperty(value);
                break;
            case 'tasks':
                validateTaskProperty(value);
                break;
            case 'include':
                validateExcludeProperty(value);
                break;
            case 'exclude':
                validateIncludeProperty(value);
                break;
            default:
                throw new ConfigError(`Unexpected property "${property}"`);
        }
    });

    requireTasksProperty(configObject);
};

const requireTasksProperty = (configObject: any): void => {
    if (!_.has(configObject, 'tasks')) {
        throw new ConfigError('Expected "clear" to be a boolean value');
    }
};

const validateClearProperty = (value: any): void => {
    if (!_.isBoolean(value)) {
        throw new ConfigError(
            'Expected configuration object to have property "tasks".',
        );
    }
};

const validateTaskProperty = (taskList: any): void => {
    if (!_.isArray(taskList)) {
        throw new ConfigError('Expected "tasks" to be an array.');
    }

    validateTaskList(taskList);
};

const validateIncludeProperty = (includeValue: any): void => {
    const isArray = _.isArray(includeValue);

    if (!_.isString(includeValue) && !isArray) {
        throw new ConfigError(
            'Expected "include" to be a string value or a list',
        );
    }

    if (isArray) {
        validateIncludeListItems(includeValue);
        requireAtLeastOnePathInInclude(includeValue);
    }
};

const validateIncludeListItems = (includeList: any[]): void => {
    includeList.forEach((item, index): void => {
        if (!_.isString(item)) {
            throw new ConfigError(
                `Expected "include" at index "${index}" to be a string.`,
            );
        }
    });
};

const requireAtLeastOnePathInInclude = (includeList: any): void => {
    if (_.isArray(includeList) && includeList.length === 0) {
        throw new ConfigError(
            'Expected the "include" list to contain at least one string item.',
        );
    }
};

const validateExcludeProperty = (excludeValue: any): void => {
    const isArray = _.isArray(excludeValue);

    if (!_.isString(excludeValue) && !isArray) {
        throw new ConfigError(
            'Expected "exclude" to be a string value or a list',
        );
    }

    if (isArray) {
        validateExcludeListItems(excludeValue);
        requireAtLeastOnePathInExclude(excludeValue);
    }
};

const validateExcludeListItems = (excludeList: any[]): void => {
    excludeList.forEach((item, index): void => {
        if (!_.isString(item)) {
            throw new ConfigError(
                `Expected "exclude" at index "${index}" to be a string.`,
            );
        }
    });
};

const requireAtLeastOnePathInExclude = (excludeList: any): void => {
    if (_.isArray(excludeList) && excludeList.length === 0) {
        throw new ConfigError(
            'Expected the "exclude" list to contain atleast one string item.',
        );
    }
};

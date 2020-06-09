import _ from 'lodash';

import { ConfigError } from '../errors/config-error';
import {
    CONFIG_TASK_NAME,
    CONFIG_TASK_INCLUDE,
    CONFIG_TASK_EXCLUDE,
    CONFIG_TASK_RUNNER,
    CONFIG_TASK_EXEC,
    CONFIG_TASK_ARGS,
    CONFIG_TASK_ALWAYS_RUN,
    CONFIG_TASK_SKIP_PATHS,
    CONFIG_TASK_OPTIONS,
    CONFIG_TASK_DELAY_LOG,
} from '../constants';
import {
    INVALID_TASK_OBJECT_OR_ARRAY,
    INVALID_TASK_OBJECT,
    INVALID_TASK_NAME_PROPERTY,
    INVALID_TASK_INCLUDE_PROPERTY,
    INVALID_TASK_EXCLUDE_PROPERTY,
    INVALID_TASK_RUNNER_PROPERTY,
    INVALID_TASK_EXEC_PROPERTY,
    INVALID_TASK_ARGS_PROPERTY,
    INVALID_TASK_ALWAYS_RUN_PROPERTY,
    INVALID_TASK_SKIP_PATHS_PROPERTY,
    UNKNOWN_TASK_PROPERTY,
    INVALID_TASK_DELAY_LOG_PROPERTY,
} from './error-strings';
import {
    validateAsString,
    validateAsStringOrStringArray,
    validateAsStringArray,
    validateAsBoolean,
    validateExclusiveOrProperties,
} from './utils';

export const validateTaskList = (taskList: any[]): void => {
    taskList.forEach((value, index) => {
        const isArray = _.isArray(value);
        if (!isArray && !_.isObject(value)) {
            throw new ConfigError(
                INVALID_TASK_OBJECT_OR_ARRAY.replace('{{1}}', `"${index}"`),
            );
        }

        isArray ? validateParallelTaskList(value) : validateTaskObject(value);
    });
};

const validateParallelTaskList = (taskList: any[]): void => {
    taskList.forEach((value, index) => {
        const isArray = _.isArray(value);
        if (!isArray && !_.isObject(value)) {
            throw new ConfigError(
                INVALID_TASK_OBJECT.replace('{{1}}', `"${index}"`),
            );
        }

        validateTaskObject(value);
    });
};

const validateTaskObject = (taskObject: any): void => {
    Object.entries(taskObject).forEach(([property, value]) => {
        switch (property) {
            case CONFIG_TASK_NAME:
                validateAsString(value, INVALID_TASK_NAME_PROPERTY);
                break;
            case CONFIG_TASK_INCLUDE:
                validateAsStringOrStringArray(
                    value,
                    INVALID_TASK_INCLUDE_PROPERTY,
                );
                break;
            case CONFIG_TASK_EXCLUDE:
                validateAsStringOrStringArray(
                    value,
                    INVALID_TASK_EXCLUDE_PROPERTY,
                );
                break;
            case CONFIG_TASK_RUNNER:
                validateAsString(value, INVALID_TASK_RUNNER_PROPERTY);
                break;
            case CONFIG_TASK_EXEC:
                validateAsString(value, INVALID_TASK_EXEC_PROPERTY);
                break;
            case CONFIG_TASK_ARGS:
                validateAsStringArray(value, INVALID_TASK_ARGS_PROPERTY);
                break;
            case CONFIG_TASK_ALWAYS_RUN:
                validateAsBoolean(value, INVALID_TASK_ALWAYS_RUN_PROPERTY);
                break;
            case CONFIG_TASK_SKIP_PATHS:
                validateAsBoolean(value, INVALID_TASK_SKIP_PATHS_PROPERTY);
                break;
            case CONFIG_TASK_OPTIONS:
                break;
            case CONFIG_TASK_DELAY_LOG:
                validateAsBoolean(value, INVALID_TASK_DELAY_LOG_PROPERTY);
                break;
            default:
                throw new ConfigError(
                    UNKNOWN_TASK_PROPERTY.replace('{{1}}', property),
                );
        }
    });

    validateExclusiveOrProperties(
        taskObject,
        CONFIG_TASK_RUNNER,
        CONFIG_TASK_EXEC,
    );
};

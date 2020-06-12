import { ConfigError } from '../errors/config-error';
import { validateTaskList } from './validate-task-config';
import {
    CONFIG_TASKS,
    CONFIG_INCLUDE,
    CONFIG_EXCLUDE,
    CONFIG_GROUPS,
    CONFIG_DEFAULT_GROUP,
} from '../constants';
import {
    INVALID_ROOT_OBJECT,
    INVALID_ROOT_INCLUDE_PROPERTY,
    INVALID_ROOT_EXCLUDE_PROPERTY,
    INVALID_ROOT_TASKS_PROPERTY,
    MISSING_ROOT_PROPERTY_TASK,
    UNKNOWN_ROOT_PROPERTY,
    INVALID_ROOT_GROUPS_PROPERTY,
    INVALID_ROOT_DEFAULT_GROUP_PROPERTY,
    INVALID_ROOT_GROUPS_OBJECT_PROPERTY,
} from './error-strings';
import {
    validateAsObject,
    validateAsArray,
    validateAsStringOrStringArray,
    requireProperty,
    validateObjectPropertiesAsStringArrays,
} from '../utils';

export const validateConfigObject = (configObject: any): void => {
    // Validate the config object.
    validateAsObject(configObject, INVALID_ROOT_OBJECT);

    Object.entries(configObject).forEach(([property, value]: [string, any]) => {
        switch (property) {
            case CONFIG_TASKS:
                validateAsArray(value, INVALID_ROOT_TASKS_PROPERTY);
                validateTaskList(value);
                break;
            case CONFIG_INCLUDE:
                validateAsStringOrStringArray(
                    value,
                    INVALID_ROOT_INCLUDE_PROPERTY,
                );
                break;
            case CONFIG_EXCLUDE:
                validateAsStringOrStringArray(
                    value,
                    INVALID_ROOT_EXCLUDE_PROPERTY,
                );
                break;
            case CONFIG_GROUPS:
                validateAsObject(value, INVALID_ROOT_GROUPS_PROPERTY);
                validateObjectPropertiesAsStringArrays(
                    value,
                    INVALID_ROOT_GROUPS_OBJECT_PROPERTY,
                );
                break;
            case CONFIG_DEFAULT_GROUP:
                validateAsStringOrStringArray(
                    value,
                    INVALID_ROOT_DEFAULT_GROUP_PROPERTY,
                );
                break;
            default:
                throw new ConfigError(
                    UNKNOWN_ROOT_PROPERTY.replace('{{1}}', property),
                );
        }
    });

    requireProperty(configObject, CONFIG_TASKS, MISSING_ROOT_PROPERTY_TASK);
};

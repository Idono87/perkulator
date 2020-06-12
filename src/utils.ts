import _ from 'lodash';

import { ConfigError } from './errors/config-error';
import {
    EXCLUSIVE_PROPERTIES,
    EXCLUSIVE_REQUIRED_PROPERTIES,
} from './config/error-strings';
import Config from './config/config';
import Options from './bin/options';

export const validateAsObject = (value: any, message: string): void => {
    if (!_.isObject(value) || _.isArray(value)) {
        throw new ConfigError(message);
    }
};

export const validateAsStringOrStringArray = (
    value: any,
    message: string,
): void => {
    const isArray = _.isArray(value);
    let hasValidChildren = true;

    if (isArray) {
        hasValidChildren = value.every((item: any) => _.isString(item));
    }

    if ((!_.isString(value) && !isArray) || !hasValidChildren) {
        throw new ConfigError(message);
    }
};

export const validateAsStringArray = (value: any, message: string): void => {
    const isArray = _.isArray(value);
    let hasValidChildren = true;

    if (isArray) {
        hasValidChildren = value.every((item: any) => _.isString(item));
    }

    if (!isArray || !hasValidChildren) {
        throw new ConfigError(message);
    }
};

export const validateAsArray = (taskList: any, message: string): void => {
    if (!_.isArray(taskList)) {
        throw new ConfigError(message);
    }
};

export const validateAsString = (value: any, message: string): void => {
    if (!_.isString(value)) {
        throw new ConfigError(message);
    }
};

export const validateAsBoolean = (value: any, message: string): void => {
    if (!_.isBoolean(value)) {
        throw new ConfigError(message);
    }
};

export const requireProperty = (
    object: any,
    property: string,
    message: string,
): void => {
    if (!_.has(object, property)) {
        throw new ConfigError(message);
    }
};

export const validateExclusiveOrProperties = (
    object: any,
    ...properties: string[]
): void => {
    const props: string[] = [];

    properties.forEach((propName) => {
        propName in object && props.push(propName);
    });

    if (props.length > 1) {
        throw new ConfigError(
            EXCLUSIVE_PROPERTIES.replace(
                '{{1}}',
                properties.toString().replace(',', ', '),
            ),
        );
    }

    if (props.length === 0) {
        throw new ConfigError(
            EXCLUSIVE_REQUIRED_PROPERTIES.replace(
                '{{1}}',
                properties.toString().replace(',', ', '),
            ),
        );
    }
};

export const validateObjectPropertiesAsStringArrays = (
    object: any,
    message: string,
): void => {
    Object.entries(object).forEach(([key, value]): void => {
        validateAsStringArray(object[key], message);
    });
};

export const concatGroups = (
    groups: Map<string, Set<string>>,
    ...groupNames: string[]
) => {
    const groupSet = new Set<string>();

    groupNames.forEach((groupName): void => {
        const g = groups.get(groupName);
        g && g.forEach((taskName): void => void groupSet.add(taskName));
    });

    return groupSet;
};

export const consolidateArgumentsWithConfig = (
    config: Config,
    options: Options,
): void => {
    options.group &&
        config.groups &&
        (config.defaultGroup = concatGroups(config.groups, ...options.group));
};

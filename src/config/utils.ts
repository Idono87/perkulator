import _ from 'lodash';

import { ConfigError } from '../errors/config-error';
import {
    EXCLUSIVE_PROPERTIES,
    EXCLUSIVE_REQUIRED_PROPERTIES,
} from './error-strings';

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

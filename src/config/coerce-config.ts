import _ from 'lodash';

import Config from './config';
import { CONFIG_GROUPS, CONFIG_DEFAULT_GROUP } from '../constants';
import { concatGroups } from '../utils';

const coerceConfigObject = (configObject: any): Config => {
    const config: Config = _.cloneDeep(configObject);

    CONFIG_GROUPS in configObject &&
        (config.groups = coerceGroupsProperty(configObject.groups));

    CONFIG_DEFAULT_GROUP in configObject &&
        config.groups &&
        (config.defaultGroup = coerceDefaultGroup(
            configObject.defaultGroup,
            config.groups,
        ));

    return config;
};
export default coerceConfigObject;

// Coerce groups into a map containing sets.
const coerceGroupsProperty = (
    groupsToCoerce: any,
): Map<string, Set<string>> => {
    return new Map(Object.entries(groupsToCoerce));
};

const coerceDefaultGroup = (
    defaultGroup: string | string[],
    groups: Map<string, Set<string>>,
): Set<string> => {
    const groupNames = _.isArray(defaultGroup) ? defaultGroup : [defaultGroup];
    return concatGroups(groups, ...groupNames);
};

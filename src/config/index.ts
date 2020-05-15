import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { validateConfigObject } from './validate-root-config';
import { DEFAULT_CONFIG_PATH } from '../constants';

import { Config } from './config';

const importConfig = (
    options: Partial<Config>,
    confPath: string = DEFAULT_CONFIG_PATH,
): Config => {
    // Load the config file
    const configString: string = fs.readFileSync(
        path.resolve(process.cwd(), confPath),
        'utf-8',
    );

    let configObject = JSON.parse(configString);

    validateConfigObject(configObject);

    // Make sure to merge CLI options after parsing the configuration file
    // and put the options last to override config file options.
    options && (configObject = Object.assign({}, configObject, options));

    return configObject;
};

export default importConfig;

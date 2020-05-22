import fs from 'fs';
import path from 'path';

import { validateConfigObject } from './validate-root-config';
import { DEFAULT_CONFIG_PATH } from '../constants';

import Config from './config';

const importConfig = (confPath: string = DEFAULT_CONFIG_PATH): Config => {
    // Load the config file
    var configString: string = fs.readFileSync(
        path.resolve(process.cwd(), confPath),
        'utf-8',
    );

    const configObject = JSON.parse(configString);

    validateConfigObject(configObject);

    return configObject;
};

export default importConfig;

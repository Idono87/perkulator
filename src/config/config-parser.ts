import fs from 'fs';
import path from 'path';

import { validateConfigObject } from './validate-root-config';

import { Config } from './config';

// Import and parse a config file.
export const importConfig = (configPath: string): Config => {
    // Load the config file
    const configString = fs.readFileSync(
        path.resolve(process.cwd(), configPath),
        'utf-8',
    );
    const configObject = JSON.parse(configString);

    validateConfigObject(configObject);

    return configObject;
};

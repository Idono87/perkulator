declare namespace NodeJS {
    export interface ProcessEnv {
        PERKULATOR_CONFIG_PATH: string;
        PERKULATOR_CHILD_PROCESS: string;
        NODE_ENV: 'test' | 'production' | 'development';
    }
}

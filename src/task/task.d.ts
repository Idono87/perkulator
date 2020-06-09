export interface TaskConfig {
    name?: string;
    args?: string[];
    include?: string[] | string;
    exclude?: string[] | string;
    runner?: string;
    exec?: string;
    alwaysRun?: boolean;
    skipPaths?: boolean;
    options?: any;
    delayLog?: boolean;
}

export interface TaskRunnerConfig extends TaskConfig {
    runner: string;
}

export interface TaskExecConfig extends TaskConfig {
    exec: string;
}

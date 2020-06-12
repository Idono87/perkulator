import { TaskConfig } from '../task/task';

export declare type LogLevel =
    | 'verbose'
    | 'debug'
    | 'info'
    | 'warn'
    | 'error'
    | 'fatal';

export default interface Config {
    include?: string[] | string;
    exclude?: string[] | string;
    defaultGroup?: Set<string>;
    groups?: Map<string, Set<string>>;
    tasks: Array<TaskConfig | TaskConfig[]>;
    clear?: boolean;
    silent?: boolean;
    logLevel?: LogLevel;
}

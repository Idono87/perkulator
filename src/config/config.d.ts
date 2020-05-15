import { TaskConfig } from './task';

export interface Config {
    include?: string[] | string;
    exclude?: string[] | string;
    tasks: Array<TaskConfig | TaskConfig[]>;
}

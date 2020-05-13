import { TaskConfig } from './task';

export interface Config {
    clear?: boolean;
    include?: string[] | string;
    exclude?: string[] | string;
    tasks: Array<TaskConfig | TaskConfig[]>;
}

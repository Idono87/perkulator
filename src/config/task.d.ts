export interface TaskConfig {
    name?: string;
    script: string;
    args?: string[];
    include?: string[] | string;
    exclude?: string[] | string;
}

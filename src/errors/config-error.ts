export class ConfigError extends Error {
    public constructor(message: string) {
        super(message);
        this.stack = undefined;
    }
}

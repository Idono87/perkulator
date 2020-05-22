import { Readable } from 'stream';
import _ from 'lodash';

import { logTaskOutput, logTaskError } from './logger';

export default class TaskLogger {
    private data: string;
    private error: boolean;
    constructor(stdOut: Readable | null, stdErr: Readable | null) {
        this.data = '';
        this.error = false;

        if (!_.isNull(stdErr)) {
            stdErr.setEncoding('utf8');
            stdErr.on('data', this.handleError.bind(this));
        }
        if (!_.isNull(stdOut)) {
            stdOut.setEncoding('utf8');
            stdOut.on('data', this.handleData.bind(this));
            stdOut.on('close', this.logData.bind(this));
        }
    }

    private handleError(e: string): void {
        this.error = true;
        logTaskError(e);
    }

    private handleData(data: string): void {
        this.data += data;
    }

    private logData(): void {
        if (this.error) return;

        logTaskOutput(this.data);
    }
}

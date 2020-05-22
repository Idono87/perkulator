import { EventEmitter } from 'events';
import { Message, MessageType } from './message';
import { EVENT_TYPE_CLOSE, MESSAGE_TYPE_DATA } from '../constants';

class PerkulatorTask {
    private readonly eventEmitter: EventEmitter;
    public constructor() {
        this.eventEmitter = new EventEmitter();

        process.on('disconnect', this.handleDisconnect.bind(this));
        process.on('message', this.handleMessage.bind(this));
    }

    private handleMessage(message: string): void {
        const messageObj: Message = JSON.parse(message);

        if (messageObj.type === MESSAGE_TYPE_DATA) {
            this.eventEmitter.emit(MESSAGE_TYPE_DATA, messageObj.data);
        } else {
            throw new Error('Unknown data received.');
        }
    }

    private handleDisconnect(): void {
        this.eventEmitter.emit(EVENT_TYPE_CLOSE);
    }

    private sendMessage(type: MessageType, data?: any): void {
        if (!process.connected) {
            throw new Error('IPC connection is closed.');
        }

        const message: Message = {
            type,
            data,
        };

        process.send && process.send(JSON.stringify(message));
    }

    private requestData(): void {
        this.sendMessage('init');
    }

    public on(event: typeof EVENT_TYPE_CLOSE, listener: () => void): this;
    public on(
        event: typeof MESSAGE_TYPE_DATA,
        listener: (data: any) => void,
    ): this;
    public on(event: string, listener: (...args: any) => void): this {
        const hasDataListener = this.eventEmitter
            .eventNames()
            .includes(MESSAGE_TYPE_DATA);
        if (!hasDataListener) {
            this.requestData();
        }

        this.eventEmitter.on(event, listener);
        return this;
    }
}

const isPerkulatorChildProcess =
    process.env.PERKULATOR_CHILD_PROCESS === 'true';

if (!isPerkulatorChildProcess) {
    throw new Error('Task did not start as child process to Perkulator.');
}

if (!process.connected) {
    throw new Error('Task requires an IPC connection');
}

const perkulatorTask = new PerkulatorTask();

export = perkulatorTask;

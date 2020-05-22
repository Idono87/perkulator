import { MESSAGE_TYPE_DATA, MESSAGE_TYPE_INIT } from '../constants';

export type MessageType = typeof MESSAGE_TYPE_DATA | typeof MESSAGE_TYPE_INIT;

export interface Message {
    type: MessageType;
    data?: any;
}

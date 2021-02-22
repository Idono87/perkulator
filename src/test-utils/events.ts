import { TaskEventType } from '~/task/task-runner';
import { GroupEventType } from '~/task/group-runner';
import { TaskProcessEventType } from '~/task/task-runner-process-adapter';

import type { TaskEvent } from '~/task/task-runner';
import type { GroupEvent } from '~/task/group-runner';
import type { TaskProcessEvent } from '~/task/task-runner-process-adapter';

export const RESULT_EVENT: TaskEvent = {
  eventType: TaskEventType.result,
  result: {},
};

export const RESULT_EVENT_EMPTY: TaskEvent = {
  eventType: TaskEventType.result,
};

export const RESULT_EVENT_WITH_ERRORS: TaskEvent = {
  eventType: TaskEventType.result,
  result: { errors: ['Test Error'] },
};

export const UPDATE_EVENT: TaskEvent = {
  eventType: TaskEventType.update,
  update: undefined,
};

export const ERROR_EVENT: TaskEvent = {
  eventType: TaskEventType.error,
  error: new Error('Test Error'),
};

export const STOP_EVENT: TaskEvent = {
  eventType: TaskEventType.stop,
};

export const SKIPPED_EVENT: TaskEvent = {
  eventType: TaskEventType.skipped,
};

export const GROUP_RESULT_EVENT: GroupEvent = {
  eventType: GroupEventType.result,
  result: {},
};

export const GROUP_RESULT_EVENT_WITH_ERRORS: GroupEvent = {
  eventType: GroupEventType.result,
  result: { errors: ['Test Error'] },
};

export const GROUP_STOP_EVENT: GroupEvent = {
  eventType: GroupEventType.stop,
};

export const GROUP_SKIPPED_EVENT: GroupEvent = {
  eventType: GroupEventType.skipped,
};

export const PROCESS_READY_EVENT: TaskProcessEvent = {
  eventType: TaskProcessEventType.ready,
};

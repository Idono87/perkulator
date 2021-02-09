export const enum TaskEventType {
  error = 'error',
  update = 'update',
  result = 'result',
  skipped = 'skipped',
  stop = 'stop',
}

export const enum TaskProcessEventType {
  ready = 'ready',
}

export const enum TaskGroupEventType {
  result = 'group_result',
  skipped = 'group_skipped',
  stop = 'group_stop',
}

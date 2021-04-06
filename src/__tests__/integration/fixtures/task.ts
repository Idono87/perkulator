import { RunnableTask } from '../../../task/task-proxy';

let stopTask: undefined | (() => any);

export const run: RunnableTask['run'] = (changedPaths, update, options) => {
  if (options?.throw === true) {
    throw Error('TestError');
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(options?.result ?? {}), options?.timeout ?? 0);

    stopTask = () => resolve({});
  });
};

export const stop: RunnableTask['stop'] = () => {
  stopTask?.();
};

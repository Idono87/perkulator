import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import { TaskResultCode } from './enum-task-result-code';
import type { RunnableTask, TaskResults } from '~/types';

const ERR_MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

/**
 * Proxy that handles communication between perkulator and the imported task module.
 *
 * @internal
 */
export default class TaskProxy {
  private readonly options: any;
  private readonly taskModule: RunnableTask;
  private terminated: boolean = false;

  private constructor(taskModule: RunnableTask, options: any) {
    this.options = options;
    this.taskModule = taskModule;
  }

  /**
   * Create a new TaskProxy
   *
   * @param path
   * @param options
   */
  public static create(path: string, options: any): TaskProxy {
    let taskModule: RunnableTask;
    try {
      taskModule = require(path);
    } catch (err) {
      if (err.code === ERR_MODULE_NOT_FOUND) {
        throw new TaskModuleNotFoundError(path);
      }
      throw err;
    }

    if (typeof taskModule.run !== 'function') {
      throw new InvalidRunnableTaskError(options.path, 'run');
    } else if (typeof taskModule.stop !== 'function') {
      throw new InvalidRunnableTaskError(options.path, 'stop');
    }

    return new TaskProxy(taskModule, options);
  }

  /**
   * Run the imported task module
   */
  public async runTask(): Promise<TaskResults> {
    this.terminated = false;
    const taskResults: TaskResults = {
      resultCode: TaskResultCode.Finished,
    };

    const { results, errors } = (await this.taskModule.run()) ?? {};

    if (this.terminated) {
      taskResults.resultCode = TaskResultCode.Terminated;
    } else if (Array.isArray(errors) && errors.length > 0) {
      taskResults.resultCode = TaskResultCode.Error;
      taskResults.errors = this.formatErrors(errors);
    }

    if (Array.isArray(results)) {
      taskResults.results = this.formatResults(results);
    }

    return taskResults;
  }

  public async stopTask(): Promise<void> {
    this.terminated = true;
    await this.taskModule.stop();
  }

  /**
   * Formats the provided list of errors.
   *
   * @param errorList
   */
  private formatErrors(errorList: Error[]): string[] {
    const formattedErrorList: string[] = [];

    for (const error of errorList) {
      const formattedError = `${error.name}: ${error.message}`;
      formattedErrorList.push(formattedError);
    }

    return formattedErrorList;
  }

  /**
   * Formats the provided list of results.
   *
   * @param resultList
   */
  private formatResults(resultList: Object[]): string[] {
    const formattedResultList: string[] = [];

    for (const result of resultList) {
      const formattedResult = JSON.stringify(result);
      formattedResultList.push(formattedResult);
    }

    return formattedResultList;
  }
}

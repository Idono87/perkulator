export interface PerkulatorOptions {
  paths?: string[];
  tasks?: TaskOptions[];
}

export interface TaskOptions {
  readonly path: string;
}

export interface RunnableTask {
  runTask: () => Promise<void>;
  stopTask?: () => Promise<void>;
}

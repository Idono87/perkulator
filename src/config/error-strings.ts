export const INVALID_ROOT_OBJECT =
    'Expected JSON to start with curly brackets "{".';

export const INVALID_ROOT_INCLUDE_PROPERTY =
    'Expected "include" to be a string value or a list with string values';

export const INVALID_ROOT_EXCLUDE_PROPERTY =
    'Expected "exclude" to be a string value or a list';

export const INVALID_ROOT_TASKS_PROPERTY = 'Expected "tasks" to be an array.';

export const UNKNOWN_ROOT_PROPERTY = `Unexpected property "{{1}}"`;

export const MISSING_ROOT_PROPERTY_TASK =
    'Expecting property "tasks" to be defined in the root ';

export const INVALID_TASK_OBJECT_OR_ARRAY =
    'Expected task at index {{1}} to be an object or a list of tasks.';

export const INVALID_TASK_OBJECT =
    'Expected task at index {{1}} to be an object.';

export const INVALID_TASK_NAME_PROPERTY = 'Expected "name" to be a string.';

export const INVALID_TASK_INCLUDE_PROPERTY =
    'Expected task property "include" to be a string or a list of strings';

export const INVALID_TASK_EXCLUDE_PROPERTY =
    'Expected task property "exclude" to be a string or a list of strings';

export const INVALID_TASK_RUNNER_PROPERTY = 'Expected "runner" to be a string';

export const INVALID_TASK_EXEC_PROPERTY = 'Expected "exec" to be a string';

export const INVALID_TASK_ARGS_PROPERTY =
    'Expecting "args" to be a list of strings';

export const INVALID_TASK_ALWAYS_RUN_PROPERTY =
    'Expected "alwaysRun" to be boolean';

export const INVALID_TASK_SKIP_PATHS_PROPERTY =
    'Expected "skipPaths" to be boolean';

export const INVALID_TASK_DELAY_LOG_PROPERTY =
    'Expected "delayLog" to be boolean';

export const UNKNOWN_TASK_PROPERTY = 'Unexpected task property "{{1}}"';

export const EXCLUSIVE_PROPERTIES =
    'Only one of the following properties are allowed per task, "{{1}}".';

export const EXCLUSIVE_REQUIRED_PROPERTIES =
    'One of the following properties are required in the task object, "{{1}}"';

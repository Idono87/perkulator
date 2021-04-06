Perkulator is a configurable task runner designed to act on file changes and specifically only on the files that have changed.
The main purpose of the application is to run tasks as fast as possible without the unnecessary spinup per task and run on relevant files only.

The project is still under development and many features are bound to change.

## Quickstart

Simply install Perkulator with:

```
$ npm install -g perkulator
```

Create a configuration file named `.perkulator.[json | yaml | yml]` and configure your tasks.

```yml
# Configure the watcher
watcher:
  # Files to watch
  include: [<glob string>]
  # Files to exclude
  exclude: [<glob string>]
  # Chokidar configuration options. See chokidar documentation for more information.
  # useFsEvents
  # depth
  # interval
  # binaryInterval
  # awaitWriteFinish

# Task configuration
task:
    # Task configuration
    # Module to use. Any modules starting with perkulator-task-<module name>
    # can be imported by their module name only
  - module: <module name> | <custom module path>
    # Includes a subset of paths from the watcher.
    include: [<glob string>]
    # Exclude a subset of paths from the watcher.
    exclude: [<glob string>]
    # Options to pass to the task module
    options: { [prop]: <any> }

    # Group task configuration
  - tasks:
    # Run tasks in parallel. Notice that the number of tasks run in parallel are equal
    # to the worker limit.
    parallel: <boolean>
    - module: <module name> | <custom module path>
      include: [<glob string>]
      exclude: [<glob string>]
      options: { [prop]: <any> }

# Configure the worker pool
workerPool:
  # Set a worker hard limit.
  poolSize: <number>
```

Run Perkulator with the command

```
$ perkulator
```

## Licence

[MIT](LICENSE)

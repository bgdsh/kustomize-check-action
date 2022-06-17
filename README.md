# kustomize-check-action

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

## `files`

**Required** used to get the folders to check.

## Outputs

## `time`

The time we greeted you.

## Example usage


- uses: bgdsh/kustomize-check-action:latest
  with:
    files: {{ steps.changed-files.outputs.all_changed_files }}
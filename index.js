
const core = require('@actions/core');
const github = require('@actions/github');
const {execFileSync} = require('child_process')

try {
  // `files` input defined in action metadata file
  const files = core.getInput('files');
  console.log(`Files: ${files || 'None'}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  const result = execFileSync('./install_kustomize.sh');
  console.log(`install kustomize result: ${result.toString('utf-8')}`)
} catch (error) {
  core.setFailed(error.message);
}
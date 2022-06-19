
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs/promises');
const {execFileSync, execSync} = require('child_process')
const path = require('path')

try {
  // `files` input defined in action metadata file
  const filesChanged = core.getInput('filesChanged');
  const foldersToCheck = core.getInput('foldersToCheck');
  console.log(`Files: ${filesChanged || 'None'}!`);
  const folderPrefixes = foldersToCheck.split(',')
    .map(item => item.trim())
    .map(item => {
      if(item.startsWith('/')) {
        return item.substring(1)
      }
      return item
    });
  const arrFiles = files.split(' ')
    .map(item => item.trim())
    .filter(item => {
      // only check the none base files
      if (item.includes('/base/')) {
        return false;
      }
      return folderPrefixes.some(prefix => item.startsWith(prefix))
    });

  console.log('files has the required prefix: %j', arrFiles);
  if (arrFiles.length > 0) {
    const result = execFileSync(path.join(__dirname, '../install_kustomize.sh'));
    console.log(`install kustomize result: ${result.toString('utf-8')}`);
    let foldersToHandle = [];
    for (const fileChanged of arrFiles) {
      // turn a/b/c/d.txt => ['a', 'b', 'c']
      let folderParts = fileChanged.split('/').pop();
      for (;;) {
        const filesInFolder = fs.readdir(folderParts.join('/'));
        if (
          filesInFolder.includes('kustomization.yaml') || 
          filesInFolder.includes('kustomization.yml')
        ) {
          const folderToHandle = folderParts.join('/');
          if (!foldersToHandle.includes(folderToHandle)) {
            foldersToHandle.push(folderToHandle);
          }
          break;
        }
        folderParts.pop();
        if (folderParts.length <= 1) {
          break;
        }
      }
    }
    console.log('kustomization folders to check: %j', foldersToCheck)
    for (const folderToCheck of foldersToCheck) {
      const buildResult = execSync(`./kustomize build ${folderToCheck}`)
      console.log(`build result of folder ${folderToCheck} \n${buildResult}`)
      // TODO: check data_input and data_output
    }
  }


  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
} catch (error) {
  core.setFailed(error.message);
}
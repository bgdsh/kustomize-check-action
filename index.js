
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs/promises');
const {execFileSync, execSync} = require('child_process')
const path = require('path')
const Yaml = require('yaml')

function checkObjs(allResources, objs) {
  for (const obj of objs) {
    // only check deployment for now
    if (obj['kind'] !== 'Deployment') {
      continue;
    }
    const {labels, annotations} = obj.metadata;
    if (!labels || !labels['maintainer']) {
      throw new Error('maintainer should be specified in labels of deployment or commonLabels')
    }
    if (!allResources['maintainer'].includes(labels['maintainer'])) {
      throw new Error(`maintainer ${labels['maintainer']} is not specified in all_resource.yaml`)
    }
    if (!annotations || !annotations['data_in'] || !annotations['data_out']) {
      throw new Error('data_in and data_out should be specified in annotations of deployment');
    }
    const data_in_out = [...annotations['data_in'], ...annotations['data_out']];
    for (let item in data_in_out) {
      const parts = item.split('.')
      let resource = allResources;
      for (const part of parts) {
        if (!resource) {
          throw new Error(`resource ${item} is not found in all_resources, please extend`)
        }
        resource = resource[part]
        if (resource === undefined) {
          throw new Error(`resource ${item} is not found in all_resources`)
        }
      }
    }
  }
}

async function process() {
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
  const arrFiles = filesChanged.split(' ')
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
      let folderParts = fileChanged.split('/');
      folderParts.pop()
      for (;;) {
        const filesInFolder = await fs.readdir(folderParts.join('/'));
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
    console.log('kustomization folders to check: %j', foldersToHandle)
    let resourcesYaml = await fs.readFile('all_resources.yaml', 'utf-8')
    const allResources = Yaml.parse(resourcesYaml);
    for (const folderToHandle of foldersToHandle) {
      const buildResult = execSync(`./kustomize build ${folderToHandle}`)
      console.log(`build result of folder ${folderToHandle} \n${buildResult}\n`)
      // TODO: check data_input and data_output
      const yamlObjs = Yaml
        .parseAllDocuments(buildResult.toString('utf-8'))
        .map(doc => doc.toJS())
      checkObjs(allResources, yamlObjs)
    }
  }


  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
}

(async () => {
  try {
    await process()
  } catch (error) {
    core.setFailed(error.message);
  }
})();

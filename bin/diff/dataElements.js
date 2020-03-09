/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const fs = require('fs');
const startSpinner = require('../utils/startSpinner');
const fromFile = require('../utils/fromFile');
// const toFiles = require('../utils/toFiles');
// const deleteDirectory = require('../utils/deleteDirectory');
const compare = require('./compare');

function exitOnDupId(localIds, local) {
  if (localIds.includes(local.id)) 
    throw new Error(`A duplicate data_element ID value was found for ${local.attributes.name} - ${local.id}`);
}

function nameIdCheck(remotes, local, localPath, args) {
  const remoteName = remotes.find((remote) => (local.attributes.name === remote.attributes.name));
  // const remoteId = remotes.find((remote) => (local.id === remote.id));
  if (local.id !== remoteName.id) {
    throw new Error(`A data_element was found with the same name as a remote data_element but with a different ID value:

     local: ${local.attributes.name} - ${local.id}
     remote: ${remoteName.attributes.name} - ${remoteName.id}
     
     🚑 Please resolve manually and try again. `);
    // TODO autofix
    // deleteDirectory(localPath);
    // toFiles(remoteName, args);
    // compareAttributes();
  }
}

function mismatchCheck(localIds, remotes, local) {
  exitOnDupId(localIds, local);
  nameIdCheck(remotes, local);
  localIds.push(local.id);
}

module.exports = async (args, result) => {
  const spinner = startSpinner('Diffing Data Elements \n', 'red');

  result = result || {
    added: [],
    modified: [],
    deleted: [],
    behind: [],
    unchanged: [],
  };
  const localIds = [];

  const propertyId = args.propertyId;
  const reactor = args.reactor;
  const propertyPath = `./${propertyId}`;
  const dataElementsPath = `${propertyPath}/data_elements`;

  // get all of the local files
  const files = fs.readdirSync(dataElementsPath);

  // get all of the remote objects
  // TODO: go back through and refactor this to get everything...not just 999
  const remotes = (
    await reactor.listDataElementsForProperty(args.propertyId, {
      'page[size]': 999
    })
  ).data;

  for (const file of files) {
    // console.log('🔴 file: ', file);
    // console.log('🔴 dataElementsPath: ', dataElementsPath);
    if (!file.startsWith('DE')) {
      continue;
    }

    const localPath = `${dataElementsPath}/${file}`;

    // get the local object from file
    const local = await fromFile(localPath, args);
    mismatchCheck(localIds, remotes, local);
    // get the object from launch
    const remote = remotes.find((remote) => (local.id === remote.id));

    // diff compare
    const comparison = compare(local, remote, result);
    result[comparison.result]
    .push({
      type: local.type,
      id: local.id,
      path: localPath,
      details: comparison.details,
    });
  }

  for (const remote of remotes) {
    // we only want to sync things that haven't been handled above.
    // just the remotes that haven't even been created here
    if (!files.find((id) => (id === remote.id))) {

      // diff compare
      const comparison = compare(null, remote, result);
      result[comparison.result]
      .push({
        type: remote.type,
        id: remote.id,
        path: `${dataElementsPath}/${remote.id}`,
        details: comparison.details,
      });
    }
  }

  spinner.stop();

  return result;
};
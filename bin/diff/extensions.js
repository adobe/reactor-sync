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
const toMethodName = require('../utils/resourceName');
const { setResult, mismatchCheck } = require('../utils/resourceUtils');
const { checkCreateDir, listResources } = require('../utils/writeResources');
const fromFile = require('../utils/fromFile');
const compare = require('./compare');


module.exports = async (args, result) => {
  const spinner = startSpinner('Diffing Extensions \n', 'magenta');

  result = setResult(result);

  const localIds = [];
  const propertyName = args.propertyName;
  const resoureType = 'extensions';
  const propertyPath = `./_${propertyName}`;
  const extensionsPath = `${propertyPath}/${resoureType}`;
  const methodName = toMethodName(resoureType);

  // get all of the local files
  checkCreateDir(extensionsPath);
  const files = fs.readdirSync(extensionsPath);

  // get all of the remote objects
  // TODO: go back through and refactor this to get everything...not just 999
  const remotes = await listResources(methodName, args);

  for (const file of files) {

    // make sure we only deal with directories that start with DE
    if (!file.startsWith('EX')) continue;

    const localPath = `${extensionsPath}/${file}`;
    const local = await fromFile(localPath, args);
    mismatchCheck(localIds, remotes, local, localPath, args);
    // get the object from launch
    const remote = remotes.find((remote) => (local.id === remote.id));

    // diff compare
    let comparison = compare(local, remote, result);
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
        path: `${extensionsPath}/${remote.id}`,
        details: comparison.details,
      });
    }
  }

  spinner.stop();

  return result;
};
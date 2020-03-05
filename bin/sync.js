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
const checkAccessToken = require('./utils/getAccessToken');
const getReactor = require('./utils/getReactor');
const fromFile = require('./utils/fromFile');
const toFiles = require('./utils/toFiles');
const toMethodName = require('./utils/resourceName');
const diff = require('./diff');


function checkSettings(args) {
  const settingsPath = args.settingsPath || './.reactor-settings.json';
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } else {
    return console.error(`Launch Sync settings file at: ${settingsPath} does not exist.`);
  }
}

function checkEnvironment(settings) {
  if (!settings.environment) {
    console.error('No "environment" property.');
  }
  if (!settings.environment.reactorUrl) {
    console.error('No "environment.reactorUrl" property.');
  }
  return settings.environment;
}

async function updateExtension(reactor, local) {
  return (await reactor.updateExtension(
    local.id,
    { data: {
      id: local.id,
      type: local.type,
      attributes: local.attributes,
      relationships: local.relationships 
    }})).data;
}

async function updateResource(reactor, local) {
  const resourceName = toMethodName(local.type);
  const update = (await reactor[`update${resourceName}`]({
    id: local.id,
    type: local.type,
    attributes: local.attributes
  })).data;
  maybeRevise(resourceName, reactor, local);
  return update;
}

async function updateExtensionOr(reactor, local) {
  if (local.type === 'extensions') return await updateExtension(reactor, local);
  return await updateResource(reactor, local);
}

async function maybeRevise(resourceName, reactor, local) {
  if (resourceName === ('Extension' || 'DataElement'))
    return await reactor[`revise${resourceName}`](local.id);
}

module.exports = async (args) => {
  const settings = checkSettings(args);
  checkEnvironment(settings);

  settings.accessToken = await checkAccessToken(settings);
  const reactor = await getReactor(settings);
  const result = await diff(args);
  // const shouldSyncSome = shouldSync(args);

  // added
  // for (const comparison of result.added) {
  //   // TODO: 
  // }

  // modified
  if (
    !args.behind ||
    args.modified
  ) {

    console.log('🔂 Syncing Modified.');

    for (const comparison of result.modified) {
      const local = await fromFile(comparison.path, args);
      // sync it
      const updated = await updateExtensionOr(reactor, local);

      // Persist the updated files back in the form it is supposed to look like:
      await toFiles(updated, args); 
    }
  }

  // behind
  if (
    !args.modified ||
    args.behind
  ) {

    console.log('↩️  Syncing behind.');

    for (const comparison of result.behind) {
      const resourceMethodName = toMethodName(comparison.type);
      const updated = (await reactor[`get${resourceMethodName}`](comparison.id)).data;
      
      await toFiles(updated, args); 
    }
  }

  // unchanged
  // for (const comparison of result.unchanged) {
  //   // TODO: 
  // }

};

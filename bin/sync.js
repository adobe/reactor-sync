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
const Reactor = require('@adobe/reactor-sdk').default;
const getAccessToken = require('./utils/getAccessToken');
const fromFile = require('./utils/fromFile');
const toFiles = require('./utils/toFiles');
const diff = require('./diff');


function checkSettings(args) {
  const settingsPath = args.settingsPath || './.reactor-settings.json';
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } else {
    return console.error(`Launch Sync settings file at: ${settingsPath} does not exist.`);
  }
}

async function checkAccessToken(args) {
  if (!args.accessToken)
    return await getAccessToken(args);
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

async function getReactor(settings) {
  if (!settings.reactor)
    return await new Reactor(settings.accessToken, {
      reactorUrl: settings.environment.reactorUrl,
      enableLogging: false // turn true to help debug
    });
  return settings.reactor;
}

// function shouldSync(args, diffState) {
//   return (
//     args.modified ||
//     args.behind
//   );
// }

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

async function updateDataElement(reactor, resourceName, local) {
  return (await reactor[`update${resourceName}`]({
    id: local.id,
    type: local.type,
    attributes: local.attributes
  })).data;
}

async function updateExtensionOr(reactor, resourceName, local) {
  if (resourceName === 'Extension') return await updateExtension(reactor, local);
  return await updateDataElement(reactor, resourceName, local);
}

async function updateResource(reactor, resourceType, local) {
  const resourceName = toMethodName(resourceType);
  const update = updateExtensionOr(reactor, resourceName, local);
  maybeRevise(resourceName, reactor, local);
  return update;
}

async function maybeRevise(resourceName, reactor, local) {
  if (resourceName === ('Extension' || 'DataElement'))
    return await reactor[`revise${resourceName}`](local.id);
}

function singualize(resourceName) {
  if (resourceName.slice(-3) === 'ies') {
    return resourceName.replace('ies', 'y');
  }
  if (resourceName.slice(-1) === 's') {
    return resourceName.slice(0, -1); // Remove the "s", i.e.: "data_elements" -> DataElement
  }
  return resourceName;
}

function removeUnderscore(resourceName) {
  resourceName = resourceName.replace(/_([a-z])/g, (g) => // Remove any "_"s, i.e.: "data_elements" -> DataElement
    g[1].toUpperCase()
  );
  return resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
}

function toMethodName(resourceName) {
  resourceName = singualize(resourceName);
  return removeUnderscore(resourceName);
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
    !args.deleted ||
    args.modified
  ) {

    console.log('🔂 Syncing Modified.');

    for (const comparison of result.modified) {
      const local = await fromFile(comparison.path, args);
      // sync it
      const updated = await updateResource(reactor, local.type, local);

      // Persist the updated files back in the form it is supposed to look like:
      await toFiles(updated, args); 
    }
  }

  // deleted
  if (
    !args.modified ||
    !args.behind ||
    args.deleted
  ) {

    console.log('🚮 Syncing deleted.');

    console.log('deleted: ', result);

    for (const comparison of result.deleted) {
      const resourceMethodName = toMethodName(comparison.type);
      const updated = (await reactor[`delete${resourceMethodName}`](comparison.id)).data;

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
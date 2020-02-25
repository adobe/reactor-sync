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
    args.accessToken = await getAccessToken(args);
}

function checkEnvironment(args) {
  if (!args.environment) 
    throw Error('no "environment" property.');
  if (!args.environment.reactorUrl)
    throw Error('no "environment.reactorUrl" property.');
  return args.environment;
}

function transferSettings(args, settings) {
  args.propertyId = settings.propertyId;
  args.environment = settings.environment;
  args.integration = settings.integration;
}

async function getReactor(args, environment) {
  if (!args.reactor) {
    args.reactor = await new Reactor(args.accessToken, {
      reactorUrl: environment.reactorUrl
    });
  }
}

function shouldSync(args) {
  return (
    args.modified ||
    args.behind
  );
}

async function updateResource(reactor, resourceType, local) {
  const resourceName = resourceType.slice(0, -1);
  const update = (await reactor[`update${resourceName}`]({
    id: local.id,
    type: local.type,
    attributes: local.attributes
  })).data;
  maybeRevise(resourceType, reactor, local);
  return update;
}

async function maybeRevise(resource, reactor, local) {
  if (resource === ('Extension' || 'DataElement'))
    return await reactor.reviseExtension(local.id);
}

function toMethodName(string) {
  string = string.replace(/_([a-z])/g, (g) => {
    g.slice(0, -1);
    return g[1].toUpperCase();
  });
  return string.charAt(0).toUpperCase() + string.slice(1);
}


module.exports = async (args) => {
  const settings = checkSettings(args);
  const environment = checkEnvironment(args);
  const reactor = args.reactor;

  checkAccessToken(args);
  transferSettings(args, settings);
  getReactor(args, environment);

  const result = await diff(args);
  const shouldSyncSome = shouldSync(args);

  // added
  // for (const comparison of result.added) {
  //   // TODO: 
  // }

  // modified
  if (
    !shouldSyncSome ||
    args.modified
  ) {

    console.log('🔂 Syncing Modified.');

    for (const comparison of result.modified) {
      const local = await fromFile(comparison.path, args);
      // sync it
      const updated = updateResource(reactor, local.type, local);

      // Persist the updated files back in the form it is supposed to look like:
      await toFiles(updated, args); 

    }

  }

  // deleted
  // for (const comparison of result.deleted) {
  //   // TODO: 
  // }

  // behind
  if (
    !shouldSyncSome ||
    args.behind
  ) {

    console.log('↩️ Syncing behind.');

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
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

module.exports = async (args) => {

  const settingsPath = args.settingsPath || './.reactor-settings.json';

  let settings;

  // read the settings file.
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } else {
    throw Error('Launch Sync settings file does not exist.');
  }

  // transfer settings
  args.propertyId = settings.propertyId;
  args.environment = settings.environment;
  args.integration = settings.integration;

  // get the access token
  if (!args.accessToken) {
    args.accessToken = await getAccessToken(args);
  }

  const environment = args.environment;

  // check to make sure that we have all of the information we need
  if (!environment) {
    throw Error('no "environment" property.');
  }
  if (!environment.reactorUrl) {
    throw Error('no "environment.reactorUrl" property.');
  }

  if (!args.reactor) {
    args.reactor = await new Reactor(args.accessToken, {
      reactorUrl: environment.reactorUrl
    });
  }

  // first get the diff
  const result = await diff(args);

  const reactor = args.reactor;

  const shouldSyncSome = (
    args.modified ||
    args.behind
  );

  // added
  // for (const comparison of result.added) {
  //   // TODO: 
  // }

  // modified
  if (
    !shouldSyncSome ||
    args.modified
  ) {

    console.log('syncing modified');

    for (const comparison of result.modified) {

      const local = await fromFile(comparison.path, args);

      // sync it
      let updated;

      // properties
      if (local.type === 'properties') {

        updated = (await reactor.updateProperty({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

      // rules
      } else if (local.type === 'rules') {

        updated = (await reactor.updateRule({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

      // environments
      } else if (local.type === 'environments') {
        
        updated = (await reactor.updateEnvironment({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

      // data_elements
      } else if (local.type === 'data_elements') {

        updated = (await reactor.updateDataElement({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

        // special case...create a revision
        await reactor.reviseDataElement(local.id);

      // extensions
      } else if (local.type === 'extensions') {

        updated = (await reactor.updateExtension({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

        // special case...create a revision
        await reactor.reviseExtension(local.id);

      // rule_components
      } else if (local.type === 'rule_components') {

        updated = (await reactor.updateRuleComponent({
          id: local.id,
          type: local.type,
          attributes: local.attributes
        })).data;

        // TODO: figure out how to revise the rule
        // await reactor.reviseRule(local.relationships);

      }

      // persist the updated files back in the form it is supposed to look like
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

    console.log('syncing behind');

    for (const comparison of result.behind) {

      let updated;

      // retrieve the latest and save
      if (comparison.type === 'properties') {
        updated = (await reactor.getProperty(comparison.id)).data;
      } else if (comparison.type === 'rules') {
        updated = (await reactor.getRule(comparison.id)).data;
      } else if (comparison.type === 'environments') {
        updated = (await reactor.getEnvironment(comparison.id)).data;
      } else if (comparison.type === 'data_elements') {
        updated = (await reactor.getDataElement(comparison.id)).data;
      } else if (comparison.type === 'extensions') {
        updated = (await reactor.getExtension(comparison.id)).data;
      } else if (comparison.type === 'rule_components') {
        updated = (await reactor.getRuleComponent(comparison.id)).data;
      }
      
      await toFiles(updated, args); 

    }

  }

  // unchanged
  // for (const comparison of result.unchanged) {
  //   // TODO: 
  // }

};
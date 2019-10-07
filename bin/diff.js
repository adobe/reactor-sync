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
const diffProperty = require('./diff/property');

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
    args.accessToken = await getAccessToken(settings);
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

  // wait to run the diff on the property
  const result = await diffProperty(args);

  return result;
};
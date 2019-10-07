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
const jwt = require('jwt-simple');
const request = require('request-promise-native');

module.exports = async (settings) => {

  const integration = settings.integration;
  const environment = settings.environment;

  // check to make sure we have all of the correct information in the settings file
  if (!integration) {
    throw Error('settings file does not have an "integration" property.');
  }
  if (!integration.clientId) {
    throw Error('settings file does not have an "integration.clientId" property.');
  }
  if (!integration.clientSecret) {
    throw Error('settings file does not have an "integration.clientSecret" property.');
  }
  if (!integration.payload) {
    throw Error('settings file does not have an "integration.payload" property.');
  }
  if (!integration.privateKey) {
    throw Error('settings file does not have an "integration.privateKey" property.');
  }
  if (!environment) {
    throw Error('settings file does not have an "environment" property.');
  }
  if (!environment.jwt) {
    throw Error('settings file does not have an "environment.jwt" property.');
  }

  let privateKeyContent;

  // check the privateKey exists
  if (fs.existsSync(integration.privateKey)) {
    privateKeyContent = fs.readFileSync(integration.privateKey);
  } else {
    throw Error('Private Key file does not exist at that location.');
  }

  // generate a jwtToken
  integration.payload.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const jwtToken = jwt.encode(integration.payload, privateKeyContent, 'RS256');

  // Make a request to exchange the jwt token for a bearer token
  try {

    const body = await request({
      method: 'POST',
      url: environment.jwt,
      headers: {
        'Cache-Control': 'no-cache'
      },
      form: {
        client_id: integration.clientId,
        client_secret: integration.clientSecret,
        jwt_token: jwtToken
      },
      transform: JSON.parse
    });

    return body.access_token;

  } catch (e) {

    console.log(e);

    const parsedErrorObject = JSON.parse(e.error);
    
    throw new Error(`Error retrieving access token. ${parsedErrorObject.error_description}.  Please check the values in the settings file are still valid`);

  }

};
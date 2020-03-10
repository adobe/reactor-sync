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

const fromFile = require('../utils/fromFile');
const compare = require('./compare');
const diffDataElements = require('./dataElements');
const diffEnvironments = require('./environments');
const diffExtensions = require('./extensions');
const diffRules = require('./rules');
const diffRuleComponents = require('./ruleComponents');

module.exports = async (args) => {

  var result = {
    added: [],
    modified: [],
    deleted: [],
    behind: [],
    unchanged: [],
  };
  const propertyId = args.propertyId;
  const reactor = args.reactor;

  const propertyPath = `./${propertyId}`;

  // get the local property
  const local = await fromFile(propertyPath, args);
  // get the property from launch
  const remote = (await reactor.getProperty(propertyId)).data;

  // diff the property
  let comparison = compare(local, remote, result);
  result[comparison.result]
  .push({
    type: local.type,
    id: local.id,
    path: propertyPath,
    details: comparison.details, 
  });

  await Promise.all([
    // diff data elements
    diffDataElements(args, result),
    // diff data elements
    // diffEnvironments(args, result),
    // diff data elements
    diffExtensions(args, result),
    // diff data elements
    // diffRules(args, result),
    // diff data elements
    // diffRuleComponents(args, result),
  ]);
  // ]).catch(error => console.error(`📛 ${error}`));

  return result;
};
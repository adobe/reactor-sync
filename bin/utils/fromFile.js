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
const readFile = require('./readFile');

module.exports = async (path, args) => {

  const reactor = args.reactor;

  let stats;

  try {
    stats = fs.statSync(path);
  } catch (e) {
    throw Error(`${path} does not exist.`);
  }

  // make sure it is a directory
  if (stats.isDirectory()) {

    const dataPath = `${path}/data.json`;
    const settingsPath = `${path}/settings.json`;

    let data;
    let settings;

    // first get the data file
    data = readFile(dataPath);

    // determine transforms
    let transforms;

    // dataElements
    if (data.type === 'data_elements') {

      if (
        data.relationships.updated_with_extension_package &&
        data.relationships.updated_with_extension_package.data
      ) {

        const extensionPackage = (await reactor.getExtensionPackage(
          data.relationships.updated_with_extension_package.data.id
        )).data;

        // data elements
        let items = extensionPackage.attributes.data_elements;

        // find the correct rule_component that goes with this type
        transforms = items.find((item) => (
          item.id === data.attributes.delegate_descriptor_id
        )).transforms;

      }

    // extensions
    } else if (data.type === 'extensions') {

      if (
        data.relationships.extension_package &&
        data.relationships.extension_package.data
      ) {

        const extensionPackage = (await reactor.getExtensionPackage(
          data.relationships.extension_package.data.id
        )).data;

        if (
          extensionPackage.attributes.configuration && 
          extensionPackage.attributes.configuration.transforms
        ) {
          transforms = extensionPackage.attributes.configuration.transforms;
        }

      }

    // rule_components
    } else if (data.type === 'rule_components') {

      if (
        data.relationships.updated_with_extension_package &&
        data.relationships.updated_with_extension_package.data
      ) {

        let items;
        
        const extensionPackage = (await reactor.getExtensionPackage(
          data.relationships.updated_with_extension_package.data.id
        )).data;

        // if actions
        if (
          data.attributes.delegate_descriptor_id.indexOf('::actions::') !== -1 &&
          extensionPackage.attributes.actions
        ) {
          items = extensionPackage.attributes.actions;

        // if events
        } else if (
          data.attributes.delegate_descriptor_id.indexOf('::events::') !== -1 &&
          extensionPackage.attributes.events
        ) {
          items = extensionPackage.attributes.events;

        // if conditions
        } else if (
          data.attributes.delegate_descriptor_id.indexOf('::conditions::') !== -1 &&
          extensionPackage.attributes.conditions
        ) {
          items = extensionPackage.attributes.conditions;
        }

        // find the correct rule_component that goes with this type
        transforms = items.find((item) => (
          item.id === data.attributes.delegate_descriptor_id
        )).transforms;

      }

    }

    // first get the settings file
    if (fs.existsSync(settingsPath)) {
      settings = readFile(settingsPath);

      // then get any other files in the directory that start with "settings."
      const files = fs.readdirSync(path);

      // set
      const set = function (path, obj, value) {
        var
          parts,
          part,
          i, il;

        // break into parts
        parts = path.split('.');

        // loop through parts
        for (i = 0, il = parts.length; i < il; i++) {
          part = parts[i];

          // if it is the last part, set it to the value
          if (i === il - 1) {
            obj[part] = value;
          // otherwise drop down
          } else {
            // default if it doesn't already exist and step into
            obj = obj[part] = (obj[part] || {});
          }

        }

      };

      files.forEach(function (file) {

        // short circut these two files
        if (
          file === 'data.json' || 
          file === 'settings.json'
        ) {
          return;
        }

        const filePath = `${path}/${file}`;

        // read the file
        let value = fs.readFileSync(filePath, 'utf8');

        // reverse transforms
        if (transforms) {

          // find the transform for this file
          const transform = transforms.find((transform) => (
            file === `settings.${transform.propertyPath}.js`
          ));

          // if we found it
          if (transform) {

            // function 
            if (transform.type === 'function') {

              // remove our autogenerated code
              value = value.replace(/\s?\/\/==== START TRANSFORM CODE - DO NOT REMOVE ====[\s\S]*?\/\/==== END TRANSFORM CODE ====\s?/gm, '');

            // file or customCode
            } else if (
              transform.type === 'file' ||
              transform.type === 'customCode'
            ) {

              // No replacements needed

            // remove
            } else if (
              transform.type === 'remove'
            ) {

              // No replacements needed

            } else {
              console.error('unrecognized transform');
              console.log(transform);
            }

            // set the value on the settings object
            set(transform.propertyPath, settings, value);

          } else {
            // TODO: Throw? 
          }
        }

      });

      // finally set it as a stringified value on the attributes object.
      data.attributes.settings = JSON.stringify(settings);
    
    }

    return data;

  } else {
    throw Error(`${path} is not a directory.`);
  }

};
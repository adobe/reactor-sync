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
const mkdirp = require('mkdirp');
const sanitize = require('sanitize-filename');

function checkCreateDir(localPath) {
  if (!fs.existsSync(localPath))
    mkdirp(localPath);
}

function getLocalPath(data, args) {
  const propertyPath = `./${args.propertyId}`;
  return { 
    'localPath': `${propertyPath}/${data.type}/${data.id}`,
    'localDirectory': `${propertyPath}/${data.type}`
  };
}

function sanitizeName(data) {
  // create a name that links to the original file
  if (data.attributes.name) {
    return '_' + sanitize(data.attributes.name, {
      replacement: '_'
    });
  }
}

function makeSymLink(localDirectory, sanitizedName, data) {
  if (!fs.existsSync(`${localDirectory}/${sanitizedName}`)) {
    mkdirp(`${localDirectory}/${sanitizedName}`);
    fs.symlinkSync(data.id, `${localDirectory}/${sanitizedName}`, 'dir');
  }
}

function sanitizeLink(data, localDirectory) {
  const sanitizedName = sanitizeName(data);
  if (sanitizeName(data))
    makeSymLink(localDirectory, sanitizedName, data);
}

function writeDataJson(localPath, data) { 
  fs.writeFileSync(
    `${localPath}/data.json`,
    JSON.stringify(data, null, '  ')
  );
}

function getSettings(data, localPath) {
  let settings = JSON.parse(data.attributes.settings);

  if (settings) {
    fs.writeFileSync(
      `${localPath}/settings.json`,
      JSON.stringify(settings, null, '  ')
    );
    return settings;
  }
}

async function toFiles(data, args) {
  const reactor = args.reactor;
  const { localPath, localDirectory } = getLocalPath(data, args);

  checkCreateDir(localPath);
  sanitizeLink(data, localDirectory);
  writeDataJson(localPath, data);

  // if the data has settings, make changes to it
  if (data.attributes.settings) {
    const settings = getSettings(data, localPath);

    if (settings) {
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

          // transforms
          transforms = extensionPackage.attributes.configuration.transforms;
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

      if (transforms) {
        const get = function (path, obj) {
          var
            parts,
            part,
            value = '',
            i, il;

          // break into parts
          parts = path.split('.');

          // loop through parts
          for (i = 0, il = parts.length; i < il; i++) {
            part = parts[i];

            // if that path exists
            if (obj[part]) {
              // if it is the last part
              if (i === il - 1) {
                value = obj[part];
              // otherwise drop down
              } else {
                obj = obj[part];
              }
            } else {
              break;
            }
          }

          return value;
        };

        // loop through and make the transform and save
        transforms.forEach(function (transform) {
          var value;

          // get the value
          value = get(transform.propertyPath, settings);

          // if we didn't get anything back
          if (!value) return;
          
          // function 
          if (transform.type === 'function') {

            value = `//==== START TRANSFORM CODE - DO NOT REMOVE ====
function (${transform.parameters ? transform.parameters.join(', ') : ''}) {
//==== END TRANSFORM CODE ====
${value}
//==== START TRANSFORM CODE - DO NOT REMOVE ====
}
//==== END TRANSFORM CODE ====`;

            // write the settings file.
            fs.writeFileSync(
              `${localPath}/settings.${transform.propertyPath}.js`,
              value
            );

          // file or customCode
          } else if (
            transform.type === 'file' ||
            transform.type === 'customCode'
          ) {
            // write the settings file.
            fs.writeFileSync(
              `${localPath}/settings.${transform.propertyPath}.js`,
              value
            );
          } else {
            console.error('unrecognized transform');
            console.log(transform);
          }
        });
      }
    }
  }
}

module.exports = toFiles;
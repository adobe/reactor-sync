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

const fromFile = require('./utils/fromFile');
const toFiles = require('./utils/toFiles');
const setSettings = require('./utils/setSettings');
const toMethodName = require('./utils/resourceName');
const { crudResourceOr, isMethod } = require('./utils/resourceUtils');
const diff = require('./diff');


module.exports = async (args) => {
  const settings = await setSettings(args);
  const result = await diff(settings);

  // added
  // for (const comparison of result.added) {
  //   // TODO: 
  // }

  if (isMethod(args, 'modified')) {
    console.log('🔂 Syncing Modified.');

    for (const comparison of result.modified) {
      const local = await fromFile(comparison.path, args);
      // sync it
      const updated = await crudResourceOr(settings.reactor, 'update', local);

      // Persist the updated files back in the form it is supposed to look like:
      await toFiles(updated, args); 
    }
  }

  if (isMethod(args, 'behind')) {
    console.log('↩️  Syncing behind.');

    for (const comparison of result.behind) {
      const resourceMethodName = toMethodName(comparison.type);
      const updated = (await settings.reactor[`get${resourceMethodName}`](comparison.id)).data;
      
      await toFiles(updated, args); 
    }
  }

  // unchanged
  // for (const comparison of result.unchanged) {
  //   // TODO: 
  // }
};

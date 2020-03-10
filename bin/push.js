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

const setSettings = require('./utils/setSettings');
const fromFile = require('./utils/fromFile');
const toFiles = require('./utils/toFiles');
const toMethodName = require('./utils/resourceName');
const { crudResourceOr, isMethod } = require('./utils/resourceUtils');
const diff = require('./diff');


async function push(args) {
  const settings = await setSettings(args);
  const result = await diff(args);

  if (isMethod(args, 'modified')) {
    console.log('🔂 Pushing Modified: ', result.modified);

    for (const comparison of result.modified) {
      if (comparison.type === 'rule_components') continue;
      const local = await fromFile(comparison.path, settings);
      await crudResourceOr(settings.reactor, 'update', local);
    }
  }

  if (isMethod(args, 'deleted')) {
    console.log('🚮 Pushing Deleted: ', result.deleted);

    for (const comparison of result.deleted) {
      if (comparison.type === 'rule_components') continue;
      const resourceMethodName = toMethodName(comparison.type, true);
      await settings.reactor[`delete${resourceMethodName}`](comparison.id);
    }
  }

  if (isMethod(args, 'added')) {
    console.log('🆕 Pushing Added: ', result.added);

    for (const comparison of result.added) {
      if (comparison.type === 'rule_components') continue;
      const local = await fromFile(comparison.path, settings);
      const added = await crudResourceOr(settings.reactor, 'create', local);
      if (added) await toFiles(added, settings);
    }
  }
}

module.exports = push;

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


function getResult(resultType, details) {
  return {
    result: resultType,
    details
  };
}

module.exports = (local, remote) => {
  let same = true;
  let details = {};
  let localExists = local && local.attributes;
  let remoteExists = remote && remote.attributes;

  // if we have the local, but not the remote
  if (
    localExists && 
    !remoteExists
  ) {
    return {
      result: 'added'
    };
  }

  // if we have the remote, but not the local
  if (
    !localExists && 
    remoteExists
  ) {
    // TODO: determine when this should be deleted or behind...
    // TODO: deleted can best be accomplished with a: pull -> human change resulting in a diff -> push
    // return {
    //   result: 'deleted'
    // };
    return {
      result: 'behind'
    };
  }

  // finally do a comparison of attributes 
  for (let attribute in local.attributes) {
    if (!local.attributes.hasOwnProperty(attribute)) {
      continue;
    }

    let localType = typeof(local.attributes[attribute]);
    let remoteType = typeof(remote.attributes[attribute]);

    // if it is a settings object, parse it and then stringify it again because
    // of the unicode escape sequences within...
    if (attribute === 'settings') {
      if (localExists) {
        local.attributes[attribute] = JSON.stringify(JSON.parse(local.attributes[attribute]));
      }
      if (remoteExists) {
        remote.attributes[attribute] = JSON.stringify(JSON.parse(remote.attributes[attribute]));
      }
    }

    // if attributes don't match
    if (
      // make sure the types are good
      localType !== remoteType ||
      // make sure the values are the same (serialize and then compare)
      JSON.stringify(local.attributes[attribute]) !==
        JSON.stringify(remote.attributes[attribute])
    ) {
      same = same && false;

      // add some details
      details.attributes = details.attributes || {};
      details.attributes[attribute] = details.attributes[attribute] || {};
      details.attributes[attribute].local = local.attributes[attribute];
      details.attributes[attribute].remote = remote.attributes[attribute];
    }

  }

  // TODO: walk relationships as well and check whether they are different or not
  if (!same) {
    // TODO: How do we figure out if local changes were made, but not synced yet.
    // In other words, how do we figure out a MERGE conflict?

    // compare dates updated first
    const localDate = new Date(local.attributes.updated_at);
    const remoteDate = new Date(remote.attributes.updated_at);

    // if the remote object's date is greater than the local one, that means that 
    // the remote object was updated and we may have a sync issue.
    if (remoteDate > localDate) {
      return getResult('behind', details);
    }
    return getResult('modified', details);
  }

  return {
    result: 'unchanged'
  };
};
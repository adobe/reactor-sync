const toMethodName = require('./resourceName');
const toFiles = require('../utils/toFiles');
const deleteDirectory = require('../utils/deleteDirectory');
const pleaseResolveManually = '🚑 Please resolve manually and try again.';


async function crudExtension(reactor, method, local) {
  return (await reactor[`${method}Extension`](
    local.id,
    { data: {
      id: local.id,
      type: local.type,
      attributes: local.attributes,
      relationships: local.relationships 
    }})).data;
}

async function createResource(reactor, resourceName, local) {
  const createResponse = await reactor[`create${resourceName}`](
    local.relationships.property.data.id,
    { id: local.id,
      type: local.type,
      attributes: local.attributes,
      relationships: local.relationships 
    }).catch(error => { 
    console.error(`🚨 Failed to create${resourceName}() in createResource(): ${error}`);
    console.error('Tried to create with this: ', local);
  });
  if (createResponse && createResponse.data)
    return createResponse.data;
  return false;
}

async function updateResource(reactor, resourceName, local) {
  return (await reactor[`update${resourceName}`]({
    id: local.id,
    type: local.type,
    attributes: local.attributes
  })).data;
}

async function createOrUpdate(reactor, method, resourceName, local) {
  if (method === 'update') 
    return await updateResource(reactor, resourceName, local);
  if (method === 'create') 
    return await createResource(reactor, resourceName, local);
}

async function crudResource(reactor, method, local) {
  const resourceName = toMethodName(local.type, true);
  const update = await createOrUpdate(reactor, method, resourceName, local);
  maybeRevise(resourceName, reactor, local);
  return update;
}

async function crudResourceOr(reactor, method, local) {
  if (local.type === 'extensions' && method !== 'create') 
    return await crudExtension(reactor, method, local);
  return await crudResource(reactor, method, local);
}

async function maybeRevise(resourceName, reactor, local) {
  if (resourceName === ('Extension' || 'DataElement'))
    return await reactor[`revise${resourceName}`](local.id);
}

function isMethod(args, method) {
  return !args.modified || !args.behind ||
    !args.added || !args.deleted ||
    args[`${method}`];
}

function exitOnDupId(localIds, local) {
  if (localIds.includes(local.id)) 
    throw new Error(`
A duplicate data_element ID value was found for ${local.attributes.name} - ${local.id}
    
${pleaseResolveManually}`);
}

function compareAttributes(local, remote) {
  return JSON.stringify(local.attributes.settings) !==
  JSON.stringify(remote.attributes.settings);
}

async function saveRemoteId(localPath, remoteName, args) {
  deleteDirectory(localPath);
  await toFiles(remoteName, args);
}

function attributeMismatchError(local, remoteName) {
  throw new Error(`A data_element was found with the same name as a remote data_element but with a different ID value:

     local: ${local.attributes.name} - ${local.id}
     remote: ${remoteName.attributes.name} - ${remoteName.id}
     
${pleaseResolveManually}`);
}

function nameIdCheck(remotes, local, localPath, args) {
  const remoteName = remotes.find((remote) => (local.attributes.name === remote.attributes.name));

  if (!remoteName) return;
  if (local.id !== remoteName.id) {
    if (compareAttributes(local, remoteName))
      return attributeMismatchError(local, remoteName);
    
    saveRemoteId(localPath, remoteName, args);
  }
}

function mismatchCheck(localIds, remotes, local, localPath, args) {
  exitOnDupId(localIds, local);
  nameIdCheck(remotes, local, localPath, args);
  localIds.push(local.id);
}

function setResult(inResult) {
  return inResult || {
    added: [],
    modified: [],
    deleted: [],
    behind: [],
    unchanged: [],
  };
}

module.exports = {
  setResult,
  mismatchCheck,
  crudResourceOr,
  maybeRevise,
  isMethod
};
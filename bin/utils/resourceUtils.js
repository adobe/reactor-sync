const fromFile = require('./fromFile');
const { writeDataJson } = require('./writeResources');
const toMethodName = require('./resourceName');


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

async function saveResourceId(namedPath, createResponse, settings) {
  // console.log('⚫️ settings: ', settings);
  const namedResource = await fromFile(namedPath, settings);
  namedResource.id = createResponse.id;
  writeDataJson(namedPath, namedResource);
}


async function createResource(reactor, resourceName, local) {
  // console.log('💚 local.property: ', local.relationships.property.data.id);
  // console.log('💚 local.name: ', local.attributes.name);
  const createResponse = await reactor[`create${resourceName}`](
  // return (await reactor[`create${resourceName}`](
    local.relationships.property.data.id,
    { id: local.id,
      type: local.type,
      attributes: local.attributes,
      relationships: local.relationships
    // }).catch(error => console.error(`create${resourceName}() error: ${error}`))
    // ).data;
    }).catch(error => { 
    console.error(`🚨 Failed to create${resourceName}() in createResource(): ${error}`);
    console.error('Tried to create with this: ', local);
  });
    // }).catch(() => '');
  console.log('💚 createResponse: ', createResponse);
  console.log('💚 resourceName: ', resourceName);
  if (createResponse && createResponse.data)
    return createResponse.data;
  // console.error('🚨No createResponse.data from createResource(). Tried to create with this: ', local);
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
  // console.log(`💚 ${method}${resourceName}`);
  const update = await createOrUpdate(reactor, method, resourceName, local);
  console.log('💚 update: ', update);
  maybeRevise(resourceName, reactor, local);
  return update;
}

async function crudResourceOr(reactor, method, local) {
  // if (local.type === 'rule_components') return await crudRuleComponent(reactor, method, local);
  if (local.type === 'extensions') return await crudExtension(reactor, method, local);
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

module.exports = {
  saveResourceId,
  crudResourceOr,
  maybeRevise,
  isMethod
};
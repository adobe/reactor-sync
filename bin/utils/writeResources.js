const toFiles = require('./toFiles');
const toMethodName = require('./resourceName');


function formArgs(resourceType, args) {
  return {
    propertyId: args.propertyId,
    reactor: args.reactor,
    propertyPath: `./${args.propertyId}`,
    dataElementsPath: `${args.propertyId}/${resourceType}`
  };
}

function writeAll(data, resourceType, settings) {
  data.forEach( resource => 
    toFiles(resource, formArgs(resourceType, settings))
  );
}

function getPropertyOr(resourceName) {
  if (resourceName === 'Property') {
    return 'getProperty';
  }
  return `list${resourceName}ForProperty`;
}
function listResources(settings, resourceName, resourceType) {
  // console.log(`🔴 ${getPropertyOr(resourceName)}`);
  // console.log(`🔴 ${settings.propertyId}`);
  settings.reactor[`${getPropertyOr(resourceName)}`](settings.propertyId)
  .then(({ data: adobeResources }) => {
    writeAll(adobeResources, resourceType, settings);
  });
}


function writeResources(resourceTypes, settings) {
  resourceTypes.forEach( resourceType => {
    const resourceName = toMethodName(resourceType, false);
      
    try {
      // console.log(`🔴 args.propertyId: ${args.propertyId}`);
      return listResources(settings, resourceName, resourceType);
    } catch (error) {
      console.error('🚨Error in writeResources(): ', error);
    }
  });
}

module.exports = writeResources;
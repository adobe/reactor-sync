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
function listResources(reactor, resourceName, resourceType, args) {
  // console.log(`🔴 ${getPropertyOr(resourceName)}`);
  reactor[`${getPropertyOr(resourceName)}`](args.propertyId)
  .then(({ data: adobeResources }) => {
    writeAll(adobeResources, resourceType, args);
  });
}


function writeResources(resourceTypes, settings, args) {
  resourceTypes.forEach( resourceType => {
    const resourceName = toMethodName(resourceType, false);
      
    try {
      // console.log(`🔴 args.propertyId: ${args.propertyId}`);
      return listResources(settings.reactor, resourceName, resourceType, args);
    } catch (error) {
      console.error('🚨Error in writeResources(): ', error);
    }
  });
}

module.exports = writeResources;
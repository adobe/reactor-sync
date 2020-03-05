const toFiles = require('./utils/toFiles');


function formArgs(resourceType, args) {
  return {
    propertyId: args.propertyId,
    reactor: args.reactor,
    propertyPath: `./${args.propertyId}`,
    dataElementsPath: `${args.propertyId}/${resourceType}`
  };
}

function writeResources(reactor, resourceTypes, args) {
  resourceTypes.forEach( resourceType => {
    try {
      reactor[`list${resourceType}ForProperty`](args.propertyId).then(({ data: adobeResource }) => {
        toFiles(adobeResource, formArgs(resourceType, args));
      });
    } catch (error) {
      console.error('🚨Error in writeResources(): ', error);
    }
  });
}

module.exports = { writeResources };
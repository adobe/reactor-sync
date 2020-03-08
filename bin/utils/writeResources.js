const fs = require('fs');
const toFiles = require('./toFiles');
const toMethodName = require('./resourceName');
const ruleComponentsName = 'rule_components';
const pages = { 'page[size]': 999 };

function formArgs(resourceType, args) {
  return {
    propertyId: args.propertyId,
    reactor: args.reactor,
    propertyPath: `./${args.propertyId}`,
    dataElementsPath: `${args.propertyId}/${resourceType}`
  };
}

function writeRemaining(data, resourceType, settings) {
  if (data.constructor.name == 'Array') {
    data.forEach( resource => toFiles(resource, formArgs(resourceType, settings)));
  } else { toFiles(data, formArgs(resourceType, settings)); }
}

function writeRuleComponent(resourceTypes, resourceType, adobeResources, settings) {
  for (let rule of adobeResources) {
    settings.reactor.listRuleComponentsForRule(rule.id, pages)
    .then((adobeRuleComponents) => {
      writeRemaining(adobeRuleComponents, resourceType, settings);
    });
  }
}

function writeRuleComponentOr(resourceTypes, resourceType, adobeResources, settings) {
  if (resourceType === 'rule' && resourceTypes.includes(ruleComponentsName))
    writeRuleComponent(resourceTypes, resourceType, adobeResources, settings);
}

function getPropertyOr(resourceName) {
  if (resourceName === 'Property') return 'getProperty';
  return `list${resourceName}ForProperty`;
}

function writeAll(resourceTypes, resourceType, adobeResources, settings) {
  writeRuleComponentOr(resourceTypes, resourceType, adobeResources, settings);
  writeRemaining(adobeResources, resourceType, settings);
}

function listResources(settings, resourceName, resourceType, resourceTypes) {
  settings.reactor[`${getPropertyOr(resourceName)}`](settings.propertyId, pages)
  .then(({ data: adobeResources }) => 
    writeAll(resourceTypes, resourceType, adobeResources, settings)
  );
}

function writeDataJson(localPath, data) { 
  fs.writeFileSync(
    `${localPath}/data.json`,
    JSON.stringify(data, null, '  ')
  );
}

function writeResources(resourceTypes, settings) {
  resourceTypes.forEach( (resourceType, index, resourceTypes) => {
    if (resourceType === ruleComponentsName) return;
    const resourceName = toMethodName(resourceType, false);
      
    try {
      return listResources(settings, resourceName, resourceType, resourceTypes);
    } catch (error) {
      console.error('🚨Error in writeResources(): ', error);
    }
  });
}

module.exports = {
  writeResources,
  writeDataJson
};
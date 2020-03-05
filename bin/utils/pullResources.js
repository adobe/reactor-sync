const writeResources = require('./utils/writeResources');
const resourceTypes = ['data_elements', 'property', 'extensions', 'rules', 'rule_components', 'environments'];

writeResources(reactor, resourceTypes, args);
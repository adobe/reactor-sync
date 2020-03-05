const writeResources = require('./utils/writeResources');
const checkAccessToken = require('./utils/getAccessToken');
const checkArgs = require('./utils/checkArgs');
const getReactor = require('./utils/getReactor');

// const resourceTypes = ['data_elements', 'property', 'extensions', 'rules', 'rule_components', 'environments'];
const resourceTypes = ['data_elements'];


async function pull(args) {
  const settings = checkArgs(args);
  settings.accessToken = await checkAccessToken(settings);
  settings.reactor = await getReactor(settings);
  // console.log('🔴 settings: ', settings);
  // console.log('🔴 reactor: ', reactor);
  writeResources(resourceTypes, settings, args);
}

module.exports = pull;
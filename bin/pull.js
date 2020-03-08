const startSpinner = require('./utils/startSpinner');
const { writeResources } = require('./utils/writeResources');
const setSettings = require('./utils/setSettings');
const resourceTypes = ['data_elements', 'property', 'extensions', 'rules', 'rule_components', 'environments'];


async function pull(args) {
  const spinner = startSpinner('Pulling resources \n', 'blue');
  const settings = await setSettings(args);
  writeResources(resourceTypes, settings);
  spinner.stop();
}

module.exports = pull;
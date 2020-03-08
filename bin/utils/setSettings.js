const fs = require('fs');
const checkAccessToken = require('./getAccessToken');
const getReactor = require('./getReactor');


function checkSettings(args) {
  const settingsPath = args.settingsPath || './.reactor-settings.json';
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } else {
    return console.error(`Launch Sync settings file at: ${settingsPath} does not exist.`);
  }
}

function checkEnvironment(settings) {
  if (!settings.environment) {
    console.error('No "environment" property.');
  }
  if (!settings.environment.reactorUrl) {
    console.error('No "environment.reactorUrl" property.');
  }
  return settings.environment;
}

function checkArgs(args) {
  const settings = checkSettings(args);
  checkEnvironment(settings);
  return settings;
}

async function setSettings(args) {
  const settings = checkArgs(args);
  settings.accessToken = await checkAccessToken(settings);
  settings.reactor = await getReactor(settings);
  return settings;
}

module.exports = setSettings;
const ora = require('ora');

function startSpinner(message, color) {
  const spinner = ora(message);
  spinner.color = color;
  return spinner.start();
}

module.exports = startSpinner;
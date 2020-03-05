

function makeSingular(resourceName) {
  if (resourceName.slice(-3) === 'ies') {
    return resourceName.replace('ies', 'y');
  }
  if (resourceName.slice(-1) === 's') {
    return resourceName.slice(0, -1); // Remove the "s", i.e.: "data_elements" -> DataElement
  }
  return resourceName;
}

function removeUnderscore(resourceName) {
  const splitName = resourceName.split('_');
  const capitalize = str => str[0].toUpperCase() + str.slice(1);
  return splitName.map(capitalize).join('');
}

function toMethodName(resourceName) {
  resourceName = makeSingular(resourceName);
  return removeUnderscore(resourceName);
}

module.exports = {
  toMethodName
};
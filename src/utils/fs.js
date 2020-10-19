const promisify = require('./promisify');
const fs = require('fs');

exports.readFile = promisify(fs.readFile);
exports.writeFile = promisify(fs.writeFile);
exports.exists = function(filename) {
  return new Promise(resovle => {
    fs.exists(filename, resovle);
  })
}

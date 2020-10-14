const Parser = require('./Parser');
const Module = require('./Module');
const fs = require('./utils/fs');

let parser;

module.exports = async function(path, options, callback) {
  if(!parser) {
    parser = new Parser(options || {});
  }

  let mod = new Module(path, options);
  mod.code = await fs.readFile(path, 'utf-8');
  mod.ast = parser.parse(path, mod.code);
  mod.collectDependencies();

  callback(null, Array.from(mod.dependencies));
}

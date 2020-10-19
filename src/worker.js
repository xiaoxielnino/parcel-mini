const Parser = require('./Parser');
const fs = require('./utils/fs');
const babel = require('./transforms/babel');;

process.on('unhandledRejection', console.error);

let parser;

function emit(event, ...args) {
  process.send({ event, args})
}

module.exports = async function(path, options, callback) {
  if(!parser) {
    parser = new Parser(options || {});
  }

  // let mod = new Module(path, options);
  // mod.code = await fs.readFile(path, 'utf-8');
  // mod.ast = parser.parse(path, mod.code);
  // mod.collectDependencies();

  let asset = parser.getAsset(path, options);
  await asset.getDependencies();

  await babel(asset);

  callback(null,{
    deps: Array.from(asset.dependencies),
    contents: asset.contents
  });
}

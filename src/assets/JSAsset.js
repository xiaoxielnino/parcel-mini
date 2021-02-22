const traverse = require('babel-traverse').default;
const collectDependencies  = require('../visitors/dependencies');
const walk = require('babylon-walk');
const Asset = require('../Asset');
const babylon = require('babylon');

const IMPORT_RE = /import|export [^;]* from|require\s\(/
const GLOBAL_RE = /process|__dirname|__filename|global|Buffer/;
class JSAsset extends Asset {

  constructor(name, pkg, options) {
    super(name, pkg, options);
    this.type = 'js';
    this.globals = new Map;
    this.isAstDirty = false;
  }

  mightHaveDependencies() {
    return IMPORT_RE.test(this.contents) || GLOBAL_RE.test(this.contents)
  }
  parse(code) {
    const options = {
      filename: this.name,
      allowReturnOutsideFunction: true,
      allowHashBang: true,
      ecmaVersion: Infinity,
      strictMode: false,
      sourceType: 'module',
      locations: true,
      plugins: [
        'asyncFunctions',
        'asyncGenerators',
        'classConstructorCall',
        'classProperties',
        'decorators',
        'exportExtensions',
        'dynamicImport',
        'jsx',
        'flow'
      ]
    };

    return babylon.parse(code, options);
  }

  traverse(visitor) {
    return traverse(this.ast, visitor, null, this);
  }

  traverseFast(visitor) {
    return walk.simple(this.ast, visitor, this);
  }

  collectDependencies() {
    this.traverseFast(collectDependencies);
  }
}

module.exports = JSAsset;

const promisify = require('./utils/promisify');
const resolve = promisify(require('browser-resolve'));
const builtins = require('node-libs-browser');
const path = require('path');


class Resolver {
  constructor(options = {}) {
    this.options = options;
    this.cache = new Map;
  }

  async resolve(filename, parent) {
    let key = (parent ? path.dirname(parent) : '') + ':' + filename;
    if(this.cache.has(key)) {
      return this.cache.get(key)
    }

    let res = await resolve(filename, {
      filename: parent,
      paths: this.options.paths,
      modules: builtins
    });

    if(Array.isArray(res)) {
      res = res[0];
    }
    this.cache.set(key, res);
    return res;
  }
}

module.exports = Resolver;

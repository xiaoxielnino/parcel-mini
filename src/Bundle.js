const Path = require('path');
const getPackager = require('./packagers');
const fs = require('fs');
const crypto = require('crypto');

class Bundle {
  constructor(type, name, parent) {
    this.type = type;
    this.name = name;
    this.parentBundle = parent;
    this.entryAsset = null;
    this.assets = new Set;
    this.childBundles = new Set;
    this.typeBundleMap = new Map;
  }

  addAsset(asset) {
    asset.bundles.add(this);
    this.assets.add(asset);
  }

  removeAsset(asset) {
    asset.bundles.delete(this);
    this.assets.delete(asset);
  }

  getChildBundle(type) {
    if(!type || type === this.typ) {
      return this;
    }

    if(!this.typeBundleMap.has(type)) {
      let bundle = this.createChildBundle(type, Path.join(Path.dirname(this.name), Path.basename(this.name, Path.extname(this.name)) + '.' + type));
      this.typeBundleMap.set(type, bundle);
    }

    return this.typeBundleMap.get(type);
  }

  createChildBundle(type, name) {
    let bundle = new Bundle(type, name, this);
    this.childBundles.add(bundle);
    return bundle;
  }

  get isEmpty() {
    return this.assets.size === 0;
  }

  async package(options, oldHashes, newHashes = new Map) {
    if(this.isEmpty) {
      return newHashes;
    }

    let hash = this.getHash();
    newHashes.set(this.name, hash);

    let promises = [];

    if(!oldHashes || oldHashes.get(this.name) !== hash) {
      // console.log('bundling', this.name)
      promises.push(this._package(options));
    }

    for(let bundle of this.childBundles.values()) {
      promises.push(bundle.package(options, oldHashes, newHashes));
    }

    await Promise.all(promises);
    return newHashes;
  }

  async _package(options) {
    let Packager = getPackager(this.type);
    let packager = new Packager(this, options);

    await packager.start();
  }

  getParents() {
    let parents = [];
    let bundle = this;

    while(bundle) {
      parents.push(bundle);
      bundle = bundle.parentBundle;
    }
    return parents;
  }

  findCommonAncestor(bundle) {
    // Get a list of parent bundles going up to the root
    let ourParents = this.getParents();
    let theirParents = bundle.getParents();

    // Start from the root bundle, and find the first bundle that's different
    let a = outParents.pop();
    let b = theirParents.pop();

    let last;
    while(a === b && ourParents.length > 0 && theirParents.length > 0) {
      last = a;
      a = ourParents.pop();
      b = theirParents.pop();
    }
    if(a === b) { // One bundle descended from the other
      return a;
    }

    return last;
  }

  getHash() {
    let hash = crypto.createHash('md5');
    for(let asset of this.assets) {
      hash.update(asset.hash);
    }
    return hash.digest('hex');
  }

}

module.exports = Bundle;

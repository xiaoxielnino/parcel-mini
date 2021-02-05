const fs = require('./utils/fs');
const Resolver = require('./Resolver');
const WorkerFarm = require('./WorkerFarm');
const Parser = require('./Parser');
const Path = require('path');
const FSCache = require('./FSCache');
const { FSWatcher } = require('chokidar');
const HMRServer = require('./HMRServer');
const Bundle = require('./Bundle');
const md5 = require('./utils/md5');


class Bundler {
  constructor(main, options) {
    this.mainFile = main;
    this.options = this.normalizeOptions(options);
    this.resolver = new Resolver(options);
    this.parser = new Parser(options);
    this.cache = this.options.enableCache ? new FSCache(options) : null;

    this.loadedAssets = new Map;
    this.farm = null;
    this.watcher = null;
    this.hmr = null;
    this.bundleHashes = null;
  }

  normalizeOptions(options) {
    let isProduction = options.production || process.env.NODE_ENV === 'production';
    return Object.assign(options, {
      outDir: Path.resolve(options.outDir || 'dist'),
      watch: typeof options.watch === 'boolean' ? options.watch : !isProduction,
      enableCache: typeof options.enableCache === 'boolean' ? options.enableCache : true,
      killWorkers: typeof options.killWorkers === 'boolean' ? options.killWorkers : true,
      minify: typeof options.minify === 'boolean' ? options.minify : isProduction,
      hmr: typeof options.hmr === 'boolean' ? options.hmr : !isProduction
    })
  }

  async bundle() {
    this.farm = WorkerFarm.getShared(this.options);

    if(this.options.watch) {
      this.watcher = new FSWatcher;
      this.watcher.on('change', this.onChange.bind(this));
      this.watcher.on('unlink', this.onUnlink.bind(this));
    }

    if(this.options.hmr) {
      this.hmr = new HMRServer;
    }

    try {
      let main = await this.resolveAsset(this.mainFile);
      await this.loadedAsset(main);
      this.mainAsset = main;

      await fs.mkdirp(this.options.outDir)

      let bundle = this.createBundleTree(main);
      this.bundleHashes = await bundle.package(this.options);

      return bundle;
    } finally {
      if(!this.watcher && this.options.killWorkers) {
        this.farm.end();
      }
    }
  }

  async resolveAsset(name, parent) {
    let { path, pkg} = await this.resolver.resolve(name, parent);
    if(this.loadedAssets.has(path)) {
      return this.loadedAssets.get(path);
    }

    let asset = this.parser.getAsset(path, pkg, this.options);
    this.loadedAssets.set(path, asset);

    if(this.watcher) {
      this.watcher.add(path);
    }
    return asset;
  }

  async loadedAsset(asset) {
    if(asset.processed) {
      return ;
    }

    // mark the asset processed so we don't load it twice
    asset.processed = true;

    // First try the cache, otherwise load and compile in the background
    let processed = this.cache && await this.cache.read(asset.name);
    if(!processed) {
      processed = await this.farm.run(asset.name, asset.package, this.options);
      if(this.cache) {
        this.cache.write(asset.name, processed)
      }
    }

    asset.generated = processed.generated;
    asset.hash = processed.hash;

    // process asset dependencies
    await Promise.all(processed.dependencies.map(async dep => {
      if(dep.includedInParent) {

        this.loadedAsset.set(dep.name, asset);
      } else {
        asset.dependencies.set(dep.name, dep);
        let assetDep = await this.resolveAsset(dep.name, asset.name);
        asset.depAssets.set(dep.name, assetDep);
        await this.loadedAsset(assetDep);
      }
    }))
  }

  createBundleTree(asset, dep, bundle) {
    if(dep) {
      asset.parentDeps.add(dep);
    }

    if(asset.parentBundle) {
      // If the asset is already in a bundle, it is shared. Move it to the lowest common ancestor.
      if(asset.parentBundle !== bundle) {
        let commonBundle = bundle.findCommonAncestor(asset.parentBundle);
        if(asset.parentBundle !== commonBundle && asset.parentBundle.type === commonBundle.type) {
          this.moveAssetToBundle(asset, commonBundle);
        }
      }
      return;
    }

    // Create the root bundle if it doesn't exist
    if(!bundle) {
      bundle = new Bundle(asset.type, Path.join(this.options.outDir, md5(asset.name) + '.' + asset.type));
      bundle.entryAsset = asset;
    }

    // Create a new bundle for dynamic imports
    if(dep && dep.dynamic) {
      bundle = bundle.createChildBundle(asset.type, Path.join(this.options.outDir, md5(asset.name) + '.' + asset.type));
      bundle.entryAsset = asset;
    }

    asset.parentBundle = bundle;

    // If the asset type does not match the bundle type, create a new child bundle
    if(asset.type && asset.type !== bundle.type) {
      // If the asset generated a representation for the parent bundle type, also add it there
      if(asset.generated[bundle.type] !== null) {
        bundle.addAsset(asset);
      }
    }

  }

  async onChange(path) {

  }

  async onUnlink() {

  }

}

module.exports = Bundler;

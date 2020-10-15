const fs = require('./utils/fs');
const path = require('path');

class Asset {
  constructor(name, options) {
    this.name = name;
    this.basename = path.basename(this.name, path.extname(this.name));
    this.options = options;
    this.encoding = 'utf-8';

    this.contents = null;
    this.ast = null;
    this.dependencies = new Set;
    this.modules = new Map;
  }

  async loadIfNeeded() {
    if(!this.contents) {
      this.contents = await fs.readFile(this.name, this.encoding);
    }
  }

  async parseIfNeeded() {
    await this.loadIfNeeded();
    if(!this.ast) {
      this.ast = this.parse(this.contents);
    }
  }

  async getDependencies() {
    await this.parseIfNeeded();
    this.collectDependencies()
  }

  parse() {

  }

  collectDependencies() {

  }
}

module.exports = Asset;

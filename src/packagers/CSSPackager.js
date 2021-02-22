const Packager = require("./Packager");

class CSSPackager extends Packager {
  async addAsset(asset) {
    let css = asset.generated.css || '';

    // Figure out which media types this asset was imported with;
    // We only want to import asset once, so group them all togehter
    let media = [];
    for (let dep of asset.parentDeps) {
      if(!dep.media) {
        // Asset was imported without a media type, dont warp in @media
        media.length = 0;
      } else {
        media.push(dep.media);
      }
    }

    // If any. wrap in an @media block
    if(media.length) {
      css = `@media ${media.join(', ')} {\n${css.trim()}\n}\n`;
    }

    await this.dest.write(css);
  }
}

module.exports = CSSPackager;

const Bundle = require("./src/index");

async function run() {
  let bundle = new Bundle('/Users/chenguanxi/Netease/my-projects/node-project/parcel-mini/examples/commonjs/index.js');
  console.log('bundle====', bundle);
  let module = await bundle.collectDependencies();
  printDeps(module);
  return module;
}

function printDeps(module, indent = '', deps = new Set()) {
  for (let [file, mod] of module.modules) {
    console.log('file=====',indent + file);
    if (!deps.has(mod.name)) {
      deps.add(mod.name);
      printDeps(mod, indent + " ", deps);
    }
  }
}

run().then((data) => console.log(JSON.stringify(data, null, 4)), console.err);

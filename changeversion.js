const glob = require( 'glob' );
const fs = require('fs');

// new version number
const VERSION = "0.5.2";

// util function to update version in given package.json
function updatePackage(filename) {
    const p = JSON.parse(fs.readFileSync(filename));
    p.version = VERSION;
    Object.keys(p.dependencies).forEach((d) => {
        if (d.includes("@pixano")) {
            p.dependencies[d] = VERSION;
        }
    });
    const output = JSON.stringify(p, null, 2);
    fs.writeFileSync(filename, output);
}

// update version in demos
glob( 'demos/*/package.json', ( err, files ) => {
    if (files) {
        files.forEach(updatePackage);
    }
});

// update version in packages
glob( 'packages/*/package.json', ( err, files ) => {
    if (files) {
        files.forEach(updatePackage);
    }
});

// update root version
updatePackage('package.json');
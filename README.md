# <img src="images/pixano_logo.png" alt="Pixano" height="100"/>

Pixano Elements
===============
[![License](https://img.shields.io/badge/license-CeCILL--C-blue.svg)](LICENSE) [![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](http://pixano.cea.fr/smart-annotation/) [![Current Version](https://img.shields.io/badge/version-0.1.0-green.svg)](https://github.com/pixano/pixano-elements)


Pixano Elements - Re-usable web components dedicated to data annotation tasks.

> IMPORTANT: The Pixano Web Components are a work in progress and subject to major changes until 1.0 release.

## Requirements

For development, you will only need Node.js installed in your environement.

- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.
    ```bash
    sudo apt install nodejs
    sudo apt install npm
    ```

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

```bash
node --version
# v8.11.3

npm --version
# 6.1.0
```

## Quick start

Once npm is installed on your computer, run:

```bash
npm i
npm run bootstrap
npm run build
```


### Run demos

To run the demos locally, build the project and serve one of the demo folders:

```bash
npx serve demos/rectangle
```

### Components overview

| Component | Status | Demo |
| ----------| -------| -----|
| [`<pxn-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | v0.1.0 | [link](http://pixano.cea.fr/bounding-box/) |
| [`<pxn-polygon>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 | [link](http://pixano.cea.fr/polygon/) |
| [`<pxn-segmentation>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 | [link](http://pixano.cea.fr/pixelwise/) |
| [`<pxn-smart-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 | [link](http://pixano.cea.fr/smart-annotation/) |
| [`<pxn-cuboid-editor>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-3d) |  v0.1.0 | [link](http://pixano.cea.fr/3d-bounding-box/) |

### Contributing

Please follow [tslint](https://palantir.github.io/tslint/) for your contributions:

```
tslint -c tslint.json packages/**/src/*.ts
```

Remember to documenting the code using JSDoc style comments.

### Request a merge

When the code is ready for code review, please request a merge in github with comment 'Ready for code review' with the associated issue number.

# License

Pixano is released under the [CeCILL-C](LICENSE.txt) license, a free software license
 adapted to both international and French legal matters that is fully compatible
 with the FSF's GNU/LGPL license.

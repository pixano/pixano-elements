# <img src="images/pixano_logo.png" alt="Pixano" height="100"/>

Pixano Elements
===============
[![License](https://img.shields.io/badge/license-CeCILL--C-blue.svg)](LICENSE) [![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](http://pixano.cea.fr/smart-annotation/) [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) [![Node.js CI](https://github.com/pixano/pixano-elements/workflows/Node.js%20CI/badge.svg)](https://github.com/pixano/pixano-elements/workflows/Node.js%20CI/badge.svg)

[![Alt text](http://i3.ytimg.com/vi/z5T2HhnugJo/maxresdefault.jpg)](https://www.youtube.com/watch?v=z5T2HhnugJo)

Pixano Elements - Library of web components dedicated to data annotation tasks. A complete and ready-to-use annotation application is available at `https://github.com/pixano/pixano-app`.

> IMPORTANT: The Pixano Web Components are a work in progress and subject to major changes until 1.0 release.

[Playcode demo](https://playcode.io/709884/) ([smart-segmentation](https://playcode.io/723293/), [cuboid](https://playcode.io/709984/), [rectangle](https://playcode.io/709884/), [smart-rectangle](https://playcode.io/738813/))

[Website demos](https://pixano.github.io/demo/demo)

[Features video](https://www.youtube.com/watch?v=z5T2HhnugJo)

Automatic build tests on Ubuntu (latest) and node version 10, 12, 14.

## Table of content
  * [Components overview](#components-overview)
  * [Requirements](#requirements)
      - [Node installation on Windows](#node-installation-on-windows)
      - [Node installation on Ubuntu](#node-installation-on-ubuntu)
      - [Other Operating Systems](#other-operating-systems)
  * [Build and run the overall demo](#build-and-run-the-overall-demo)
  * [Documentation](#documentation)
  * [Contributing](#contributing)
    + [Getting started](#getting-started)
    + [Pull request](#pull-request)
  * [Change log](#change-log)
  * [License](#license)

## Components overview

The Pixano Elements are divided into `packages`. Each package can be installed independantly from [NPM](https://www.npmjs.com/) using the following command:

```
npm install @pixano/graphics-2d
```

Each package can contain multiple web components which are regrouped by affinity.


| Component | Status | Demo |
| ----------| -------| -----|
| [`<pxn-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/bounding-box/) |
| [`<pxn-polygon>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/polygon/) |
| [`<pxn-segmentation>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/pixelwise/) |
| [`<pxn-keypoints>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/keypoint/) |
| [`<pxn-smart-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/smart-annotation/) |
| [`<pxn-cuboid-editor>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-3d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-3d.svg)](https://www.npmjs.com/package/@pixano/graphics-3d) | [demo](http://pixano.cea.fr/3d-bounding-box/) |


## Requirements

Pixano requires WebGL to be activated in your browser. If you see the following error in you console `WebGL unsupported in this browser`, please [activate](https://superuser.com/questions/836832/how-can-i-enable-webgl-in-my-browser) it.

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
  Or install it with snap: `sudo snap install node`

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

```bash
node --version
# v8.11.3

npm --version
# 6.10.0
```
#### note about npm version
If you need to install a specific version of npm, you can use the following command line:
```bash
npm install -g npm@6.10.0
```
> If you encounter "EACCES: permission denied" error message, please follow [this guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).


## Build and run the overall demo
An online serverless demo is available on our dedicated [website](https://pixano.github.io/demo/demo).

If you want to build the latests version, it's easy:
```
git clone https://github.com/pixano/pixano-elements.git
cd pixano-elements
npm run deps
npm run build
npx serve demo
```

## Documentation

📚 Check out the [TypeDoc](https://pixano.github.io/docs/docs) documentation. Each package's usage and API is also documented:

- [graphics-2d](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d)
- [graphics-3d](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d)


You can also try the demos on our [website](http://pixano.cea.fr/bounding-box/).

## Contributing

Clone and setup the repo:

```bash
git clone https://github.com/pixano/pixano-elements.git
cd pixano-elements
npm run deps
npm run build
```

Run the demo locally:

```bash
npx serve demo
```

This demo takes your local modifications into account, thanks to a bootstrap step.

After some modifications, test them by rebuilding:
```bash
npm run build
npx serve demo
```

If you modified the dependencies, you better clean the project before rebuilding:

```bash
npm run clearall
npm run deps
npm run build
npx serve demo
```

### Getting started

To create a new component, check our [tutorial](./documentation/how_to_create_a_new_component.md).

Please follow our [coding guidelines](./documentation/coding_guidelines.md) for your contributions.

### Pull request

Starting from scratch :
```bash
# 1. Start by cloning the original repository
git clone https://github.com/pixano/pixano-elements.git
# 2. Fork the repo (Fork button at https://github.com/pixano/pixano-elements) to your personal github
# Then configure the git remote for the fork ($MY_ACCOUNT is your personal github)
git remote add upstream https://github.com/$MY_ACCOUNT/pixano-elements.git
git fetch upstream
# 3. Create a new branch for dedicated bug fix or new feature
git checkout -b feature-xyz upstream/master
# 4. Do your changes in feature-xyz branch :)
git commit -a -m "Add xyz feature"
git push -u upstream feature-xyz
# Then make sure your branch is up to date with the original repository
git merge origin/master
# 5. Then in the browser navigate to the original URL of the original pixano-elements repo
# Click on “Create Pull Request”
```
From an existing clone with many changes (whether you want to publish all or only one of the changes) :
```bash
# 1. Instead of making a new clone, use your existing one and add two upsteams:
# One for your fork and one for the original repository:
git remote add upstream-fork https://github.com/$MY_ACCOUNT/pixano-elements.git
git remote add upstream-origin https://github.com/pixano/pixano-elements.git
# 2. Create a new branch for dedicated bug fix or new feature
git checkout -b feature-xyz upstream-fork/master
# 3. Cherry pick from commit from your enriched branch (replace by your targeted commit)
# Or merge all if you want to publish everything
git cherry-pick 52cd7ez # or git merge my_existing_branch
git push -u upstream-fork feature-xyz
# 4. Make sure you're up-to-date with you upstream-origin
git merge upstream-origin/master
# 5. Create pull request like described above
```

## Change log

[Releases](https://github.com/pixano/pixano-elements/releases)

## License

Pixano is released under the [CeCILL-C](LICENSE.txt) license, a free software license
 adapted to both international and French legal matters that is fully compatible
 with the FSF's GNU/LGPL license.

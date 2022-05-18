# <img src="images/pixano_logo.png" alt="Pixano" height="100"/>

[![License](https://img.shields.io/badge/license-CeCILL--C-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](https://pixano.github.io/demo/demo)
[![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d)
<!--[![Node.js CI](https://github.com/pixano/pixano-elements/workflows/Node.js%20CI/badge.svg)](https://github.com/pixano/pixano-elements/workflows/Node.js%20CI/badge.svg)-->

## What is PIXANO ?
[Pixano](https://pixano.cea.fr/) is a web-based smart-annotation tool for computer vision applications. The modules are driven by artificial intelligence, which assists the human user with annotation tasks and accelerate the annotation process. Try some of our features [online](https://pixano.github.io/demo/demo.html)!

![pixano.gif](https://raw.githubusercontent.com/pixano/pixano-app/master/documentation/pixano.gif)


Pixano Elements
===============

Pixano Elements - Library of web components dedicated to data annotation tasks.

[![Alt text](http://i3.ytimg.com/vi/z5T2HhnugJo/maxresdefault.jpg)](https://www.youtube.com/watch?v=z5T2HhnugJo)

Have a look to our [online demos](https://pixano.github.io/demo/demo) !

Beside Pixano elements, a complete and ready-to-use annotation application is available at `https://github.com/pixano/pixano-app`.

> IMPORTANT: The Pixano Web Components are a work in progress and subject to major changes until 1.0 release.

Automatic build tests on Ubuntu (latest) and node version 10, 12, 14.<!-- TODO: is it still true ? => verify -->


## Table of content
  * [Components overview](#components-overview)
  * [Requirements](#requirements)
  * [Build and run the overall demo](#build-and-run-the-overall-demo)
  * [Documentation](#documentation)
  * [How to contribute ?](#how-to-contribute-)
    + [Getting started](#getting-started)
    + [First time](#first-time)
      + [Fork and clone](#fork-and-clone)
      + [First run](#first-run)
    + [Modify and test the code](#modify-and-test-the-code)
    + [Create a pull request](#create-a-pull-request)
  * [Change log](#change-log)
  * [License](#license)


## Components overview

The Pixano Elements are divided into `packages`. Each package can be installed independantly from [NPM](https://www.npmjs.com/) using the following command:

```
npm install @pixano/graphics-2d
```

Each package can contain multiple web components which are grouped by affinity.


| Component | Status | Demo |
| ----------| -------| -----|
| [`<pxn-classification>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/classification/) |<!-- TODO -->
| [`<pxn-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/bounding-box/) |
| [`<pxn-polygon>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/polygon/) |
| [`<pxn-segmentation>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/pixelwise/) |
| [`<pxn-keypoints>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/keypoint/) |
| [`<pxn-tracking>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/tracking/) |<!-- TODO -->
| [`<pxn-tracking-graph>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/tracking-graph/) |<!-- TODO -->
| [`<pxn-smart-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/smart-annotation/) |
| [`<pxn-smart-segmentation>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/smart-segmentation/) |<!-- TODO -->
| [`<pxn-smart-tracking>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-2d.svg)](https://www.npmjs.com/package/@pixano/graphics-2d) | [demo](http://pixano.cea.fr/smart-tracking/) |<!-- TODO -->
| [`<pxn-cuboid-editor>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-3d) | [![Published on npm](https://img.shields.io/npm/v/@pixano/graphics-3d.svg)](https://www.npmjs.com/package/@pixano/graphics-3d) | [demo](http://pixano.cea.fr/3d-bounding-box/) |



## Requirements

Pixano requires WebGL to be activated in your browser. If you see the following error in you console `WebGL unsupported in this browser`, please [activate](https://superuser.com/questions/836832/how-can-i-enable-webgl-in-my-browser) it.

For development, you will only need Node.js installed in your environement.

For a fresh install, please follow our guide to install it on your system:
- [Node installation on Windows](./INSTALL.md#windows)
- [Node installation on Ubuntu](./INSTALL.md#linux)

If the installation was successful, you should be able to run the following command:
```bash
node --version
# v10.19.0

npm --version
# 6.10.0
```

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


## How to contribute ?

### Getting started

To create a new component, check our [tutorial](./documentation/how_to_create_a_new_component.md).

Please follow our [coding guidelines](./documentation/coding_guidelines.md) for your contributions.

#### About the contribution process

The contribution process follows this well-known diagram :

![diagram-pull-request.png](documentation/diagram-pull-request.png)

### First time:
#### Fork and clone

1. Fork this project

	*Click on the Fork button*
	
2. Clone the fork on your local machine
```bash
	git clone git@github.com:$YOURLOGIN/pixano-elements.git
	# OR
	git clone https://github.com/$YOURLOGIN/pixano-elements.git
	# go to code
	cd pixano-elements
```
3. Add the original repository as a remote called upstream
```bash
	git remote add upstream git@github.com:pixano/pixano-elements.git
	# OR
	git remote add upstream https://github.com/pixano/pixano-elements.git
```

#### First run
4. Install dependencies and build the project
```bash
cd pixano-elements
npm run deps
npm run build
```

5. Run the demo locally:

```bash
npx serve demo
```


### Modify and test the code

1. Check that you are on the right branch and pull upstream changes into your local repository if necessary
```bash
	git checkout master
	git pull upstream master
	#If needed: merge
	#If needed: git push origin master
```
2. Create a new branch to work on
```bash
	git checkout -b $MY_BRANCH_NAME
```
3. Implement/fix your feature, comment your code.

4. Test your modifications locally using the serverless-demo
```bash
	npm run build
	npx serve demo
```
*This demo takes your local modifications into account, thanks to a bootstrap step.*


If you modified the dependencies, you better clean the project before rebuilding:

```bash
	npm run clearall
	npm run deps
	npm run build
	npx serve demo
```

### Create a pull request

5. Add or change the documentation as needed.
6. Commit your modifications using meaningfull comments.
7. Push your branch to your fork
```bash
	git push origin $MY_BRANCH_NAME
```
8. On github, open a pull request from your fork in the correct branch.

	*A green button "Compare & pull request" should appear. If not, click on branches button (https://github.com/$YOURLOGIN/pixano-elements/branches) and then click the "New pull request" button corresponding to your contribution branch.*

9. Complete the merge request message with a meaningfull title and a comprehensive comment: describe how your work is changing Pixano and what modules are impacted. You could use something like:
```
	## pxn-$IMPACTED_PLUGIN
	* file: modifications...
	* file: modifications...
	* ...
	## pxn-$OTHER_IMPACTED_PLUGIN
	* ...

	Co-authored-by: ...
```

10. click on "Create pull request" => automatic verifications are made by github

Nice work ! Thank you for contributing to Pixano !



## Change log

[Releases](https://github.com/pixano/pixano-elements/releases)

## License

Pixano is released under the [CeCILL-C](LICENSE.txt) license, a free software license
 adapted to both international and French legal matters that is fully compatible
 with the FSF's GNU/LGPL license.

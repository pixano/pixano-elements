# <img src="images/pixano_logo.png" alt="Pixano" height="100"/>


| [![License](https://img.shields.io/badge/license-CeCILL--C-blue.svg)](LICENSE)  |
| ------ |

Pixano Elements - Re-usable web components dedicated to data annotation tasks.


## Quick start

Install npm on your computer then run:

```bash
npm i
npm run bootstrap
npm run build
```

To automatically rebuild the project when source files are changed:

```bash
npm run watch
```

### Run demos

To run the demos locally, build the project and serve one of the demo folders:
(update lerna.json if demo not present)

```bash
npx serve demos/rectangle
```

### Components overview

| Component | Status |
| ----------| -------|
| [`<pxn-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) | v0.1.0 |
| [`<pxn-polygon>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 |
| [`<pxn-segmentation>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 |
| [`<pxn-smart-rectangle>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-2d) |  v0.1.0 |
| [`<pxn-cuboid-editor>`](https://github.com/pixano/pixano-elements/blob/master/packages/graphics-3d) |  v0.1.0 |

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

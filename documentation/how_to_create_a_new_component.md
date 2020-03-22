# Create a new web component

This tutorial walks you through the process of building a new web component, whether it is an entirely new type of annotation interaction or an improvement of an already existing one.

## Prerequisites

We use [Lit Element](https://lit-element.polymer-project.org/) for easy building of Web Components. If you are not familiar with this tool, please follow their [tutorial](https://lit-element.polymer-project.org/try).

We use the rendering library [PixiJS](https://www.pixijs.com/) to create rich, interactive 2d graphics elements. If you intend to edit the interactions on the canvas, please follow their [tutorial](https://github.com/kittykatattack/learningPixi).

We use the rendering library [ThreeJS](https://threejs.org/) to create 3d scenes. If you intend to edit the 3d scene, please follow their [tutorial](https://threejs.org/docs/#manual/en/introduction/Useful-links).

## From scratch

Let's create a simple component that displays an image. A minimal setup to do so is as follows:

### 1. Create the component

Create a new file `pxn-my-element.ts` under the `graphics-2d` package:

```javascript
import { LitElement, html, customElement, property } from 'lit-element';

@customElement('pxn-my-element' as any)
export class MyElement extends LitElement {

    // input image path
    @property({type: String})
    public path: string = '';

    /**
    * Render the element template.
    */
    render() {
        /**
        * `render` must return a lit-html `TemplateResult`.
        *
        * To create a `TemplateResult`, tag a JavaScript template literal
        * with the `html` helper function:
        */
        return html`
        <img src=${this.path}>
        `;
    }
}
```

### 2. Create its demo

Create a simple demo application that imports and instanciates the component to check that it behaves as expected. Create a `my-element` folder in demos with the following files:
```bash
demos
└── my-element
    ├── my-demo.js
    ├── image.jpg
    ├── index.html
    └── webpack.config.js
```
   
- Create an entrypoint `index.html` file:
```html
<!doctype html>
<html>
<head>
    <title>My Demo</title>
</head>
<body>
    <!-- Use Web Components in your HTML like regular built-in elements. -->
    <my-demo></my-demo>
    <script src="./my-demo-bundle.js"></script>
</body>
</html>
```

- Add its javascript code in a `my-demo.js`:
```javascript
import { html, LitElement} from 'lit-element';
import '@pixano/graphics-2d/lib/pxn-my-element';

class MyDemo extends LitElement {

  render() {
    return html`<pxn-my-element path="image.jpg"></pxn-my-element>`;
  }
}
customElements.define('my-demo', MyDemo);
```

- Create a `package.json` to define the dependencies of the demo:
```json
{
    "name": "demo-my-element",
    "version": "0.1.0",
    "private": true,
    "description": "Demo",
    "scripts": {
        "build": "webpack --config webpack.config.js",
        "watch": "webpack --config webpack.config.js --watch"
    },
    "devDependencies": {
        "source-map-loader": "^0.2.4",
        "webpack": "^4.41.2",
        "webpack-cli": "^3.3.10"
    },
    "dependencies": {
        "@pixano/graphics-2d": "^0.1.0",
        "@webcomponents/webcomponentsjs": "^2.4.3",
        "lit-element": "^2.3.1"
    }
}
```

- Create `webpack.config.js` to define the parameters of the app bundling:
```js
const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'my-demo.js'),
  output: {
    path: path.resolve(__dirname),
    filename: 'my-demo-bundle.js'
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        use: ["source-map-loader"],
        enforce: "pre"
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  }
};
```

### Run the demo
```bash
# This assumes you already have installed
# the roots dependancies (npm i)
npm run bootstrap
# Watch src file change
npm run watch
# In another terminal, serve the demo app:
npx serve demos/my-element/
```

## Inherit from existing annotation element

Let's create a component that inherits `pxn-polygon`, adding a way to create a polygon from a click fed to a segmentation algorithm through a HTTP request.

### 1. Create the component

Create a new file `pxn-http-polygon.ts` under the `graphics-2d` package:

```javascript
import { LitElement, html, customElement, property } from 'lit-element';
import { Polygon } from "./pxn-polygon";

@customElement('pxn-http-polygon' as any)
export class HttpPolygon extends Polygon {

    // segmentation url
    @property({type: String})
    public segurl: string = 'localhost:4000';

    constructor() {
      super();
      this.shManager.setController('smart-create', new SmartPolygonCreateController(this.renderer, this.shapes));
    }
}

/**
 * Inherit RectanglesManager to handle smart rectangle creation.
 */
class SmartRectanglesCreateController extends ShapeCreateController {

  protected onRootDown(evt: any) {
    const click = this.renderer.getPosition(evt.data);
    fetch(this.segurl, {
      method: "POST",
      body: {click, image: this.renderer.imageBase64 }
    }).then((res) => res.json())
      .then((pts: number[]) => {
        this.shapes.add(observable({
          id: Math.random().toString(36).substring(7),
          geometry: { type: "polygon", vertices: pts }
        }));
      });
  }
}
```

### 2. Create its demo

Go throught the above from scratch demo. Edit url as you want.
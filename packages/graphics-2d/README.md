# @pixano/graphics-2d

Set of web components for image and video annotations.

## Import 

```javascript
import "@pixano/graphics-2d";
// or a specific element
import "@pixano/graphics-2d/lib/pxn-rectangle";
```

## Example: Rectangle annotation

Example usage:
```javascript
import { css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';

const colors = [
  'blue', 'green', 'purple',
  'yellow', 'pink', 'orange', 'tan'
];

class MyDemoRectangle extends LitElement {

  onCreate(evt) {
    // listening to the create event dispatched
    // by the element to assign a nice color to
    // the new rectangle.
    const newObj = evt.detail;
    newObj.color = colors[this.element.shapes.size % colors.length];
    this.element.mode = 'update';
  }

  get element() {
    // Utility getter of the element
    return this.shadowRoot.querySelector('pxn-rectangle');
  }

  render() {
    // Render the template with the rectangle element
    // enriched with some buttons to interact with it.
    return html`
    <pxn-rectangle image="image.jpg" @create=${this.onCreate}></pxn-rectangle>
    <div>
        <button @click=${() => this.element.mode = 'create'}>Add</button>
        <button @click=${() => this.element.viewControls.zoomIn()}>+</button>
        <button @click=${() => this.element.viewControls.zoomOut()}>-</button>
    </div>`;
  }
}

customElements.define('my-demo-rectangle', MyDemoRectangle);
```

## API

### Properties/Attributes

#### pxn-canvas

| Name             | Type           | Default  | Description
| ---------------- | -------------- | -------- |------------
| `image      `    | `string|null` | `null `  | Sets the image url to be rendered on canvas.
| `hideLabels  `   | `boolean`      | `false`  | When `true`, hides the label layer.
| `color`          | `string `      | `#f3f3f5`| Background color
| `zoom     `      | `number`       | `0.95`(readonly) | Zoom value
| `noninteractive` | `boolean`      | `false` | When `true`, disables pointer events. Used for display-only annotations.

#### pxn-canvas-2d

Note: `pxn-canvas-2d` inherits from `pxn-canvas`.

| Name        | Type           | Default  | Description
| ----------- | -------------- | -------- |------------
| `mode`      | `string`       | `update `  | Sets the canvas interaction mode.
| `shapes`    | `ShapeData[]|ShapeData[]` | `[] `  | Sets the canvas shapes to be displayed.
| `selectedShapeIds` | `string[]` | `[]` | List of selected shape ids

#### pxn-rectangle

Note: `pxn-rectangle` inherits from `pxn-canvas-2d` so all properties in `pxn-canvas-2d` will be available on `pxn-rectangle`.

#### pxn-polygon

Note: `pxn-polygon` inherits from `pxn-canvas-2d` so all properties in `pxn-canvas-2d` will be available on `pxn-polygon`.

#### pxn-segmentation

Note: `pxn-segmentation` inherits from `pxn-canvas` so all properties in `pxn-canvas` will be available on `pxn-segmentation`.

| Name             | Type           | Default  | Description
| ---------------- | -------------- | -------- |------------
| `mask`           | `ImageData*|null` | `null `  | Segmentation mask to be drawn
| `maskVisuMode`   | `SEMANTIC|INSTANCE` | `SEMANTIC` | Display of colors by class (use given map class <=> color) or instance (random color based on instance index)
| `showroi` | `boolean` | `false` | Show ROI helper when creating a new mask instance.

*The mask is stored as an ImageData:
```ts
interface ImageData {
  // Data contains the ImageData object's pixel data. it is stored as a one-dimensional array in the RGBA order, with integer values between 0 and 255 (inclusive).
  // Here [R, G, B, A] correspond to:
  // R: instance index from 1 to 255 (0 is for background or semantic classes)
  // G: additional instance index if #instances > 255 (often equals to 0)
  // B: class index
  data: Uint8ClampedArray;
  height: number;
  width: number;
}
```

#### pxn-smart-rectangle

Note: `pxn-smart-rectangle` inherits from `pxn-rectangle` so all properties in `pxn-rectangle` will be available on `pxn-smart-rectangle`.

| Name             | Type           | Default  | Description
| ---------------- | -------------- | -------- |------------
| `scale`          | `number`       | `1`      | Scaling factor from the base ROI used by the detector (256) to crop the image from

### Methods

#### pxn-canvas

| Name               | Description       |
| ------------------ | ----------------- |
| `zoomIn() => void` | Zoom in   |
| `zoomOut() => void`| Zoom out |
| `fullScreen() => void` | Fullscreen |

#### pxn-canvas-2d

Note: `pxn-canvas-2d` inherits from `pxn-canvas`.

#### pxn-rectangle

Note: `pxn-rectangle` inherits from `pxn-canvas-2d` so all methods in `pxn-canvas-2d` will be available on `pxn-rectangle`.

#### pxn-polygon

Note: `pxn-polygon` inherits from `pxn-canvas-2d` so all methods in `pxn-canvas-2d` will be available on `pxn-polygon`.

| Name               | Description             |
| ------------------ | ----------------------- |
| `merge() => void`  | Merge selected shapes   |
| `split() => void`  | Split selected shape    |

#### pxn-segmentation

Note: `pxn-segmentation` inherits from `pxn-canvas` so all methods in `pxn-canvas` will be available on `pxn-segmentation`.

| Name                    | Description             |
| ----------------------- | ----------------------- |
| `setOpacity() => void`  | Set mask opacity [0,1]  |
| `filterLittle(numPixels: number = 10) => void`| Filter isolated regions containing less than given number of pixels  |

#### pxn-smart-rectangle

Note: `pxn-smart-rectangle` inherits from `pxn-rectangle` so all methods in `pxn-rectangle` will be available on `pxn-smart-rectangle`.

| Name               | Description       |
| ------------------ | ----------------- |
| `roiDown() => void` | Scale up ROI  |
| `roiUp() => void`| Scale down ROI |

### Events

#### pxn-canvas

None

#### pxn-canvas-2d

| Event Name | Detail        | Description
| ---------- | ------------- | -----------
| `create`   | `ShapeData`   | Fired when a shape has been created.
| `update  ` | `string[]`    | Fired when a shapes update has been made.
| `delete  ` | `string[]`    | Fired when shapes are deleted. Detail is the list of the deleted shape ids.
| `selection`| `ShapeData[]` | Fired when shapes are selected.
| `mode`| `string` | Fired when user interaction mode changed

```ts
interface ShapeData {
  index: number;
}
```

### Shortcuts

#### pxn-canvas

| Key          | Description      |
| ------------ | ---------------- | 
| `m`          | `Darken   image` |
| `p`          | `Brighten image` |

#### pxn-canvas-2d

| Key          | Description      |
| ------------ | ---------------- | 
| `Tab`        | `Loop throught the scene shapes` |
| `Escape`     | `Unselect shapes` |
| `Delete`     | `Delete selected shapes` |
| `Ctrl+C`     | `Copy in clipboard currently selected shapes` |
| `Ctrl+V`     | `Create new shapes (with new ids) from the clipboard content` |
# @pixano/graphics-3d

Set of web components for 3D point cloud annotations.

## Import 

```javascript
import "@pixano/graphics-3d";
// or a specific element
import "@pixano/graphics-3d/lib/pxn-cuboid";
```

## Example: Rectangle annotation

Example usage:
```javascript
import { css, html, LitElement} from 'lit-element';
import '@pixano/graphics-3d';

const colors = [
  'blue', 'green', 'purple',
  'yellow', 'pink', 'orange', 'tan'
];

class MyDemocuboid extends LitElement {

  firstUpdated() {
    fetch('pointcloud.bin').then((response) => {
      return response.ok ? response.arrayBuffer() : Promise.reject(response.status);
    }).then((points) => {
      this.element.pcl = new Float32Array(points);
    });
  }

  onCreate(evt) {
    // listening to the create event dispatched
    // by the element to assign a nice color to
    // the new cuboid.
    const newObj = evt.detail;
    newObj.color = colors[this.element.editableCuboids.size % colors.length];
  }

  get element() {
    // Utility getter of the element
    return this.shadowRoot.querySelector('pxn-cuboid-editor');
  }

  render() {
    // Render the template with the cuboid element
    // enriched with some buttons to interact with it.
    return html`
    <pxn-cuboid-editor @create=${this.onCreate}></pxn-cuboid-editor>
    <div>
        <button @click=${() => this.element.mode = 'create'}>Add</button>
    </div>`;
  }
}

customElements.define('my-demo-cuboid', MyDemocuboid);
```

## API

### Properties/Attributes

#### pxn-cuboid-editor

| Name             | Type           | Default  | Description
| ---------------- | -------------- | -------- |------------
| `pcl`            | `Float32Array` | `null `  | Point cloud as one-dimensional array in the XYZ order
| `editableCuboids` | `Set<Cuboid>` | `[]` | Cuboids rendered in the scene
| `editTarget` | `Cuboid|null` | `null` | Selected cuboid
| `cameraMode` | `orthographic|perspective` | `perspective` | Camera type
| `mode`       | `InteractionMode*` | `edit` | Sets the canvas interaction mode. Use `none` for no interactions at all.

*InteractionMode is a string with the following possible values:
```ts
type InteractiveMode =  "edit" | "create" | "none";
```

### Methods

#### pxn-cuboid-editor

| Name               | Description       |
| ------------------ | ----------------- |
| `rotate() => void` | Rotate selected cuboid by 90°   |
| `swap() => void`   | Swap selected cuboid coordinates |

### Shortcuts

#### pxn-cuboid-editor

| Key          | Description      |
| ------------ | ---------------- |
| `n`          | `Switch to create mode` |
| `Escape`     | `Unselect shapes` |
| `Delete`     | `Delete selected shapes` |
| `Ctrl+C`     | `Copy in clipboard currently selected cuboid` |
| `Ctrl+V`     | `Create new cuboid (with new id) from the clipboard content` |
| `+`          | `Scale up size of points in pointcloud` |
| `-`          | `Scale down size of points in pointcloud` |

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


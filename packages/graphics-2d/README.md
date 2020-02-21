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


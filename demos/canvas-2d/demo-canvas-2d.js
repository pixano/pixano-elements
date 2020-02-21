/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import '@pixano/graphics-2d/lib/pxn-canvas-2d';
import {html, LitElement} from 'lit-element';

class DemoCanvas2d extends LitElement {

  static get properties() {
    return {
      imageIdx: {type: Number}
    };
  }
  constructor() {
    super();
    this.imageList = [
      'image.jpg'];
    this.imageIdx = 0;
  }

  firstUpdated() {
    this.element.setShapes([{id: 'test', vertices: [0,0,0.4,0.4], color: 0X000}, {id: 'test2', vertices: [0.8,0.8,1,1], color: 0X000}]);
  }


  resize() {
    this.element.resize();
  }

  render() {
    return html`
        <main class="unresolved">
          <pxn-canvas-2d  image="${this.imageList[this.imageIdx]}"></pxn-canvas-2d>
        </main>`;
  }


  get element() {
    return this.shadowRoot.querySelector('pxn-canvas-2d');
  }
}

customElements.define('demo-canvas-2d', DemoCanvas2d);
customElements.define('pxn-canvas-2d', CuboidEditor);
customElements.define('demo-cuboid', DemoCuboid);
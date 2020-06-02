/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import {css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';

class MyDemo extends LitElement {
  static get styles() {
    return [css`
    main {
      display: flex;
      height: 100%;
    }`];
  }

  static get properties() {
    return {
      shapes: {type: Array},
      selectedShapeIds: {type: Array},
      events: {type: Array},
      mode: {type: String},
      events: {type: Array},
      disableMultiSelection: {type: Boolean},
      disableTabulation: {type: Boolean},
      hideLabels: {type: Boolean},
      imageIdx: {type: Number}
    };
  }
  constructor() {
    super();
    this.mode = 'update';  // overwrite default mode param of element
    this.events = [];
    this.maxEventSize = 5;
    this.selectedShapeIds = [];
    this.disableMultiSelection = false;
    this.disableTabulation = false;
    this.hideLabels = false;
    this.imageList = ['image.jpg'];
    this.imageIdx = 0;
    this.shapes = [];
    window.addEventListener('keydown', (evt) => {
      if (evt.key == 'Alt') {
        this.element.mode = this.element.mode === 'edit' ? 'create': 'edit';
      }
    });
  }

  get rightPanel() {
    return html`
      <div class="right-panel">
        <button @click=${() => this.element.mode = 'create'}>Create</button>
        <button @click=${() => this.element.mode = 'edit'}>Edit</button>
      </div>
    `;
  }

  resize() {
    this.element.resize();
  }

  render() {
    return html`
        <main>
          <pxn-graph  image="${this.imageList[this.imageIdx]}"
                      @create=${this.onCreate}
                      @update=${this.onUpdate}
                      @selection=${this.onSelection}
                      mode=${this.mode}>
          </pxn-graph>
          ${this.rightPanel}
        </main>`;
  }

  firstUpdated() {
    // this.element.graphType = {names: ['center']};
  }

  onCreate() {
    this.element.mode = 'edit';
  }

  onUpdate() {
    console.log('update');
  }

  onSelection(evt) {
    console.log('selection ids', evt.detail);
  }

  updated(changedProperties) {
    if (changedProperties.has('imageIdx') && this.imageIdx >= 0) {
      console.log('changed image');
      if (this.imageIdx === 0) {
        this.shapes = [
          { id:'random-id-4', vertices: [0,0, 0.5, 0.5, 0.2, 0.7], edges: [[0,1],[0,2]], color: 0x0F0, type: 'graph' }
        ];
      }
    }
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-graph');
  }
}

customElements.define('my-demo', MyDemo);


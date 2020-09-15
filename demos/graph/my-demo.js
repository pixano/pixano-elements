/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import {css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';
import { settings } from '@pixano/graphics-2d/lib/pxn-graph';

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
    this.mode = 'edit';  // overwrite default mode param of element
    this.events = [];
    this.maxEventSize = 5;
    this.selectedShapeIds = [];
    this.disableMultiSelection = false;
    this.disableTabulation = false;
    this.hideLabels = false;
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
          <pxn-graph @create=${this.onCreate}
                      enableOutsideDrawing
                      @update=${this.onUpdate}
                      @selection=${this.onSelection}
                      mode=${this.mode}>
          </pxn-graph>
          ${this.rightPanel}
        </main>`;
  }

  firstUpdated() {
    this.element.input = "image.jpg";
    settings.radius = 3;
    settings.edges = [[0,1],[1,2]];
    settings.vertexNames = ["t1","t2","t3"]
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
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-graph');
  }
}

customElements.define('my-demo', MyDemo);


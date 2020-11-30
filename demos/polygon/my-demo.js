/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import '@pixano/graphics-2d';
import { html, LitElement} from 'lit-element';
import { demoStyles,
  fullscreen,
  createPencil,
  polyline,
  zoomIn,
  zoomOut } from '@pixano/core/lib/style';

const colors = [
  'red', 'blue', 'green', 'purple',
  'yellow', 'pink', 'orange', 'tan'
];

class MyDemo extends LitElement {
  static get styles() {
    return demoStyles;
  }

  static get properties() {
    return {
      isOpenedPolygon: { type: Boolean },
      mode: { type: String},
      image: { type: String }
    };
  }
  constructor() {
    super();
    this.mode = 'edit'; // overwrite default mode param of element
    this.image = "image.jpg";
    this.isOpenedPolygon = true;
  }

  fullScreen() {
    if (document.fullscreenEnabled) {
      this.shadowRoot.querySelector('main').requestFullscreen();
    }
  }

  get rightPanel() {
    return html`
      <div class="right-panel">
        <p class="icon" title="Fullscreen" style="position: absolute;" @click=${this.fullScreen}>${fullscreen}</p>
        <div class="icons">
          <p class="icon" title="Add polygon" @click=${() => {this.isOpenedPolygon=false; this.element.mode = 'create'}}>${createPencil}</p>
          <p class="icon" title="Add line" @click=${() => {this.isOpenedPolygon=true; this.element.mode = 'create'}}>${polyline}</p>
          <p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
          <p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
        </div>
      </div>
    `;
  }

  render() {
    return html`
        <main>
          <pxn-polygon  image="${this.image}"
                        ?isOpenedPolygon="${this.isOpenedPolygon}"
                        disablefullscreen
                        @create=${this.onCreate}
                        @update=${(e) => console.log('update ids', e.detail)}
                        @delete=${(e) => console.log('delete', e.detail)}
                        @selection=${(e) => console.log('selection', e.detail)}>
          </pxn-polygon>
          ${this.rightPanel}
        </main>`;
  }

  onCreate(evt) {
    const newObj = evt.detail;
    newObj.color = colors[Math.floor(Math.random() * colors.length)];
    this.element.mode = 'edit';
    console.log('create', newObj.id);
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-polygon');
  }
}

customElements.define('my-demo', MyDemo);

/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';
import { demoStyles,
  fullscreen,
  create_pencil,
  zoomIn,
  zoomOut } from 'common/shared-styles';

const colors = [
  'blue', 'green', 'purple',
  'yellow', 'pink', 'orange', 'tan'
];

class DemoRectangle extends LitElement {
  static get styles() {
    return demoStyles;
  }

  static get properties() {
    return {
      image: {type: String}
    };
  }
  constructor() {
    super();
    this.image = 'image.jpg';
    window.addEventListener('keydown', (evt) => {
      if (evt.key == 'Alt') {
        this.element.mode = this.element.mode === 'update' ? 'create': 'update';
      }
    });
  }

  get rightPanel() {
    return html`
      <div class="right-panel">
        <p class="icon" title="Fullscreen" style="position: absolute;" @click=${this.fullScreen}>${fullscreen}</p>
        <div class="icons">
          <p class="icon" title="Add rectangle" @click=${() => this.element.mode = 'create'}>${create_pencil}</p>
          <p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
          <p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
        </div>
      </div>
    `;
  }

  fullScreen() {
    if (document.fullscreenEnabled) {
      this.shadowRoot.querySelector('main').requestFullscreen();
    }
  }

  render() {
    return html`
        <main>
          <pxn-rectangle  image="${this.image}"
                          disablefullscreen
                          @create=${this.onCreate}>
          </pxn-rectangle>
          ${this.rightPanel}
        </main>`;
  }

  onCreate(evt) {
    const newObj = evt.detail;
    newObj.color = colors[Math.floor(Math.random() * colors.length)];
    this.element.mode = 'update';
  }


  get element() {
    return this.shadowRoot.querySelector('pxn-rectangle');
  }
}

customElements.define('demo-rectangle', DemoRectangle);

/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import '@pixano/graphics-2d';
import {html, LitElement} from 'lit-element';
import { demoStyles,
  fullscreen,
  create_pencil,
  magic_select,
  subtract,
  union,
  brush,
  lock,
  rectify,
  balloon,
  balloon2,
  filter,
  zoomIn,
  zoomOut,
  opacity } from 'common/shared-styles';

class DemoSegmentation extends LitElement {
  static get styles() {
    return demoStyles;
  }

  static get properties() {
    return {
      mask: {type: Object},
      image: {type: String}
    };
  }

  constructor () {
    super();
    this.mask = null;
    this.image = 'image.jpg';
    window.addEventListener('keydown', (evt) => {
      // change target class
      if (!isNaN(evt.key)) {
        console.log('new class', parseInt(evt.key));
        this.element.targetClass = parseInt(evt.key);
      }
    })
  }

  firstUpdated() {
    const readMaskFromFile = false;
    if (readMaskFromFile){
      const inputMask = new Image();
      inputMask.onload = () => {
        var canvas = document.createElement("canvas");
        canvas.width = inputMask.width;
        canvas.height = inputMask.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        ctx.drawImage(inputMask, 0, 0);
        var pixels = ctx.getImageData(0,0, inputMask.width, inputMask.height);
        for (let i = 0; i < inputMask.width * inputMask.height * 4; i += 4){
          //pixels.data[i] = 0;
          //pixels.data[i + 1] = 0;
          //pixels.data[i + 2] = pixels.data[i + 2] + 1;
          pixels.data[i + 3] = 255;
        }
        this.mask = pixels;
      }
      inputMask.src = 'mask.png';
    }
    else {
      const canvas = document.createElement('canvas');
      const width = 1280;
      const height = 720;
      const ctx = canvas.getContext('2d');
      const pixels = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < width * height * 4; i += 4){
        pixels.data[i] = 0;
        pixels.data[i + 1] = 0;
        pixels.data[i + 2] = 0;
        pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0, 0, 0, width, height);
      this.mask = pixels;
    }
    this.element.maskVisuMode = 'INSTANCE';
    this.element.targetClass = 2;
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
          <p class="icon" title="Add instance" @click=${() => this.element.mode = 'create_instance'}>${create_pencil}</p>
          <p class="icon" title="Select" @click=${() => this.element.mode = 'select_instance'}>${magic_select}</p>
          <p class="icon" title="Subtract" @click=${() => this.element.mode = 'remove_from_instance'}>${subtract}</p>
          <p class="icon" title="Union" @click=${() => this.element.mode = 'add_to_instance'}>${union}</p>
          <p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
          <p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
        </div>       
      </div>
    `;
  }

  render() {
    return html`
        <main>
          <pxn-segmentation image="${this.image}" .mask="${this.mask}" disablefullscreen>
          </pxn-segmentation>
          ${this.rightPanel}
        </main>`;
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-segmentation');
  }
  
}

customElements.define('demo-segmentation', DemoSegmentation);

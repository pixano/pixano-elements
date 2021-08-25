/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import '@pixano/graphics-2d';
import {html, LitElement} from 'lit-element';
import { demoStyles,
  fullscreen,
  createPencil,
  paintBrush,
  magicSelect,
  subtract,
  union,
  lock,
  zoomIn,
  zoomOut } from '@pixano/core/lib/style';

class MyDemo extends LitElement {
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
        this.element.targetClass = parseInt(evt.key);
      }
      if (evt.key === 's') {
        // print mask
        console.log('Mask', this.element.getMask());
      }
    })
  }

  firstUpdated() {
    const readMaskFromFile = true;
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
      inputMask.src = 'download2.png';
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
    this.element.clsMap = {
      0: [0,0,0,0],
      1: [255,0,0,1],
      2: [0,255,0,0]
    };
    this.element.targetClass = 1;
  }

  fullScreen() {
    if (document.fullscreenEnabled) {
      this.shadowRoot.querySelector('main').requestFullscreen();
    }
  }

  onUpdate() {
    console.log('on update')
  }

  get rightPanel() {
    return html`
      <div class="right-panel">
        <p class="icon" title="Fullscreen" style="position: absolute;" @click=${this.fullScreen}>${fullscreen}</p>
        <div class="icons">
          <p class="icon" title="Add instance (Polygon)" @click=${() => this.element.mode = 'create'}>${createPencil}</p>
          <p class="icon" title="Add instance (Brush)" @click=${() => this.element.mode = 'create-brush'}>${paintBrush}</p>
          <p class="icon" title="Select instance" @click=${() => this.element.mode = 'select'}>${magicSelect}</p>
          <p class="icon" title="Subtract (Ctrl)" @click=${() => this.element.mode = 'edit-remove'}>${subtract}</p>
          <p class="icon" title="Union (Shift)" @click=${() => this.element.mode = 'edit-add'}>${union}</p>
          <p class="icon" title="Lock" @click=${() => this.element.mode = 'lock'}>${lock}</p>
          <p class="icon" title="Zoom in (scroll)" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
          <p class="icon" title="Zoom out (scroll)" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
        </div>       
      </div>
    `;
  }

  render() {
    return html`
        <main>
          <pxn-segmentation image="${this.image}" @update="${this.onUpdate}" disablefullscreen>
          </pxn-segmentation>
          ${this.rightPanel}
        </main>`;
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-segmentation');
  }
  
}

customElements.define('my-demo', MyDemo);

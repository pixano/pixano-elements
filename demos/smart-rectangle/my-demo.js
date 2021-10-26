/**
 * Demo for smart rectangle annotation.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { css, html, LitElement } from "lit-element";
import "@pixano/graphics-2d/lib/pxn-smart-rectangle";
import '@material/mwc-linear-progress';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-textfield';

import { demoStyles,
  fullscreen,
  increase,
  decrease,
  upload,
  zoomIn,
  zoomOut } from '@pixano/core/lib/style';

const colorMap = {
  'person': 'blue',
  'bicycle': 'red',
  'car': 'green',
  'motorcycle': 'red',
  'airplane': 'red',
  'bus': 'red',
  'train': 'red',
  'truck': 'red',
  'boat': 'red',
  'traffic light': 'red',
  'fire hydrant': 'red',
  'stop sign': 'red',
  'parking meter': 'red',
  'bench': 'red',
  'bird': 'red',
  'cat': 'red',
  'dog': 'red',
  'horse': 'red',
  'sheep': 'red',
  'cow': 'red',
  'elephant': 'red',
  'bear': 'red',
  'zebra': 'red',
  'giraffe': 'red',
  'backpack': 'red',
  'umbrella': 'red',
  'handbag': 'red',
  'tie': 'red',
  'suitcase': 'red',
  'frisbee': 'red',
  'skis': 'red',
  'snowboard': 'red',
  'sports ball': 'red',
  'kite': 'red',
  'baseball bat': 'red',
  'baseball glove': 'red',
  'skateboard': 'red',
  'surfboard': 'red',
  'tennis racket': 'red',
  'bottle': 'red',
  'wine glass': 'red',
  'cup': 'red',
  'fork': 'red',
  'knife': 'red',
  'spoon': 'red',
  'bowl': 'red',
  'banana': 'red',
  'apple': 'red',
  'sandwich': 'red',
  'orange': 'red',
  'broccoli': 'red',
  'carrot': 'red',
  'hot dog': 'red',
  'pizza': 'red',
  'donut': 'red',
  'cake': 'red',
  'chair': 'red',
  'couch': 'red',
  'potted plant': 'red',
  'bed': 'red',
  'dining table': 'red',
  'toilet': 'red',
  'tv': 'red',
  'laptop': 'green',
  'mouse': 'red',
  'remote': 'red',
  'keyboard': 'red',
  'cell phone': 'red',
  'microwave': 'red',
  'oven': 'red',
  'toaster': 'red',
  'sink': 'red',
  'refrigerator': 'red',
  'book': 'red',
  'clock': 'red',
  'vase': 'red',
  'scissors': 'red',
  'teddy bear': 'red',
  'hair drier': 'red',
  'toothbrush': 'red0'
}

class MyDemo extends LitElement {
  static get styles() {
    return [demoStyles, css`
      main {
        display: flex;
        height: 100%;
        flex-direction: column;
      }
    `];
  }

  static get properties() {
    return {
      mode: { type: String },
      image: { type: String },
      scales: { type: Array },
      currentScale: { type: Number }
    };
  }
  constructor() {
    super();
    this.mode = "smart-create"; // overwrite default mode param of element
    this.image = 'image.jpg'; //'image2.jpeg'; 'image.jpg';
    this.scales = [0.25, 0.5, 1, 1.5, 2];
    this.currentScale = 1;
  }

  onCreate(e) {
    const obj = e.detail;
    obj.color = colorMap[obj.category];
  }

  onReady() {
    this.shadowRoot.querySelector('mwc-linear-progress').style.display = 'none';
  }

  // openDialog() {
  //   this.shadowRoot.querySelector('mwc-dialog').open = true;
  // }
  openDialog() {
    this.shadowRoot.getElementById('up').click();
  }

  uploadFromUrl() {
    const url = this.shadowRoot.querySelector('mwc-textfield').value;
    this.image = url;
    this.shadowRoot.querySelector('pxn-smart-rectangle').shapes.clear();
  }

  onUpload(event) {
    try {
      const src = URL.createObjectURL(event.target.files[0]);
      this.element.image = src;
      this.element.shapes = [];
    } catch(err) {}
  }

  get dialog() {
    return html`
      <p class="icon" title="Upload image" style="position: absolute; bottom: 0px;" @click=${this.openDialog}>${upload}
      <input id="up" style="display:none;" accept="image/*" type="file" @change=${this.onUpload}/></p>
      <!-- <mwc-dialog>
        <div>Choose image url from the web:</div>
        <mwc-textfield type="url"></mwc-textfield>
        <mwc-button
            slot="primaryAction"
            @click=${() => this.uploadFromUrl()}
            dialogAction="ok">
          Upload
        </mwc-button>
        <mwc-button
            slot="secondaryAction"
            dialogAction="cancel">
          Cancel
        </mwc-button>
      </mwc-dialog> -->
    `;
  }

  get rightPanel() {
    return html`
      <div class="right-panel">
        <p class="icon" title="Fullscreen" style="position: absolute;" @click=${this.fullScreen}>${fullscreen}</p>
        <div class="icons">
          <p class="icon" title="ROI increase (+)" @click=${() => this.element.roiUp()}>${increase}</p>
          <p class="icon" title="ROI decrease (-)" @click=${() => this.element.roiDown()}>${decrease}</p>
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
        <mwc-linear-progress indeterminate></mwc-linear-progress>
        <pxn-smart-rectangle
          image="${this.image}"
          mode=${this.mode}
          scale="${this.currentScale}"
          @create=${this.onCreate}
          @ready=${this.onReady}
          disablefullscreen
        >
        </pxn-smart-rectangle>
        ${this.rightPanel}
        ${this.dialog}
      </main>
    `;
  }

  _onChangeScale() {
    const newScale = this.shadowRoot.getEdialoglementById('scale-selector').value;
    this.currentScale = newScale;
  }

  _onMode() {
    this.mode = this.element.mode;
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-smart-rectangle');
  }
}

customElements.define('my-demo', MyDemo);

/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import '@pixano/graphics-3d';
import {html, LitElement} from 'lit-element';
import { demoStyles,
  fullscreen,
  create_pencil,
  swap } from '@pixano/core/lib/svg';

const colormap = [
  0xe6194b, 0x3cb44b, 0xffe119, 0x0082c8, 0xf58230, 0x911eb4, 0x46f0f0,
  0xf032e6, 0xd2f53c, 0xfabebe, 0x008080, 0xe6beff, 0xaa6e28, 0xfffac8,
  0x800000, 0xaaffc3, 0x808000, 0xffd7b4, 0x000080, 0x808080];

class MyDemo extends LitElement {

  static get properties() {
    return {
      pcl: {type: String}
    };
  }

  static get styles() {
    return demoStyles;
  }

  constructor() {
    super();
    this.pcl = 'sample_pcl.bin';
  }

  get element() {
    return this.shadowRoot.querySelector('pxn-cuboid-editor');
  }

  firstUpdated() {
    // Subscribe to events
    this.element.addEventListener("create", e => {
      console.log("create", e.detail)
      e.detail.color = colormap[Math.floor(Math.random() * colormap.length)];
    });
    this.element.addEventListener("delete", e => console.log("delete", e.detail));
    this.element.addEventListener("update", e => console.log("update", e.detail));
    this.element.addEventListener("selection", e => {
      console.log("select", e.detail);
      this.target = e.detail;
    });
    fetch(this.pcl).then((response) => {
      return response.ok ? response.arrayBuffer() : Promise.reject(response.status);
    }).then((points) => {
      this.element.pcl = new Float32Array(points);
      this.pcl = this.element.pcl;
    });
    
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
          <p class="icon" title="Add instance" @click=${() => this.element.mode = 'create'}>${create_pencil}</p>
          <p class="icon" title="Add instance" @click=${() => this.element.swap()}>${swap}</p>
        </div>       
      </div>
    `;
  }

  render() {
    return html`
        <main>
          <pxn-cuboid-editor></pxn-cuboid-editor>
          ${this.rightPanel}
        </main>`;
  }
}

customElements.define('my-demo', MyDemo);

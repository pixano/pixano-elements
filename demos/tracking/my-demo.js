/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/
import {html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';
import '@material/mwc-button';
import { demoStyles } from '@pixano/core/lib/style';

class MyDemo extends LitElement {
  static get styles() {
    return demoStyles;
  }

  constructor() {
    super();
    const vid = "video/";
    this.images = Array(10).fill(0).map((_, idx) => vid + `${idx+1}`.padStart(2, '0') + '.png');
  }

  static get properties() {
    return {
      images: {type: Array}
    };
  }

  firstUpdated() {
    window.addEventListener('keydown', (evt) => {
      if (evt.key == 't') {
        this.element.mode = 'tracking';
      }
    });
    this.element.categories = [
      { name: 'car', color: "green", properties: [] },
      { name: 'truck', color: "#eca0a0", properties: [{name: 'posture', type: 'dropdown', enum: ['standing', 'bending', 'sitting', 'lying'],persistent: false, default: 'standing'}]}
    ];
  }


  get element() {
    return this.shadowRoot.getElementById('test');
  }

  render() {   
    return html`<pxn-tracking id="test"
                              .input=${this.images}
                              @create-track=${(e) => console.log('create track', e.detail)}
                              @selection-track=${(e) => console.log('selection track', e.detail)}
                              @update-tracks=${(e) => console.log('update tracks', e.detail)}
                              @delete-track=${(e) => console.log('delete track', e.detail)}></pxn-tracking>`;
  }
}

customElements.define('my-demo', MyDemo);
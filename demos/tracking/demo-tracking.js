/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/
import {css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d/lib/pxn-tracking';
import '@pixano/graphics-2d/lib/pxn-track-panel';

//import {Track} from '@pixano/graphics-2d/lib/pxn-tracking';


class DemoTracking extends LitElement {
  static get styles() {
    return [css`
    main {
      display: flex;
      height: 100%;
    }`];
  }

  static get properties() {
    return {
      imageIdx: {type: Number},
      selectedTrackId: {type: Number},
      //trackIds: {type: Array}
    };
  }

  constructor(){
    super();
    this.imageIdx = 0;
    this.imageList = new Array();
    this.selectedTrackId = -1;
    this.tracks = {};


    const basename = './sequence/'
    for (let i = 1; i < 30; i++) [
      this.imageList.push(basename + paddy(i, 6) + '.jpg')
    ]

    window.addEventListener('keydown', (evt) => {
      if (evt.key == 'ArrowLeft') {
        this.imageIdx = Math.max(this.imageIdx - 1, 0);
      }
      if (evt.key == 'ArrowRight') {
        this.imageIdx = Math.min(this.imageIdx + 1, this.imageList.length-1);
      }
      if (evt.key == 'Delete') {
        this.tracker.deleteBox();
      }
      if (evt.key == 'Control') {
        this.tracker.rectangle.mode = 'update';
      }
    });

    window.addEventListener('keyup', (evt) => {
      if (evt.key == 'Control') {
        this.tracker.rectangle.mode = 'create';
      }
    });
  }

  get tracker() {
    return this.shadowRoot.querySelector('pxn-tracking');
  }

  get picker() {
    return this.shadowRoot.querySelector('pxn-track-panel');

  }

  resize() {
    this.tracker.resize();
  }


  onUpdate(e) {
    console.log("demo update !", e.detail);
    this.tracks = e.detail;
  }


  render() {
          
  return html`
    <main>
      <pxn-tracking
            image=${this.imageList[this.imageIdx]}
            imageIdx=${this.imageIdx}
            selectedTrackId=${this.selectedTrackId}
            .tracks=${this.tracks}
            @selected-box-changed=${() => this.selectedTrackId = this.tracker.selectedTrackId}
            @fill-temp-props=${(e) => this.picker.fillTempProps(e.detail)}
            @update=${(e) => this.onUpdate(e)}>
        </pxn-tracking>

        <pxn-track-panel
          imageIdx=${this.imageIdx}
          selectedTrackId=${this.selectedTrackId}
          .tracks=${this.tracks}
          @create=${() => this.selectedTrackId = this.picker.selectedTrackId}
          @imageIdx-changed=${() => this.imageIdx = this.picker.imageIdx}
          @selected-track-changed=${() => this.selectedTrackId = this.picker.selectedTrackId}
          @change-display-mode=${() => this.tracker.changeDisplayMode()}
          @update=${(e) => this.onUpdate(e)}>
        </pxn-track-panel>
    </main>`;
  } 
}

customElements.define('demo-tracking', DemoTracking);

function paddy(num, padlen, padchar) {
  var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
  var pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
}

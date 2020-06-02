/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/
import {css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d/lib/pxn-tracking';
import '@pixano/graphics-2d/lib/pxn-track-panel';
import '@material/mwc-button';
// import {Track} from '@pixano/graphics-2d/lib/pxn-tracking';


class MyDemo extends LitElement {
  static get styles() {
    return [css`
    main {
      display: flex;
      height: 100%;
    }
    p {
      margin: 0;
      text-align: center;
    }
    pxn-track-panel {
      flex: 0 0 300px;
    }
    pxn-tracking {
      height: calc(100% - 18px);
    }
    #editor {
      width: 100%;
      flex: 1;
      min-width: 100px;
    }
    `];
  }

  static get properties() {
    return {
      imageIdx: {type: Number},
      selectedTracks: {type: Object},
      mode: {type: String},
      tracks: {type: Object}
    };
  }

  constructor() {
    super();
    this.imageIdx = 0;
    this.mode = 'edit';
    this.imageList = new Array();
    this.selectedTracks = new Set();
    this.tracks = {};
    // fetch("./20170320_144339_cam_0_tracks.json")
    //   .then(response => response.json())
    //   .then(json => {
    //     console.log('set tracks');
    //     this.tracks = json.annotations;
    //   });
    for (let i = 1; i < 30; i++) [
      this.imageList.push('sequence/' + paddy(i, 6) + '.jpg')
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
        this.tracker.mode = 'update';
      }
      if (evt.key == 'm') {
        this.selectedTracks = {};
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
      <div id="editor">
        <pxn-tracking
            image=${this.imageList[this.imageIdx]}
            imageIdx=${this.imageIdx}
            mode=${this.mode}
            .tracks=${this.tracks}
            .selectedTracks=${this.selectedTracks}
            @selection-track=${() => this.picker.requestUpdate()}
            @create=${(e) => this.picker.newTrack(e)}
            @update=${() => this.picker.requestUpdate()}>
        </pxn-tracking>
        <p>${this.imageIdx}</p>
      </div>
      <pxn-track-panel
        imageIdx=${this.imageIdx}
        mode=${this.mode}
        .selectedTracks=${this.selectedTracks}
        .tracks=${this.tracks}
        @mode=${(e) => this.mode = e.detail}
        @update=${() => this.tracker.drawTracks()}
        @imageIdx-changed=${() => this.imageIdx = this.picker.imageIdx}>
      </pxn-track-panel>
    </main>`;
  } 
}

customElements.define('my-demo', MyDemo);

function paddy(num, padlen, padchar) {
  var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
  var pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
}

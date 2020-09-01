/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { html, css, LitElement, property } from 'lit-element';
import './playback-control';
import { SequenceLoader, Loader } from './data-loader';


/**
 * Utility class to load images of sequences of images given
 * their sources.
 * 
 * @fires CustomEvent#load upon loading input item { detail: input data }
 * @fires CustomEvent#timestamp upon changing current timestamp { detail: number }
 */
export abstract class GenericDisplay extends LitElement {

      public loader: Loader | SequenceLoader = new Loader();

      // additionnal properties for sequence loader
      public maxFrameIdx: number | null = null;
      public pendingLoad: boolean | null = null;
      public targetFrameIdx: number | null = null;

      private _source: string | string[] = '';

      static get properties() {
        return {
          maxFrameIdx: { type: Number },
          targetFrameIdx: { type: Number }
        };
      }

      static get styles() {
        return [css`
          #container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          [name="slider"] {
            height: 50px;
            flex: 0 0 50px;
            display: flex;
          }
          playback-control {
            background: var(--theme-color);
            color: var(--font-color);
          }
        `];
      }

      constructor() {
        super();
        this.onSliderChange = this.onSliderChange.bind(this);
      }

      protected firstUpdated() {
        const slot = this.shadowRoot?.querySelector('slot')!;
        slot.addEventListener('slotchange', () => {
          // let nodes = slot.assignedNodes();
          this.playback!.disconnectedCallback();
        });
      }

      @property({ type: String })
      get input(): string | string[] {
        return this._source;
      }

      /**
       * Load data from source file or sequence of files
       *  @param {string | string[]} source - media file name or list of media file names
       */
      set input(source: string | string[]) {
        this._source = source;
        
        // case of unique data file
        if (typeof source === 'string') {
          this.loader = new Loader();
          this.loader.load(source).then ((data) => {
            this.notifyInputLoaded(data);
          })
        } else {
          // list of strings
          const loader = new SequenceLoader();
          this.loader = loader;
          const frames = source.map( (path, timestamp) => ({timestamp, path})) || [];
          loader.init(frames)
                .then((length) => {
                  this.maxFrameIdx = Math.max(length - 1, 0);
                  if (this.playback) {
                    this.playback.set(0);
                  } else {
                    this.frame = 0;
                  }
                });
        }
      }

      /**
       * Get frame index
       */
      get frame(): number {
        return this.targetFrameIdx || 0;
      }

      /**
       * Set frame to load
       * @param {number} frameIndex - index of frame to load
       */
      set frame(frameIndex: number) {
        if (!this.isSequence) {
          return;
        }
        const maxFrameIdx = this.maxFrameIdx as number;
        const loader = this.loader as SequenceLoader;
        if (frameIndex >= 0 && frameIndex <= maxFrameIdx) {
          this.targetFrameIdx = frameIndex;
          if (this.pendingLoad) {
            return;
          }
          this.pendingLoad = true;
          loader.peekFrame(this.targetFrameIdx).then((data: any) => {
            this.pendingLoad = false;
            this.notifyInputLoaded(data);
            this.notifyTimestampChanged();
          });
        }
      }

      public nextFrame() {
        if (this.isSequence) {
          if (this.playback) {
            this.playback.setNext();
          } else {
            const currIdx = this.targetFrameIdx as number;
            const maxIdx = this.maxFrameIdx as number;
            if (currIdx < maxIdx) {
              this.frame = currIdx + 1;
            }
          }
        }
      }

      /**
       * Fired on playback slider update.
       * @param {CustomEvent} evt 
       */
      onSliderChange(evt: CustomEvent) {
        this.frame = evt.detail;
      }

      get isSequence() {
        return this.loader instanceof SequenceLoader;
      }

      private notifyInputLoaded(data: HTMLImageElement | Float32Array) {
        this.dispatchEvent(new CustomEvent('load', { detail: data}));
      }

      private notifyTimestampChanged() {
        this.dispatchEvent(new CustomEvent('timestamp', { detail: this.targetFrameIdx }));
      }

      /**
       * Returns video playback slider element.
       */
      get playback() {
        return this.shadowRoot!.querySelector('playback-control');
      }

      display() {
        return html``;
      }

      /**
       * Generic render that display a playback slider at the bottom
       * if the component displays a sequence.
       * You can override the default "slider" slot by your own html child. E.g:
       * `
       *  <pxn-cuboid>
       *    <div slot="slider">Slider</div>
       *  </pxn-cuboid>
       * `
       */
      render() {
        return html`
        <div id="container">
          ${this.display()}
          <slot name="slider" id="slot" style="display: ${this.isSequence ? 'block': 'none'};">
                <playback-control @update=${this.onSliderChange}
                                  style="display: ${this.isSequence ? 'flex': 'none'};"
                                  max=${this.maxFrameIdx}></playback-control>
          </slot>
        </div>
        `;
      }
}
/**
 * Implementation of a navigation slider.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { LitElement, html, css, customElement, property} from 'lit-element';
import "@material/mwc-slider/mwc-slider";

@customElement('playback-control' as any)
export class PlaybackControl extends LitElement {

    @property({type: String})
    public max: number = 0;

    @property({type: String})
    private current: number = 0;

    private onNavigationKeyBind: (evt: KeyboardEvent) => void;

    // utils boolean to force maximal slider fps
    // using keydown of: 10fps
    private enableNavigation: boolean = true;

    static get styles() {
      return [
        css`
          :host {
            display: flex;
            overflow: hidden;
            width: 100%;
            height: 50px;
            z-index: 1;
            -webkit-touch-callout: none; /* iOS Safari */
            -webkit-user-select: none; /* Safari */
             -khtml-user-select: none; /* Konqueror HTML */
               -moz-user-select: none; /* Old versions of Firefox */
                -ms-user-select: none; /* Internet Explorer/Edge */
                    user-select: none; /* Non-prefixed version, currently
                                          supported by Chrome, Opera and Firefox */
          }

          mwc-slider {
            align-items: center;
            width: -webkit-fill-available;
            width: 100%;
            margin-right: 15px;
          }
          .button {
            cursor: pointer;
            margin-right: 10px;
            margin-left: 10px;
            font-size: 23px;
            align-items: center;
            display: flex;
          }
          .flip {
            -webkit-transform: scaleX(-1);
            transform: scaleX(-1);
          }
          .frameidx {
            width: 55px;
            align-items: center;
            display: flex;
            margin: auto;
            padding: 0;
            padding-right: 15px;
          }
        `
      ];
    }

    constructor() {
      super();
      this.onNavigationKeyBind = this.onNavigationKey.bind(this);
    }

    onNavigationKey(evt: KeyboardEvent) {
      if ((evt.key === 'ArrowRight' || evt.key === 'ArrowLeft') &&
            this.shadowRoot!.activeElement === this.slider) {
        // stop bubbling
        evt.stopPropagation();
      }
      if (!this.enableNavigation) {
        return;
      }
      this.enableNavigation = false;
      // force navigation speed through arrow keys to under 10fps.
      setTimeout(() => {
        this.enableNavigation = true;
      }, 100);
      if (evt.key === 'ArrowRight') {
        this.setNext();
      }
      if (evt.key === 'ArrowLeft') {
        this.setBefore();
      }
    }

    connectedCallback() {
      super.connectedCallback();
      // set global window event listeners on connection
      // using useCapture so as to it is triggered first
      window.addEventListener('keydown', this.onNavigationKeyBind, true);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      // A classic global event listener is not be automatically destroyed by lit-element,
      // Removing it to prevent memory leaks and weird bugs.
      window.removeEventListener('keydown', this.onNavigationKeyBind);
    }

    onSliderInput() {
      this.current = this.slider.value;
      this.dispatchEvent(new CustomEvent('update', { detail: this.slider.value}));
    }

    onSliderChange() {
      this.current = this.slider.value;
      this.dispatchEvent(new CustomEvent('update', { detail: this.slider.value}));
    }

    firstUpdated() {
      this.slider.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          // stop bubbling
          event.stopPropagation();
        }
      });
    }

    setNext() {
      this.slider.value = Math.min(this.slider.value + 1, this.max);
      this.current = this.slider.value;
      this.dispatchEvent(new CustomEvent('update', { detail: this.slider.value}));
    }

    setBefore() {
      this.slider.value = Math.max(this.slider.value - 1, 0);
      this.current = this.slider.value;
      this.dispatchEvent(new CustomEvent('update', { detail: this.slider.value}));
    }

    public set(value: number) {
      this.slider.value = value;
      this.current = this.slider.value;
      this.dispatchEvent(new CustomEvent('update', { detail: this.slider.value}));
    }

    get slider() {
      return this.shadowRoot!.querySelector('mwc-slider')!;
    }


    /**
     * Render the element template.
     */
    render(){
        /**
         * `render` must return a lit-html `TemplateResult`.
         *
         * To create a `TemplateResult`, tag a JavaScript template literal
         * with the `html` helper function:
         */
        return html`
          <p class="button flip" @click=${this.setBefore}>&#10148;</p>
          <p class="button" @click=${this.setNext}>&#10148;</p>
          <p class="frameidx">${this.current}/${this.max}</p>
          <mwc-slider @input=${this.onSliderInput}
                      @change=${this.onSliderChange}
                      discrete
                      markers
                      max="${this.max}"
                      step="1"></mwc-slider>
        `;
    }

}
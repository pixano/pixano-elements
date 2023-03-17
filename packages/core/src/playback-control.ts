/**
 * Implementation of a navigation slider.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import {LitElement, html, css} from 'lit';
import {property, customElement} from 'lit/decorators.js';
import "@material/mwc-slider/mwc-slider";
import { triLeft, triRight } from './style';

@customElement('playback-control' as any)
export class PlaybackControl extends LitElement {

	@property({ type: Number })
	public max: number = 0;

	@property({ type: Number })
	public current: number = 0;

	// utils boolean to force maximal slider fps
	// using keydown of: keySpeed fps
	private enableNavigation: boolean = true;

	// slider time limit using keydown (ms), i.e fps: 1000/keyTime
	private keyTime = 50;

	static get styles() {
		return [
			css`
					:host {
						display: flex;
						overflow: hidden;
						width: 100%;
						height: 50px;
						z-index: 1;
						background: #f9f9f9;
						--mdc-theme-secondary: #9C27B0;
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
					.button > svg {
						height: 18px;
					}
					.frameidx {
						color: #777777;
						font-size: 14px;
						-webkit-transform: scale(1.1, 1);
						width: 55px;
						align-items: center;
						display: flex;
						margin: auto;
					}
				`
		];
	}

	constructor() {
		super();
		this.onNavigationKey = this.onNavigationKey.bind(this);
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
		}, this.keyTime);
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
		window.addEventListener('keydown', this.onNavigationKey);
	}

	disconnectedCallback() {
		// A classic global event listener is not be automatically destroyed by lit-element,
		// Removing it to prevent memory leaks and weird bugs.
		window.removeEventListener('keydown', this.onNavigationKey);
		super.disconnectedCallback();
	}

	onSliderInput() {
		this.set(this.slider.value);
	}

	setNext() {
		this.set(Math.min(this.slider.value + 1, this.max));
	}

	setBefore() {
		this.set(Math.max(this.slider.value - 1, 0));
	}

	/**
	 * Set from inside, notify change
	 * @param value
	 */
	public set(value: number) {
		this.current = value;
		this.dispatchEvent(new CustomEvent('update', { detail: this.current }));
	}

	get slider() {
		return this.shadowRoot!.querySelector('mwc-slider')!;
	}

	updated(changedProps: any) {
		if (changedProps.has('current')) {
			try {
				this.slider?.layout();
			} catch { console.warn("slider update failed"); }
		}
	}


	/**
	 * Render the element template.
	 */
	render() {
		/**
		 * `render` must return a lit-html `TemplateResult`.
		 *
		 * To create a `TemplateResult`, tag a JavaScript template literal
		 * with the `html` helper function:
		 */
		return html`
					<p class="button" style="fill: ${this.current > 0 ? "black" : "#d0d0d0"}" @click=${this.setBefore}>${triLeft}</p>
					<p class="button" style="fill: ${this.current < this.max ? "black" : "#d0d0d0"}" @click=${this.setNext}>${triRight}</p>
					<p class="frameidx">${this.current}/${this.max}</p>
					<mwc-slider @input=${this.onSliderInput}
											discrete
											value=${this.current}
											max="${this.max}"
											step="1"></mwc-slider>
				`;
	}

}

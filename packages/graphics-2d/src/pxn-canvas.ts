/**
 * Implementation of generic class that displays an image
 * with 2D shapes overlayed.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { html, property } from 'lit-element';
import { copyClipboard, pasteClipboard } from '@pixano/core/lib/utils';
import { GenericDisplay } from '@pixano/core/lib/generic-display';
import { Renderer } from './renderer';
import { ViewControls } from './view-controls';
import { style2d } from './style';
import { fullscreen } from '@pixano/core/lib/style';

/**
 * Parent class that displays image
 */
export abstract class Canvas extends GenericDisplay {

	// input image path
	@property({ type: String })
	public image: string | null = null;

	// whether to display or not the labels
	// on the image
	@property({ type: Boolean })
	public hideLabels: boolean = false;

	@property({ type: Boolean })
	public disablefullscreen: boolean = false;

	// background color
	@property({ type: String })
	public color: string = "#f3f3f5";

	// renderer class
	// html view is added on firstUpdated
	public renderer: Renderer = new Renderer({ color: this.color });

	@property({ type: Number })
	public zoom: number = this.renderer.s;

	// controller of the view enabling
	// panning with right pointer and zoom.
	protected viewControls: ViewControls = new ViewControls(this.renderer);

	protected keyHandlerBind: (evt: any) => void = this.keyBinding.bind(this);

	static get styles() {
		return style2d;
	}

	constructor() {
		super();
		this.authorizedType = 'image';
		this.dispatchEvent = this.dispatchEvent.bind(this);
		this.viewControls.addEventListener("zoom", (evt: any) => this.zoom = evt.detail);
		this.viewControls.addEventListener("update-display", (evt: any) => { this.dispatchEvent(new CustomEvent(evt.type, evt)) });
		this.addEventListener('load', (evt: any) => this.data = evt.detail);
	}

	connectedCallback() {
		super.connectedCallback();
		// set global window event listeners on connection
		window.addEventListener('keydown', this.keyHandlerBind);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		// A classic event listener will not be automatically destroyed by lit-element,
		// This will introduce memory leaks and weird bugs.
		window.removeEventListener('keydown', this.keyHandlerBind);
	}

	get imageWidth() {
		return this.renderer.imageWidth;
	}

	get imageHeight() {
		return this.renderer.imageHeight;
	}

	/**
	 * Set the image to display, from a Image Element
	 */
	set data(img: HTMLImageElement) {
		if (img && img !== this.renderer.image) {
			this.renderer.image = img;
			// Uncomment if you want to reset zoom whenever	changing image.
			// Note that this is not the default behaviour to keep consistency
			// For image sequences.
			// this.viewControls.reinit();
		}
	}

	get data() {
		return this.renderer.image;
	}

	public zoomIn() {
		this.viewControls.zoomIn();
	}

	public zoomOut() {
		this.viewControls.zoomOut();
	}

	public resize() {
		this.renderer.resize();
	}

	/**
	 * Toggle labels (hide / show)
	 */
	public toggleLabels() {
		if (this.hideLabels === false) {
			this.hideLabels = true;
		} else {
			this.hideLabels = false;
		}
	}

	/**
	 * Handle copy keyboard event
	 * Return the string you want to copy
	 */
	protected abstract onCopy(): string | void;
	/**
	 * Handle tabulation event
	 * @param event [keyBoardEvent]
	 */
	protected abstract onTabulation(event: KeyboardEvent): void;

	/**
	 * Handle paste of copied string.
	 */
	protected onPaste(text: string): string | void {
		return text;
	}

	/**
	 * General keyboard event handling
	 * @param event [keyBoardEvent]
	 */
	public keyBinding(evt: Event) {
		const event = evt as KeyboardEvent;
		switch (event.key) {
			case 'c': {
				if (event.ctrlKey) {
					const str = this.onCopy();
					if (str) copyClipboard(str);
				}
				break;
			}
			case 'v': {
				if (event.ctrlKey) {
					pasteClipboard().then((str) => {
						if (str) this.onPaste(str);
					});
				}
				break;
			}
			case 'm': {
				this.renderer.brightness -= 0.1;
				break;
			}
			case 'p': {
				this.renderer.brightness += 0.1;
				break;
			}
			case ' ': {
				if (event.ctrlKey) this.toggleLabels();
				break;
			}
			case 'Tab': {
				this.onTabulation.bind(this)(event);
				break;
			}
		}
	}

	/**
	 * Called after the element’s DOM has been updated the first time
	 * @param changedProperty
	 */
	protected firstUpdated() {
		super.firstUpdated();
		this.renderer.setContainer(this.canvasElement);
	}

	/**
	 * Snackbar temporary appearance
	 * To display mode instructions.
	 * @param text
	 */
	protected showTooltip(text: string) {
		const x = this.shadowRoot!.getElementById("snackbar")!;
		x.className = "show";
		x.innerHTML = text;
		setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
	}

	protected loadImageFromSrc(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = "Anonymous";
			if (src) {
				img.onload = () => {
					if (img !== null) {
						resolve(img)
					}
				}
				img.src = src;
			} else {
				resolve(img);
			}
		})
	}

	/**
	 * Called on every property change
	 * @param changedProperty
	 */
	protected updated(changedProperties: any) {
		if (changedProperties.has('image') && this.image !== null) {
			console.warn("WARNING! Obsolete property. Property 'image' has been deprecated, please use the new 'input' instead!");
			this.input = this.image;
		}
		if (changedProperties.has('hideLabels') && this.hideLabels !== undefined) {
			this.renderer.showLabels = !this.hideLabels;
		}
		if (changedProperties.has('color')) {
			this.renderer.setBackgroundColor(this.color);
		}
	}

	/**
	 * Return HTML canvas element where labels are drawn
	 */
	protected get canvasElement(): HTMLDivElement {
		return this.shadowRoot!.getElementById("canvas") as HTMLDivElement;
	}

	/**
	 * Render canvas fullscreen.
	 */
	protected fullScreen() {
		if (document.fullscreenEnabled) {
			this.canvasElement.requestFullscreen();
		}
	}

	/**
	 * Render the element template.
	 */
	display() {
		/**
		 * `render` must return a lit-html `TemplateResult`.
		 *
		 * To create a `TemplateResult`, tag a JavaScript template literal
		 * with the `html` helper function:
		 */
		return html`
			<div id="zoom" class="corner ${this.zoom > 1 ? '' : 'hidden'}">x${this.zoom.toFixed(1)}</div>
			${this.disablefullscreen ? html`` : html`
				<p class="corner" @click=${this.fullScreen} title="Fullscreen">${fullscreen}</p>`
			}
			<div id="canvas" class="canvas-container" oncontextmenu="return false;"></div>
			<div id="snackbar"></div>
		`;
	}
}

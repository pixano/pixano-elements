/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import {css, html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';
import { demoStyles,
	fullscreen,
	createPencil,
	pointer,
	zoomIn,
	zoomOut } from '@pixano/core/lib/style';

class MyDemo extends LitElement {
	static get styles() {
		return demoStyles;
	}

	static get properties() {
		return {
			image: { type: String },
			shapes: {type: Array},
			selectedShapeIds: {type: Array},
			events: {type: Array},
			mode: {type: String},
			events: {type: Array},
			disableMultiSelection: {type: Boolean},
			disableTabulation: {type: Boolean},
			hideLabels: {type: Boolean}
		};
	}
	constructor() {
		super();
		this.mode = 'edit';	// overwrite default mode param of element
		this.events = [];
		this.maxEventSize = 5;
		this.selectedShapeIds = [];
		this.disableMultiSelection = false;
		this.disableTabulation = false;
		this.hideLabels = false;
		this.image = "";
	}

	get rightPanel() {
		return html`
		<div class="right-panel">
				<p class="icon" title="Fullscreen" style="position: absolute;" @click=${this.fullScreen}>${fullscreen}</p>
				<div class="icons">
					<p class="icon" title="Edit" @click=${() => this.element.mode = 'edit'}>${pointer}</p>
					<p class="icon" title="Add graph" @click=${() => this.element.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				</div>
			</div>
		`;
	}

	resize() {
		this.element.resize();
	}

	render() {
		return html`
				<main>
					<pxn-graph	enableOutsideDrawing
											image=${this.image}
											@create=${this.onCreate}
											@update=${this.onUpdate}
											@selection=${this.onSelection}
											mode=${this.mode}>
					</pxn-graph>
					${this.rightPanel}
				</main>`;
	}

	firstUpdated() {
		this.element.settings.radius = 3;
		this.element.settings.edges = [[0,1],[1,2]];
		this.element.settings.vertexNames = ["Left eye","Nose","Right eye"];
		// this.element.settings.showVertexName = false;
	}

	onCreate() {
		this.element.mode = 'edit';
		console.log('create');
	}

	onUpdate() {
		console.log('update');
	}

	onSelection(evt) {
		console.log('selection ids', evt.detail);
	}

	updated(changedProperties) {
	}

	get element() {
		return this.shadowRoot.querySelector('pxn-graph');
	}
}

customElements.define('my-demo', MyDemo);


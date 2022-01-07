/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2021)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { html, LitElement, css} from 'lit-element';
import '@pixano/graphics-2d';
import '@pixano/graphics-3d';
import { demoStyles,
	fullscreen,
	createPencil,
	pointer,
	polyline,
	paintBrush,
	magicSelect,
	subtract,
	union,lock,
	swap,
	increase,
	decrease,
	borderOuter,
	zoomIn,
	zoomOut } from '@pixano/core/lib/style';// ...TODO : change local icons to mwc-icon-button
import { ModeManager } from '@pixano/graphics-3d/lib/cuboid-manager';

var FileSaver = require('file-saver');
// import { ImageSequenceLoader } from './data-loader';// ...TODO loader
const colors = [
	'blue', 'green', 'purple',
	'yellow', 'pink', 'orange', 'tan'
];

/**
 * List of all plugin names
 */
export const pluginsList = [// ...TODO move @pixano-app/frontend/src/plugins/index.js file here with labels
	'classification',
	'keypoints',
	'rectangle',
	'polygon',
	'segmentation',
	'cuboid-editor',
	'tracking',
	'smart-rectangle',
	'smart-segmentation',
	'smart-tracking'
];// ...TODO for sequences add app sequence-mixin ?

export class ServerlessDemo extends LitElement {

	static get properties() {
		return {
			// generic properties
			chosenPlugin: { type: String },
			input: {type: String},
			mode: {type: String},
			theme: { type: String },
			// specific properties
			isOpenedPolygon: { type: Boolean },//for pxn-polygon
			maskVisuMode: { type: String }//for pxn-segmentation
		};
	}

	constructor() {
		super();
		// generic properties
		this.input = 'image.jpg';
		this.theme = 'black';
		this.mode = '';
		this.chosenPlugin = '';//empty = no plugin chosen
		// this.labels = [];// ...TODO labels
		// this.loader = new ImageSequenceLoader();// ...TODO loader
		// specific properties
		this.isOpenedPolygon = true;//for pxn-polygon
		this.maskVisuMode = 'SEMANTIC';//for pxn-segmentation
	}

	/**
	 * Invoked after the element’s template has been created.
	 */
	firstUpdated() {
		this.mode = 'edit';
	}

	onCreate(evt) {
		const newObj = evt.detail;
		newObj.color = colors[Math.floor(Math.random() * colors.length)];
		// this.mode = 'edit';
		console.log("create", evt.detail.id)
	}

	onSave() {
		const json_string = JSON.stringify(this.labels, null, 1);
		const blob = new Blob([json_string],{type: "text/plain;charset=utf-8"})
		FileSaver.saveAs(blob, "my_json.json")
	}

	onUpload(event) {
		try {
			const mediaInfo = Object.entries(event.target.files).map(([ts, f], idx) => {
				const src = URL.createObjectURL(f);
				return {timestamp: idx, url:[src]}
			})
			this.newData(mediaInfo);      
		} catch(err) {}
	}

	newData(mediaInfo) {
		// set first image and start loading video
		this.input = mediaInfo[0].url[0];
		this.element.image = mediaInfo[0].url[0];
		// this.loader.init(mediaInfo || []).then((length) => {// ...TODO loader
		// 	this.maxFrameIdx = Math.max(length - 1, 0);
		// 	this.loader.abortLoading().then(() => {
		// 		this.loader.load(0).then(() => {
		// 			this._resetPlayback();
		// 		});
		// 	})
		// });
		// this.labels = [];// ...TODO labels
		// this.element.shapes = [];
		// this.selectedIds = [];
	}

	get element() {
		return this.shadowRoot.querySelector(this.chosenPlugin);
	}

	get headerContent() {
		if (this.chosenPlugin==='') return html`
			<h1>Dashboard: choose your annotation plugin</h1>
		`;
		else return html`
			<h1>Annotate</h1>
			<mwc-icon-button icon="exit_to_app" @click=${() => this.chosenPlugin = ''} title="Back to plugin choice"></mwc-icon-button>
			<mwc-icon-button icon="upload_file" @click="${() => this.shadowRoot.getElementById('up').click()}" title="Upload your images">
				<input id="up" style="display:none;" accept="image/*.jpg|image/*.png" type="file" multiple @change=${this.onUpload}/>
			</mwc-icon-button>
			<mwc-icon-button icon="save" @click="${this.onSave}" title="Save to json file"></mwc-icon-button>
		`;
	}

	get tools_old() {// ...TODO : tools should be included into each element, not here
		switch (this.chosenPlugin) {
			case 'pxn-keypoints':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Edit" @click=${() => this.mode = 'edit'}>${pointer}</p>
					<p class="icon" title="Add keypoints" @click=${() => this.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'pxn-rectangle':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Add rectangle" @click=${() => this.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'pxn-polygon':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Add polygon" @click=${() => {this.isOpenedPolygon=false; this.mode = 'create'}}>${createPencil}</p>
					<p class="icon" title="Add line" @click=${() => {this.isOpenedPolygon=true; this.mode = 'create'}}>${polyline}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'pxn-segmentation':
				return html`
					<p class="icon" title="Polygon tool" @click=${() => this.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Brush tool" @click=${() => this.mode = 'create-brush'}>${paintBrush}</p>
					<hr>
					<p class="icon" title="Select instance" @click=${() => this.mode = 'edit'}>${magicSelect}</p>
					<hr>
					<p class="icon" title="Remove from instance (Ctrl)" @click=${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}>${subtract}</p>
					<p class="icon" title="Add to instance (Shift)" @click=${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}>${union}</p>
					<p class="icon" title="Lock" @click=${() => this.mode = 'lock'}>${lock}</p>
					<p class="icon" title="Zoom in (scroll)" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out (scroll)" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'pxn-cuboid-editor':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="New instance" @click=${() => this.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Change instance orientation" @click=${() => this.element.swap()}>${swap}</p>
				`;
			case 'pxn-smart-rectangle':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="ROI increase (+)" @click=${() => this.element.roiUp()}>${increase}</p>
					<p class="icon" title="ROI decrease (-)" @click=${() => this.element.roiDown()}>${decrease}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'pxn-smart-segmentation':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Polygon tool" @click=${() => this.mode = 'create'}>${createPencil}</p>
					<p class="icon" title="Brush tool" @click=${() => this.mode = 'create-brush'}>${paintBrush}</p>
					<p class="icon" title="Smart instance" @click=${() => {
						this.element.editionMode=EditionMode.NEW_INSTANCE;
						this.mode = 'smart-create'}}>${borderOuter}</p>
					<hr>
					<p class="icon" title="Select instance" @click=${() => this.mode = 'edit'}>${magicSelect}</p>
					<hr>
					<p class="icon" title="Remove from instance (Ctrl)" @click=${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}>${subtract}</p>
					<p class="icon" title="Add to instance (Shift)" @click=${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}>${union}</p>
					<p class="icon" title="Lock" @click=${() => this.mode = 'lock'}>${lock}</p>
					<p class="icon" title="Zoom in (scroll)" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out (scroll)" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			default:
				return html``;
		}
	}
	get genericTools() {
		return html`
			<mwc-icon-button title="Select/Edit shape"	icon="navigation"			?selected=${this.mode === 'edit'}	@click="${() => this.mode = 'edit'}"></mwc-icon-button>
			<mwc-icon-button title="Create"				icon="add_circle_outline"	?selected=${this.mode === 'create'}	@click="${() => this.mode = 'create'}"></mwc-icon-button>
			<mwc-icon-button title="Hide/Show labels"	icon="tonality"				@click="${() => this.element.toggleLabels()}"></mwc-icon-button>
		`;
	}

	get tools() {// ...TODO : tools should be included into each element, not here
		switch (this.chosenPlugin) {
			case 'pxn-keypoints':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Swap nodes (c)"		icon="swap_horiz"	@click="${() => this.swap()}"></mwc-icon-button>
				`;
			case 'pxn-rectangle':
				return html`
					${this.genericTools}
				`;
			case 'pxn-polygon':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Group polygons"		icon="call_merge"	@click="${() => this.element.merge()}"></mwc-icon-button>
					<mwc-icon-button title="Split polygon"		icon="call_split"	@click="${() => this.element.split()}"></mwc-icon-button>
					<mwc-icon-button title="Polyline/Polygon"	icon="timeline"
					style="display: ${this.mode === 'create' ?  "block" : "none"}"
					?selected=${this.element && this.element.isOpenedPolygon === true}
					@click="${() => {
							this.element.isOpenedPolygon = !this.element.isOpenedPolygon;
							this.requestUpdate();}}"></mwc-icon-button>
				`;
			case 'pxn-segmentation':
				return html`
					<mwc-icon-button title="Select/Edit instance"		icon="navigation"			?selected=${this.mode === 'edit'}			@click="${() => this.mode = 'edit'}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Polygon)"		icon="add_circle_outline"	?selected=${this.mode === 'create'}			@click="${() => this.mode = 'create'}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Brush)"		icon="brush"				?selected=${this.mode === 'create-brush'}	@click="${() => this.mode = 'create-brush'}"></mwc-icon-button>
					<mwc-icon-button title="Add to instance (Shift)"		?selected=${this.getEditionMode()===EditionMode.ADD_TO_INSTANCE}		@click="${() => this.setEditionMode(EditionMode.ADD_TO_INSTANCE)}">${union}</mwc-icon-button>
					<mwc-icon-button title="Remove from instance (Ctrl)"	?selected=${this.getEditionMode()===EditionMode.REMOVE_FROM_INSTANCE}	@click="${() => this.setEditionMode(EditionMode.REMOVE_FROM_INSTANCE)}">${subtract}</mwc-icon-button>
					<mwc-icon-button title="Lock instances on click"	icon="lock"					?selected=${this.mode === 'lock'} @click="${() => this.mode = 'lock'}"></mwc-icon-button>
					<mwc-icon-button title="Switch opacity"				icon="tonality"				@click="${() => this.element.toggleMask()}"></mwc-icon-button>
					<mwc-icon-button title="Filter isolated"			icon="filter_center_focus"	@click="${() => this.element.filterLittle()}"></mwc-icon-button>
					<mwc-icon-button title="Switch instance/semantic"	icon="face"					?selected=${this.maskVisuMode === 'INSTANCE'}
						@click="${() => this.maskVisuMode = this.maskVisuMode === 'INSTANCE' ? 'SEMANTIC': 'INSTANCE'}"></mwc-icon-button>
				`;
			case 'pxn-cuboid-editor':
				return html`
					${this.genericTools}
					<mwc-icon-button icon="3d_rotation" @click=${() => { this.element.rotate()/*if (this.element.rotate()) this.collect();*/ }}></mwc-icon-button>
					<mwc-icon-button icon="swap_horiz" @click=${() => { this.element.swap()/*if (this.element.swap()) this.collect();*/ } }}></mwc-icon-button>
					<mwc-icon-button @click="${() => this.element.toggleView()}">${camera}</mwc-icon-button>
				`;
			case 'pxn-smart-rectangle':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Smart mode"			icon="flare" @click="${() => this.mode = 'smart-create'}"></mwc-icon-button>
					<mwc-icon-button title="ROI increase (+)"	@click=${() => this.element.roiUp()}>${increase}</mwc-icon-button>
					<mwc-icon-button title="ROI decrease (-)"	@click=${() => this.element.roiDown()}>${decrease}</mwc-icon-button>
				`;
			case 'pxn-smart-segmentation':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Select/Edit instance"		icon="navigation"			?selected=${this.mode === 'edit'}			@click="${() => this.mode = 'edit'}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Polygon)"		icon="add_circle_outline"	?selected=${this.mode === 'create'}			@click="${() => this.mode = 'create'}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Brush)"		icon="brush"				?selected=${this.mode === 'create-brush'}	@click="${() => this.mode = 'create-brush'}"></mwc-icon-button>
					<mwc-icon-button title="Add to instance (Shift)"		?selected=${this.getEditionMode()===EditionMode.ADD_TO_INSTANCE}		@click="${() => this.setEditionMode(EditionMode.ADD_TO_INSTANCE)}">${union}</mwc-icon-button>
					<mwc-icon-button title="Remove from instance (Ctrl)"	?selected=${this.getEditionMode()===EditionMode.REMOVE_FROM_INSTANCE}	@click="${() => this.setEditionMode(EditionMode.REMOVE_FROM_INSTANCE)}">${subtract}</mwc-icon-button>
					<mwc-icon-button title="Lock instances on click"	icon="lock"					?selected=${this.mode === 'lock'} @click="${() => this.mode = 'lock'}"></mwc-icon-button>
					<mwc-icon-button title="Switch opacity"				icon="tonality"				@click="${() => this.element.toggleMask()}"></mwc-icon-button>
					<mwc-icon-button title="Filter isolated"			icon="filter_center_focus"	@click="${() => this.element.filterLittle()}"></mwc-icon-button>
					<mwc-icon-button title="Switch instance/semantic"	icon="face"					?selected=${this.maskVisuMode === 'INSTANCE'}
						@click="${() => this.maskVisuMode = this.maskVisuMode === 'INSTANCE' ? 'SEMANTIC': 'INSTANCE'}"></mwc-icon-button>
					<mwc-icon-button title="Smart create"				icon="add_circle_outline"	?selected=${this.mode === 'smart-create'}	@click="${() => this.mode = 'smart-create'}"></mwc-icon-button>
				`;
			default:
				return html``;
		}
	}
	// ok1) comparer les appels aux démos pour chaque element => adapter les tools en fonction
	// ok2) uniformiser les tools / faire les 2 versions
	// 3) labels
	// 4) add sequences

	// APP:
	// @create=${this.onCreate}
	// @update=${this.onUpdate}
	// @delete=${this.onDelete}
	// @selection=${this.onSelection}
	// @mode=${this.onModeChange}
	/// sauf tracking et smart-tracking :
	// @create-track=${this.onUpdate}
	// @selection-track=${(e) => console.log('selection track', e.detail)}
	// @update-tracks=${this.onUpdate}
	// @delete-track=${this.onUpdate}


	get plugin() {
		console.log("this.chosenPlugin=",this.chosenPlugin);
		this.input = 'examples/image.jpg';// TODO temporary
		switch (this.chosenPlugin) {
			case 'pxn-classification':
				return html`
					<pxn-classification mode=${this.mode} input=${this.input}
								disablefullscreen>
					</pxn-classification>`;
			case 'pxn-keypoints':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-keypoints mode=${this.mode} input=${this.input}
								@create=${this.onCreate}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								enableOutsideDrawing
								disablefullscreen>
					</pxn-keypoints>`;
			case 'pxn-rectangle':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-rectangle mode=${this.mode} input=${this.input}
								@create=${this.onCreate}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								disablefullscreen>
					</pxn-rectangle>`;
			case 'pxn-polygon':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-polygon mode=${this.mode} input=${this.input}
								?isOpenedPolygon="${this.isOpenedPolygon}"
								@create=${this.onCreate}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								disablefullscreen>
					</pxn-polygon>`;
			case 'pxn-segmentation':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-segmentation mode=${this.mode} input=${this.input} maskVisuMode=${this.maskVisuMode}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								disablefullscreen>
					</pxn-segmentation>`;
			case 'pxn-cuboid-editor':
				this.input = 'examples/sample_pcl.bin';
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-cuboid-editor mode=${this.mode} input=${this.input}
								@create=${(e) => { /*e.detail.color = colormap[Math.floor(Math.random() * colormap.length)];*/ }}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => { /*this.target = e.detail*/ }}
								disablefullscreen>
					</pxn-cuboid-editor>`;
			case 'pxn-tracking':
				this.input = 'examples/video/';// TODO : the input should be this path, not an array + TODO : / at the end needed, should not be mandatory
				var images = Array(10).fill(0).map((_, idx) => this.input + `${idx+1}`.padStart(2, '0') + '.png');
				var tracks = {};
				return html`
					<pxn-tracking mode=${this.mode} .input=${images} .tracks=${tracks}
								@create-track=${(e) => console.log('create track', e.detail)}
								@selection-track=${(e) => console.log('selection track', e.detail)}
								@update-tracks=${(e) => console.log('update tracks', e.detail)}
								@delete-track=${(e) => console.log('delete track', e.detail)}
								disablefullscreen>
					</pxn-tracking>`;
			case 'pxn-smart-rectangle':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-smart-rectangle mode=${this.mode} input=${this.input} mode="smart-create" scale="1"
								@create=${this.onCreate}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								disablefullscreen>
					</pxn-smart-rectangle>`;
			case 'pxn-smart-segmentation':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-smart-segmentation mode=${this.mode} input=${this.input} maskVisuMode=${this.maskVisuMode}
								@create=${this.onCreate}
								@update=${(e) => console.log('update', e.detail)}
								@delete=${(e) => console.log('delete', e.detail)}
								@selection=${(e) => console.log('selection', e.detail)}
								disablefullscreen>
					</pxn-smart-segmentation>`;
			case 'pxn-smart-tracking':
				this.input = 'examples/video/';// TODO : the input should be this path, not an array + TODO : / at the end needed, should not be mandatory
				var images = Array(10).fill(0).map((_, idx) => this.input + `${idx+1}`.padStart(2, '0') + '.png');
				var tracks = {};
				return html`
					<pxn-smart-tracking mode=${this.mode} .input=${images} .tracks=${tracks}
								@create-track=${(e) => console.log('create track', e.detail)}
								@selection-track=${(e) => console.log('selection track', e.detail)}
								@update-tracks=${(e) => console.log('update tracks', e.detail)}
								@delete-track=${(e) => console.log('delete track', e.detail)}
								disablefullscreen>
					</pxn-smart-tracking>`;
			case '':
				return html`
					<div class="dashboard">
						<h1 style="margin: auto;">Select a plugin: </h1>
						<mwc-select label='Plugin' @selected=${(e) => { this.chosenPlugin = 'pxn-'+pluginsList[e.detail.index]; console.log("plugin=",pluginsList[e.detail.index]); console.log("=>this.chosenPlugin=",this.chosenPlugin); }}>
							${pluginsList.map((p) => html`<mwc-list-item value=${p} ?selected=${this.chosenPlugin === 'pxn-'+p}>${p}</mwc-list-item>`)}
						</mwc-select>
					</div>`;
			default:
				return html`THIS PLUGIN (${this.chosenPlugin}) IS NOT IMPLEMENTED`;
		}
	}

	render() {
		return html`
			<div class="main ${this.theme}">
				<div class="header">
					<div class="logo">
						<img id="logo-im" src="images/pixano-mono-grad.svg" alt="Pixano"  @click=${() => location.href = "https://pixano.cea.fr/"}>
					</div>
					<div class="header-menu">
						${this.headerContent}
					</div>
				</div>
				<div class="plugin">${this.plugin}</div>
			</div>`;
	}

	fullScreen() {
		if (document.fullscreenEnabled) {
			// this.shadowRoot.querySelector('.main').requestFullscreen();
			this.shadowRoot.querySelector('.plugin').requestFullscreen();
		}
	}

	static get styles() {
		return [demoStyles, css`
		/* MAIN and general definitions */
		:host {
			height: 100%;
			overflow: auto;
			--leftPanelWidth: 55px;
			--headerHeight: 50px;
			--pixano-color: #79005D;
			--primary-color: #79005D;
			--secondary-color: #FF5C64;
			--theme-color: whitesmoke;
			--font-color: black;
			font-size: 15px;
			font-weight: bold;
			color: var(--font-color);
			
		}
		.black {
			--theme-color: rgb(51, 51, 51);
			--font-color: white;
			--primary-color: white;
			--secondary-color: black;
		}
		.main {
			height: 100%;
			position: relative;
			display:flex;
			flex-direction: column;
		}
		.header h1 {
			margin: auto auto auto 0;
			padding-left: 20px;
		}
		.header-menu {
			display: flex;
			flex-direction: row;
			width: calc(100% - var(--leftPanelWidth));
			padding-left: 0;
		}
		.header-menu > mwc-button {
			margin: 0px;
			margin-right: 20px;
			align-items: center;
			display: flex;
		}
		.header-menu > mwc-icon-button {
			margin: 0px;
			margin-right: 20px;
			align-items: center;
			display: flex;
		}
		.dashboard {
			font-size: small;
			--mdc-theme-primary: var(--pixano-color);
			flex: 1;
			background: var(--mdc-theme-primary);
			--mdc-select-hover-line-color: white;
			color: white;
			display: flex;
			flex-direction: row;
		}
		.dashboard > mwc-select {
			display: flex;
			margin-right: 20px;
			align-items: center;
		}
		h1 {
			font-size: 20px;
			margin-left: 20px;
		}
		h2 {
			font-size: 20px;
		}
		h3 {
			font-size: 14px;
		}
		mwc-tab-bar {
			padding-top: 20px;
		}
		mwc-textfield {
			--mdc-theme-primary: #79005D;
			--mdc-theme-secondary: #FF5C64;
		}
		mwc-button {
			--mdc-theme-primary: var(--primary-color);
			--mdc-theme-on-primary: white;
		}
		mwc-linear-progress {
			--mdc-theme-primary: var(--primary-color);
		}


		/* HEADER section */
		.header {/* the header contains external tools not linked to the plugin and his tools */
			display: flex;
			flex-direction: row;
			width: 100%;
			height: var(--headerHeight);
			color: var(--font-color);
			background-color: var(--theme-color);
		}
		.logo {/* Pixano's logo */
			width: var(--leftPanelWidth);
			cursor: pointer;
			display: flex;
			align-items: center;
			background: whitesmoke;
		}
		#logo-im {
			width: 60%;
			margin:auto;
		}

		/* PLUGIN section */
		.plugin {/* view linked to the chosen plugin */
			display: flex;
			flex-direction: row;
			height: calc(100% - var(--headerHeight));
		}
		.tools {/* tools displayed on a vertical bar */
			width: var(--leftPanelWidth);
			background-color: var(--theme-color);
			color: white;
			height: 100%;
			display: flex;
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: start;
			padding-top: 60px;
		}
		`];
	}
}

customElements.define('serverless-demo', ServerlessDemo);

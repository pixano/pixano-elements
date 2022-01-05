/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2021)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { html, LitElement, css} from 'lit-element';
import '@pixano/graphics-2d';
import { demoStyles,
	fullscreen,
	createPencil,
	zoomIn,
	zoomOut } from '@pixano/core/lib/style';

var FileSaver = require('file-saver');
// import { ImageSequenceLoader } from './data-loader';// ...TODO loader
const colors = [
	'blue', 'green', 'purple',
	'yellow', 'pink', 'orange', 'tan'
];

export class ServerlessDemo extends LitElement {

	static get properties() {
		return {
			chosenPlugin: { type: Boolean },
			image: {type: String},
			theme: { type: String }
		};
	}

	constructor() {
		super();
		this.image = 'image.jpg';
		this.theme = 'black';
		this.chosenPlugin = true;//false;
		// this.labels = [];// ...TODO labels
		// this.loader = new ImageSequenceLoader();// ...TODO loader
	}

	onCreate(evt) {
		const newObj = evt.detail;
		newObj.color = colors[Math.floor(Math.random() * colors.length)];
		this.element.mode = 'edit';
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
		return this.shadowRoot.querySelector('pxn-rectangle');
	}

	get headerContent() {
		if (!this.chosenPlugin) return html`
			<h1>Dashboard: choose your annotation plugin</h1>
			<mwc-button theme="primary" class="dark" @click=${() => this.chosenPlugin = true}>START ANNOTATING</mwc-button>
		`;
		else return html`
			<h1>Annotate</h1>
			<mwc-icon-button icon="exit_to_app" @click=${() => this.chosenPlugin = false} title="Back to plugin choice"></mwc-icon-button>
			<mwc-icon-button icon="upload_file" @click="${() => this.shadowRoot.getElementById('up').click()}" title="Upload your images">
				<input id="up" style="display:none;" accept="image/*.jpg|image/*.png" type="file" multiple @change=${this.onUpload}/>
			</mwc-icon-button>
			<mwc-icon-button icon="save" @click="${this.onSave}" title="Save to json file">
		`;
	}

	get tools() {// ...TODO : tools should be included into each element, not here
		// ...TODO : change local icons to mwc-icon-button
		return html`
			<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
			<p class="icon" title="Add rectangle" @click=${() => this.element.mode = 'create'}>${createPencil}</p>
			<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
			<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
		`;
	}

	get plugin() {
		return html`
			<div class="tools">${this.tools}</div>
			<pxn-rectangle	image="${this.image}"
						disablefullscreen
						@create=${this.onCreate}
						@update=${(e) => console.log('update ids', e.detail)}
						@delete=${(e) => console.log('delete', e.detail)}
						@selection=${(e) => console.log('selection', e.detail)}>
			</pxn-rectangle>
		`;
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
			this.shadowRoot.querySelector('.main').requestFullscreen();
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
		.section {
			margin: 20px;
			font-size: small;
			display: flex;
			flex-direction: column;
		}
		h1 {
			font-size: 20px;
			margin-left: 20px;
			font-weight: 300;
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
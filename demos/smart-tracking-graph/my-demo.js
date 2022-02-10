/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/
import {html, LitElement} from 'lit-element';
import '@pixano/graphics-2d';
import { demoStyles } from '@pixano/core/lib/style';

class MyDemo extends LitElement {
	static get styles() {
		return demoStyles;
	}

	constructor() {
		super();
		// const vid = "video/";
		// this.images = Array(10).fill(0).map((_, idx) => vid + `${idx+1}`.padStart(2, '0') + '.png');
		const vid = "video_esc/";
		this.images = Array(200).fill(0).map((_, idx) => vid + `${idx+1}`.padStart(3, '0') + '.jpg');
		this.tracks = {};
	}

	static get properties() {
		return {
			images: {type: Array},
			tracks: {type: Object}
		};
	}

	firstUpdated() {
		this.element.settings.radius = 5;
		this.element.settings.edges = [[0,1],[1,2], [0,2], [1,3], [3,5], [2,4], [4,6], [1,7], [2,8], [7,8], [7,9], [9,11], [8,10], [10,12]];
		this.element.settings.vertexNames = ["Top head","L-shoulder","R-shoulder","L-elbow", "R-elbow", "L-wrist", "R-wrist", 
											 "L-hip", "R-hip", "L-knee", "R-knee", "L-ankle", "R-ankle"];
		// this.element.settings.showVertexName = false;
		this.element.mode = 'create';
		this.element.categories = [
			{name: 'person', color: "#eca0a0", properties: []}
		];
	}


	get element() {
		return this.shadowRoot.getElementById('test');
	}

	render() {	 
		return html`<pxn-smart-tracking-graph id="test"
			.tracks=${this.tracks}
			.input=${this.images}
			@create-track=${(e) => console.log('create track', e.detail)}
			@selection-track=${(e) => console.log('selection track', e.detail)}
			@update-tracks=${(e) => console.log('update tracks', e.detail)}
			@delete-track=${(e) => console.log('delete track', e.detail)}></pxn-smart-tracking-graph>`;
	}
}

customElements.define('my-demo', MyDemo);

/*
TODO:
- Start/end track
- Save track in json file : already done
- Load images : already done
- Multiple tracks/id : already done
- Visibility: visible, occultation(interpolation), invisble (outside of image)
- Visualize corrections done/ user interaction (other color or symbol)
- Possibility to change number frames between auto updates (default: 15)
- Backward correction see in reverse and propagate unitl last correction (and or last auto correction? / and or last validated frame?)
*/

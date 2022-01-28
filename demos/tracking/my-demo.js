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
		const vid = "video/";
		this.images = Array(10).fill(0).map((_, idx) => vid + `${idx+1}`.padStart(2, '0') + '.png');
		this.tracks = {
			 '0': {
				 id: '0',
				 shapes: {
					 '0': {
						 geometry: {
							 type: 'rectangle',
							 vertices: [
								 0.2887383355034722,
								 0.4225015710901331,
								 0.34930555555555554,
								 0.6296296296296297
							 ]
						 },
						 timestamp: 0,
						 
						 id: '0',
						 createdBy: 'manual',
					 },
					 '1': {
						 geometry: {
							 type: 'rectangle',
							 vertices: [
								 0.29791666666666666,
								 0.4527777777777778,
								 0.3576388888888889,
								 0.6296296296296297
							 ]
						 },
						 timestamp: 1,
						 
						 id: '0',
						 createdBy: 'manual',
					 }
				 },
				 category: 'person',
				 labels: {}
			 }
		};
	}

	static get properties() {
		return {
			images: {type: Array},
			tracks: {type: Object}
		};
	}

	firstUpdated() {
	this.element.mode = 'create';
		this.element.categories = [
			{ name: 'car', color: "green", properties: [] },
			{ name: 'truck', color: "#eca0a0", properties: [
				{name: 'posture', type: 'dropdown', enum: ['toto', 'bending', 'sitting', 'lying'],persistent: false, default: 'toto'},
				{name: 'difficult', type: 'checkbox',persistent: false, default: false}
			]}
		];
	}


	get element() {
		return this.shadowRoot.getElementById('test');
	}

	render() {	 
		return html`<pxn-tracking id="test"
			.tracks=${this.tracks}
			.input=${this.images}
			@create-track=${(e) => console.log('create track', e.detail)}
			@selection-track=${(e) => console.log('selection track', e.detail)}
			@update-tracks=${(e) => console.log('update tracks', e.detail)}
			@delete-track=${(e) => console.log('delete track', e.detail)}></pxn-tracking>`;
	}
}

customElements.define('my-demo', MyDemo);

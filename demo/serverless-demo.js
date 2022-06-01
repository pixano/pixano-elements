/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2021)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/
// TODO: use redux to store history of attributes ? Usefull for ctrl-z.


import { html, LitElement, css} from 'lit-element';
import '@pixano/graphics-2d';
import '@pixano/graphics-3d';
import { commonJson, colorToRGBA } from '@pixano/core/lib/utils';
import '@pixano/core/lib/attribute-picker';
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
	zoomOut } from '@pixano/core/lib/style';// TODO: change local icons to mwc-icon-button
import { pluginsList, defaultLabelValues } from './plugins_index';
import 'fleshy-jsoneditor/fleshy-jsoneditor.js';
var FileSaver = require('file-saver');

// temporary, should be style.ts
export const camera = html`<svg slot="icon" width="24" height="24" viewBox="0 0 24 24"><g><path d="M 8.46875 3.816406 C 7.988281 3.988281 7.871094 4.128906 7.199219 5.34375 C 6.351562 6.871094 6.652344 6.71875 4.359375 6.75 C 2.179688 6.777344 2.003906 6.832031 1.632812 7.585938 L 1.523438 7.804688 L 1.523438 19.195312 L 1.636719 19.425781 C 1.777344 19.710938 2.042969 19.976562 2.335938 20.117188 L 2.554688 20.226562 L 21.445312 20.226562 L 21.664062 20.117188 C 21.945312 19.980469 22.230469 19.695312 22.367188 19.414062 L 22.476562 19.195312 L 22.476562 7.804688 L 22.367188 7.585938 C 21.996094 6.828125 21.828125 6.777344 19.640625 6.75 C 17.417969 6.722656 17.601562 6.785156 17.074219 5.835938 C 15.800781 3.523438 16.351562 3.75 11.988281 3.753906 C 9.300781 3.753906 8.613281 3.765625 8.46875 3.816406 M 13.148438 7.636719 C 14.902344 8.027344 16.933594 9.773438 16.6875 10.683594 C 16.496094 11.402344 15.738281 11.390625 15.226562 10.65625 C 13.804688 8.636719 10.949219 8.402344 9.308594 10.175781 C 8.988281 10.523438 8.972656 10.503906 9.703125 10.640625 C 10.46875 10.78125 10.652344 10.917969 10.492188 11.21875 C 10.414062 11.371094 7.699219 13.261719 7.5625 13.265625 C 7.375 13.265625 7.234375 13.066406 6.539062 11.789062 C 6.15625 11.09375 5.828125 10.5 5.804688 10.46875 C 5.71875 10.363281 5.78125 10.117188 5.917969 10.015625 L 6.050781 9.917969 L 6.769531 10.058594 L 7.488281 10.203125 L 7.734375 9.828125 C 8.871094 8.109375 11.140625 7.191406 13.148438 7.636719 M 16.628906 12.316406 C 16.703125 12.390625 18.050781 14.796875 18.1875 15.097656 C 18.257812 15.253906 18.144531 15.5 17.984375 15.542969 C 17.925781 15.554688 17.558594 15.507812 17.171875 15.433594 L 16.472656 15.300781 L 16.261719 15.625 C 14.523438 18.347656 10.625 18.761719 8.253906 16.476562 C 7.21875 15.480469 7 14.742188 7.628906 14.378906 C 8 14.160156 8.375 14.296875 8.6875 14.765625 C 10.105469 16.878906 13.296875 17.113281 14.78125 15.210938 C 14.953125 14.988281 14.945312 14.984375 14.25 14.855469 C 13.125 14.648438 13.132812 14.441406 14.296875 13.636719 C 14.644531 13.398438 15.242188 12.984375 15.625 12.71875 C 16.34375 12.222656 16.480469 12.167969 16.628906 12.316406 "/></g></svg>`

const EditionMode = {//temporary: in graphics-2d/src/controller-mask or graphics-2d/src/pxn-segmentation
	ADD_TO_INSTANCE: 'add_to_instance',
	REMOVE_FROM_INSTANCE: 'remove_from_instance',
	NEW_INSTANCE: 'new_instance'
};

export class ServerlessDemo extends LitElement {

	static get properties() {
		return {
			// generic properties
			chosenPlugin: { type: String },
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
		this.defaultMode = 'edit';
		this.chosenPlugin = '';//empty = no plugin chosen
		this.annotations = [];
		this.selectedIds = [];// don't asign directly : always use this.setSelectedIds(...)
		// specific properties
		this.isOpenedPolygon = true;//for pxn-polygon
		this.maskVisuMode = 'SEMANTIC';//for pxn-segmentation
		this.tracks = {};//for pxn-tracking
		this.sequence_annotations = [];


		// @property({ type: Object })
		// public tracks: { [key: string]: TrackData } = {};
		// en fait track = [TrackData]

		// track.keyShapes[numframe] = shape;
	}

	/**
	 * Initialize / reinitialize annotations
	 * @param {Object} newAnnotation
	 */
	initAnnotations() {
		this.setAnnotations([]);
		this.setSelectedIds([]);
		this.tracks = {};//for pxn-tracking
	}
	/**
	 * Set annotations: previous annotations will be overwritten
	 * @param {Object} newAnnotations
	 */
	setAnnotations(newAnnotations) {
		// console.log("prev nnotation=",this.annotations);
		// console.log("newAnnotation=",newAnnotations);
		this.annotations = newAnnotations;
	}

	setSelectedIds(newIds) {
		if (!newIds) newIds=[];
		this.selectedIds = newIds;
		if (this.attributePicker) this.attributePicker.showDetail = this.selectedIds.length;
	}

	/******************* BUTTONS handlers *******************/

	/**
	 * Called when using the Save button
	 */
	onSave() {
		const json_string = this.element.isSequence ? JSON.stringify(this.sequence_annotations, null, 1) : JSON.stringify(this.annotations, null, 1);
		const blob = new Blob([json_string],{type: "text/plain;charset=utf-8"})
		FileSaver.saveAs(blob, "my_json.json")
	}

	/**
	 * Called when using the Save button
	 * @param {CustomEvent} evt 
	 */
	onUpload(evt) {
		try {
			// get input data
			var fileList = [];
			Object.entries(evt.target.files).map(([ts, f], idx) => {
				fileList.push(URL.createObjectURL(f));
			});
			// const mediaInfo = Object.entries(evt.target.files).map(([ts, f], idx) => {
			// 	const src = URL.createObjectURL(f);
			// 	return {timestamp: idx, url:[src]}
			// });
			// load new data
			if (!fileList.length) throw new Error("No files found");
			if (fileList.length==1) this.element.input = fileList[0];
			else this.element.input = fileList;
		} catch(err) {
			console.error(err);
		}
	}

	/******************* EVENTS handlers *******************/

	/**
	 * Called after each loaded data: i.e. when a new plugin has been loaded or when the input has changed (via an upload).
	 * For a sequence: will be called after each atomic data (i.e. image for a video, etc) is loaded.
	 */
	onLoadedInput() {
		console.log("onLoadedInput");
		// Initialize annotations
		if (!this.element.isSequence) {
			this.initAnnotations();
		} else {//each time we go from one image to another or at sequence initialization
			this.setSelectedIds([]);
			if (!this.sequence_annotations.length) {//first time on this video => initialize annotations
				for (var i=0; i<this.element.maxFrameIdx + 1 ; i++) {
					this.sequence_annotations.push({ "timestamp" : i, "annotations" : [] });// TODO : timestamps should be set from the loader (see core/src/generic-display.ts)
				}
			} else {
				// 1) get previous frame annotations into sequence annotations
				this.sequence_annotations[this.element.lastFrameIdx].annotations = this.annotations;
				// 2) set new frame annotations to the corresponding annotations in sequence annotations
				this.setAnnotations(this.sequence_annotations[this.element.frameIdx].annotations);
				// 3) set shapes to annotations // TODO : when standard annotations will be used by all pxns, this will disapear
				switch (this.chosenPlugin) {
					case 'classification':
						/* nothing to do */
						break;
					case 'keypoints':
					case 'rectangle':
					case 'smart-rectangle':
					case 'polygon':
					case 'cuboid-editor':
						this.element.shapes = this.annotations;
						this.element.shapes.forEach( shape => shape.color = this.attributePicker._colorFor(shape.category));
						break;
					case 'segmentation':
					case 'smart-segmentation':
						const maskAnnot = this.annotations.find((a) => a.id===0);
						if (maskAnnot) this.element.setMask(maskAnnot.mask);
						else this.element.setEmpty()
					case 'tracking':
					case 'tracking-graph':
					case 'smart-tracking':
						/* nothing to do: create=update */
						break;
					default:
						console.error(`onLoadedInput: plugin ${this.chosenPlugin} unknown`);
				}
				// this.selectedIds = evt.detail;// TODO : vérif pour garder la même track ?
				// console.log("this.selectedIds=",this.selectedIds);
			}
		}
		if (this.chosenPlugin==='classification') this.setSelectedIds(["not used"]);// only for classification: behave as if something is always selected
		// Initialize attributePicker
		if ((!this.element.isSequence) || (!this.sequence_annotations.length)) {// do not reinitialize schema nor reset to default inside a sequence
			if (this.chosenPlugin==='smart-tracking' || this.chosenPlugin==='tracking' || this.chosenPlugin==='tracking-graph') return;// exception: no attribute picker used for tracking
			// load default schema (and set attributes to default)
			this.attributePicker.reloadSchema(defaultLabelValues(this.chosenPlugin));
			// exceptions
			if (this.chosenPlugin==='segmentation' || this.chosenPlugin==='smart-segmentation') {
				const schema = defaultLabelValues(this.chosenPlugin);
				this.element.clsMap = new Map(
					schema.category.map((c) => {
						const color = colorToRGBA(c.color);
						return [c.idx, [color[0], color[1], color[2], c.instance ? 1 : 0]]
					})
				);
				if (!schema.default) schema.default = schema.category[0].name;
				this.element.targetClass = schema.category.find((c) => c.name === schema.default).idx;
			}
		}
	}

	onCreate(evt) {
		const newObject = evt.detail;
		console.log("onCreate", evt.detail.id);
		let shapes;
		switch (this.chosenPlugin) {
			case 'classification':
				/* nothing to do */
				break;
			case 'keypoints':
			case 'rectangle':
			case 'polygon':
			case 'cuboid-editor':
				newObject.id = Math.random().toString(36);// TODO: temporary: id not set in all plugins
				// add attributes to object without deep copy
				Object.entries(this.attributePicker.value).forEach(([key, value]) => {
					newObject[key] = JSON.parse(JSON.stringify(value));
				});
				newObject.color = this.attributePicker._colorFor(newObject.category);
				// add timestamp to object
				if (this.element.isSequence) newObject.timestamp = this.targetFrameIdx;
				// set new shapes
				if (this.chosenPlugin==='cuboid-editor') shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
				else shapes = [...this.element.shapes].map(({color, ...s}) => s);
				this.setAnnotations(shapes);
				break;
			case 'smart-rectangle':
				newObject.id = Math.random().toString(36);// TODO: temporary: id not set in all plugins
				// add attributes to object without deep copy
				Object.entries(this.attributePicker.value).forEach(([key, value]) => {
					// do not overwrite category if it was automatically found
					if (key != 'category' || !newObject.category) {
						newObject[key] = JSON.parse(JSON.stringify(value));
					}
				});
				newObject.color = this.attributePicker._colorFor(newObject.category);
				// add timestamp to object
				if (this.element.isSequence) newObject.timestamp = this.frameIdx;
				// set new shapes
				if (this.chosenPlugin==='cuboid-editor') shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
				else shapes = [...this.element.shapes].map(({color, ...s}) => s);
				this.setAnnotations(shapes);
				break;
			case 'segmentation':
			case 'smart-segmentation':
			case 'tracking':
			case 'tracking-graph':
			case 'smart-tracking':
				/* nothing to do: create=update */
				break;
			default:
				console.error("onCreate: plugin ${this.chosenPlugin} unknown");
		}
	}
	
	onDelete(evt) {
		console.log("onDelete");
		this.setSelectedIds([]);
		let shapes;
		switch (this.chosenPlugin) {
			case 'classification':
				/* nothing to do */
				break;
			case 'keypoints':
			case 'rectangle':
			case 'smart-rectangle':
			case 'polygon':
			case 'cuboid-editor':
				if (this.chosenPlugin==='cuboid-editor') shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
				else shapes = [...this.element.shapes].map(({color, ...s}) => s);
				this.setAnnotations(shapes);
				break;
			case 'segmentation':
			case 'smart-segmentation':
				const ids = evt.detail;
				let frame = this.annotations;
				// 1) update the mask (always id 0)
				// get the new mask and store it
				let mask = frame.find((l) => l.id === 0);
				mask.mask = this.element.getMask();//just overwrite the previous mask
				// 2) update annotation info (= delete corresponding id)
				frame = frame.filter((l) => l.id !== JSON.stringify(ids))
				// 3) store the new annotation structure
				this.setAnnotations(frame);
				break;
			case 'tracking':
			case 'tracking-graph':
			case 'smart-tracking':
				/* nothing to do: delete=update */
				break;
			default:
				console.error("onDelete: plugin ${this.chosenPlugin} unknown");
		}
	}

	/**
	 * Invoked on instance selection in the canvas.
	 * @param {CustomEvent} evt 
	 */
	onSelection(evt) {
		console.log("onSelection");
		switch (this.chosenPlugin) {
			case 'classification':
				/* nothing to do */
				break;
			case 'keypoints':
			case 'rectangle':
			case 'smart-rectangle':
			case 'polygon':
				this.setSelectedIds(evt.detail);
				if (this.selectedIds && this.selectedIds.length) {
					const shapes = this.annotations.filter((s) => this.selectedIds.includes(s.id));
					const common = commonJson(shapes);
					this.attributePicker.setAttributes(common);
				}
				break;
			case 'segmentation':
			case 'smart-segmentation':
				this.setSelectedIds(evt.detail);
				if (this.selectedIds) {//only one id at a time for segmentation
					const annot = this.annotations.filter((a) => JSON.stringify(this.selectedIds)===(a.id));// search the corresponding id 
					const common = commonJson(annot);
					this.attributePicker.setAttributes(common);
				} else {
					// if null, nothing is selected
					this.setSelectedIds([]);
				}
				break;
			case 'cuboid-editor':
				this.setSelectedIds(evt.detail.map((p) => p.id));
				if (this.selectedIds && this.selectedIds.length) {
					const shapes = this.annotations.filter((s) => this.selectedIds.includes(s.id));
					const common = commonJson(shapes);
					this.attributePicker.setAttributes(common);
				}
				break;
			case 'tracking':
			case 'tracking-graph':
			case 'smart-tracking':
				/* nothing to do */
				break;
			default:
				console.error(`onSelection: plugin ${this.chosenPlugin} unknown`);
		}
	}
	/**
	 * Invoked when a new instance is updated (created = updated for segmentation)
	 * @param {CustomEvent} evt 
	 */
	onUpdate(evt) {
		console.log("onUpdate");
		let shapes;
		switch (this.chosenPlugin) {
			case 'classification':
			case 'keypoints':
			case 'rectangle':
			case 'smart-rectangle':
			case 'polygon':
			case 'cuboid-editor':
				if (this.chosenPlugin==='cuboid-editor') shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
				else shapes = [...this.element.shapes].map(({color, ...s}) => s);
				this.setAnnotations(shapes);
				break;
			case 'segmentation':
			case 'smart-segmentation':
				const updatedIds = evt.detail;
				let frame = this.annotations;
				// 1) update the mask (always id 0)
				let mask = frame.find((l) => l.id === 0);
				if (!mask) {
					mask = {id: 0, mask: this.element.getMask()};//if the mask already exists => just overwrite the previous mask
					frame.push(mask);//otherwise(first time), create it
				} else {
					mask.mask = this.element.getMask();
				}
				// 2) update annotation info when needed
				let label = frame.find((l) => l.id === JSON.stringify(updatedIds));// search the corresponding id
				if (label) {//id exists in the database, update information
					// nothing to do for annotation infos, only the mask has changed
				} else {// this is a new id
					// create the new label
					label = {...this.attributePicker.value};
					// store the stringified values
					const value = this.attributePicker.value;
					Object.keys(label).forEach((key) => {
						label[key] = JSON.parse(JSON.stringify(value[key]));
					});
					label.id = JSON.stringify(updatedIds);
					frame.push(label)
				}
				// 3) store the new annotation structure
				this.setAnnotations(frame);
				// selectedId has also changed, update it
				this.setSelectedIds(updatedIds);
				break;
			case 'tracking':
			case 'tracking-graph':
			case 'smart-tracking':
				// console.log("evt=",evt);
				// console.log("this.tracks=",this.tracks);
				// this.tracks = evt.detail;
				// console.log("this.tracks2=",this.tracks);
				this.setAnnotations(this.tracks);
				break;
			default:
				console.error("onUpdate: plugin ${this.chosenPlugin} unknown");
		}
	}

	/**
	 * Invoked on attribute change from property panel.
	 */
	onAttributeChanged() {
		console.log("onAttributeChanged");
		let shapes;
		const value =  this.attributePicker.value;
		switch (this.chosenPlugin) {
			case 'classification':
				console.log("clasif setannot attchange");
				this.setAnnotations([value]);
				break;
			case 'keypoints':
			case 'rectangle':
			case 'smart-rectangle':
			case 'polygon':
				this.selectedIds.forEach((id) => {
					// get selected shape
					const shape = [...this.element.shapes].find((s) => s.id === id);
					// apply new properties
					shape.options = shape.options || {};
					Object.keys(value).forEach((key) => {
						shape[key] = JSON.parse(JSON.stringify(value[key]));
					});
					shape.color = this.attributePicker._colorFor(shape.category);
					// concatenate and set
					if (this.chosenPlugin==='cuboid-editor') shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
					else shapes = [...this.element.shapes].map(({color, ...s}) => s);
					this.setAnnotations(shapes);
				});
				break;
			case 'segmentation':
			case 'smart-segmentation':
				if (!this.selectedIds.length) {//nothing is selected
					// only set the category acordingly to the selected attribute
					const category =  this.attributePicker.selectedCategory;
					this.element.targetClass = category.idx;
					break;
				}
				let frame = this.annotations;
				// 1) update the mask (always id 0)
				// change category in element
				const category =  this.attributePicker.selectedCategory;
				this.element.targetClass = category.idx;
				this.element.fillSelectionWithClass(category.idx);
				// get the new mask and store it
				let mask = frame.find((l) => l.id === 0);
				mask.mask = this.element.getMask();//just overwrite the previous mask
				// 2) update annotation info from attributes
				let label = frame.find((l) => l.id === JSON.stringify(this.selectedIds));// search the corresponding id
				Object.keys(value).forEach((key) => {
					label[key] = JSON.parse(JSON.stringify(value[key]));
				});
				// category has changed => selectedId has also changed, update it
				const updatedIds = this.element.selectedId;
				label.id = JSON.stringify(updatedIds);
				this.setSelectedIds(updatedIds);
				// 3) store the new annotation structure
				this.setAnnotations(frame);
				break;
			case 'cuboid-editor':
				this.selectedIds.forEach((id) => {
					const shape = [...this.element.editableCuboids].find((s) => s.id === id);
					shape.options = shape.options || {};
					Object.keys(value).forEach((key) => {
						shape[key] = JSON.parse(JSON.stringify(value[key]));
					});
					shape.color = this.attributePicker._colorFor(shape.category);
					const shapes = [...this.element.editableCuboids].map(({color, ...s}) => s);
					this.setAnnotations(shapes);
				});
				break;
			case 'tracking':
			case 'tracking-graph':
			case 'smart-tracking':
				this.setAnnotations(this.tracks)
				break;
			default:
				console.error("onAttributeChanged: plugin ${this.chosenPlugin} unknown");
		}
	}

	/**
	 * Implement property panel content
	 */
	swapAttributeEditor() {
		if (this.attributeEditor.style.display==="none") {
			this.attributeEditor.style.display="block";
			this.attributePicker.style.display="none";
			this.attributeEditor.json = this.attributePicker.schema;
		} else {
			this.attributeEditor.style.display="none";
			this.attributePicker.style.display="block";
			this.attributePicker.reloadSchema(this.attributeEditor.json);
		}
	}

	/******************* selector getters *******************/
	get element() {
		return this.shadowRoot.querySelector("pxn-"+this.chosenPlugin);
	}
	get attributePicker() {
		return this.shadowRoot.querySelector('attribute-picker');
	}
	get attributeEditor() {
		return this.shadowRoot.querySelector('fleshy-jsoneditor');
	}

	get mode() {
		if (this.element) return this.element.mode;
		else return this.defaultMode;
	}

	/******************* TOOLS to be displayed *******************/

	get tools_old() {// TODO: tools should be included into each element, not here
		switch (this.chosenPlugin) {
			case 'keypoints':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Edit" @click=${() => this.element.setMode(this.element.mode,'edit')}>${pointer}</p>
					<p class="icon" title="Add keypoints" @click=${() => this.element.setMode(this.element.mode,'create')}>${createPencil}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'rectangle':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Add rectangle" @click=${() => this.element.setMode(this.element.mode,'create')}>${createPencil}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'polygon':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Add polygon" @click=${() => {this.isOpenedPolygon=false; this.element.setMode(this.element.mode,'create')}}>${createPencil}</p>
					<p class="icon" title="Add line" @click=${() => {this.isOpenedPolygon=true; this.element.setMode(this.element.mode,'create')}}>${polyline}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'segmentation':
				return html`
					<p class="icon" title="Polygon tool" @click=${() => this.element.setMode(this.element.mode,'create')}>${createPencil}</p>
					<p class="icon" title="Brush tool" @click=${() => this.element.setMode(this.element.mode,'create-brush')}>${paintBrush}</p>
					<hr>
					<p class="icon" title="Select instance" @click=${() => this.element.setMode(this.element.mode,'edit')}>${magicSelect}</p>
					<hr>
					<p class="icon" title="Remove from instance (Ctrl)" @click=${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}>${subtract}</p>
					<p class="icon" title="Add to instance (Shift)" @click=${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}>${union}</p>
					<p class="icon" title="Lock" @click=${() => this.element.setMode(this.element.mode,'lock')}>${lock}</p>
					<p class="icon" title="Zoom in (scroll)" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out (scroll)" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'cuboid-editor':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="New instance" @click=${() => this.element.setMode(this.element.mode,'create')}>${createPencil}</p>
					<p class="icon" title="Change instance orientation" @click=${() => this.element.swap()}>${swap}</p>
				`;
			case 'smart-rectangle':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="ROI increase (+)" @click=${() => this.element.roiUp()}>${increase}</p>
					<p class="icon" title="ROI decrease (-)" @click=${() => this.element.roiDown()}>${decrease}</p>
					<p class="icon" title="Zoom in" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			case 'smart-segmentation':
				return html`
					<p class="icon" title="Fullscreen" @click=${this.fullScreen}>${fullscreen}</p>
					<p class="icon" title="Polygon tool" @click=${() => this.element.setMode(this.element.mode,'create')}>${createPencil}</p>
					<p class="icon" title="Brush tool" @click=${() => this.element.setMode(this.element.mode,'create-brush')}>${paintBrush}</p>
					<p class="icon" title="Smart instance" @click=${() => {
						this.element.editionMode=EditionMode.NEW_INSTANCE;
						this.element.setMode(this.element.mode,'smart-create')}}>${borderOuter}</p>
					<hr>
					<p class="icon" title="Select instance" @click=${() => this.element.setMode(this.element.mode,'edit')}>${magicSelect}</p>
					<hr>
					<p class="icon" title="Remove from instance (Ctrl)" @click=${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}>${subtract}</p>
					<p class="icon" title="Add to instance (Shift)" @click=${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}>${union}</p>
					<p class="icon" title="Lock" @click=${() => this.element.setMode(this.element.mode,'lock')}>${lock}</p>
					<p class="icon" title="Zoom in (scroll)" @click=${() => this.element.viewControls.zoomIn()}>${zoomIn}</p>
					<p class="icon" title="Zoom out (scroll)" @click=${() => this.element.viewControls.zoomOut()}>${zoomOut}</p>
				`;
			default:
				return html``;
		}
	}
	get genericTools() {
		return html`
			<mwc-icon-button title="Select/Edit shape"	icon="navigation"			?selected=${this.mode === 'edit'}	@click="${() => this.element.setMode(this.element.mode,'edit')}"></mwc-icon-button>
			<mwc-icon-button title="Create"				icon="add_circle_outline"	?selected=${this.mode === 'create'}	@click="${() => this.element.setMode(this.element.mode,'create')}"></mwc-icon-button>
			<mwc-icon-button title="Hide/Show labels"	icon="tonality"				@click="${() => this.element.toggleLabels()}"></mwc-icon-button>
		`;
	}

	getEditionMode() { if (this.element) return this.element.editionMode; else return EditionMode.NEW_INSTANCE; }//needed for selected because buttons are created before element

	get tools() {// TODO: tools should be included into each element, not here
		switch (this.chosenPlugin) {
			case 'keypoints':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Swap nodes (c)"		icon="swap_horiz"	@click="${() => this.swap()}"></mwc-icon-button>
				`;
			case 'rectangle':
				return html`
					${this.genericTools}
				`;
			case 'polygon':
				console.log("tools");
				return html`
					${this.genericTools}
					<mwc-icon-button title="Group polygons"		icon="call_merge"	@click="${() => this.element.merge()}"></mwc-icon-button>
					<mwc-icon-button title="Split polygon"		icon="call_split"	@click="${() => this.element.split()}"></mwc-icon-button>
					<mwc-icon-button title="Polyline/Polygon"	icon="timeline"
						?selected=${this.element && this.element.isOpenedPolygon === true}
						@click="${() => {
								this.element.isOpenedPolygon = !this.element.isOpenedPolygon;
								this.requestUpdate();}}"></mwc-icon-button>
				`;
			case 'segmentation':
				return html`
					<mwc-icon-button title="Select/Edit instance"		icon="navigation"			?selected=${this.mode === 'edit'}			@click="${() => this.element.setMode(this.element.mode,'edit')}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Polygon)"		icon="add_circle_outline"	?selected=${this.mode === 'create'}			@click="${() => this.element.setMode(this.element.mode,'create')}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Brush)"		icon="brush"				?selected=${this.mode === 'create-brush'}	@click="${() => this.element.setMode(this.element.mode,'create-brush')}"></mwc-icon-button>
					<mwc-icon-button title="Add to instance (Shift)"		?selected=${this.getEditionMode()===EditionMode.ADD_TO_INSTANCE}			@click="${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}">${union}</mwc-icon-button>
					<mwc-icon-button title="Remove from instance (Ctrl)"	?selected=${this.getEditionMode()===EditionMode.REMOVE_FROM_INSTANCE}	@click="${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}">${subtract}</mwc-icon-button>
					<mwc-icon-button title="Lock instances on click"	icon="lock"					?selected=${this.mode === 'lock'} @click="${() => this.element.setMode(this.element.mode,'lock')}"></mwc-icon-button>
					<mwc-icon-button title="Switch opacity"				icon="tonality"				@click="${() => this.element.toggleMask()}"></mwc-icon-button>
					<mwc-icon-button title="Filter isolated"			icon="filter_center_focus"	@click="${() => this.element.filterLittle()}"></mwc-icon-button>
					<mwc-icon-button title="Switch instance/semantic"	icon="face"					?selected=${this.maskVisuMode === 'INSTANCE'}
						@click="${() => this.maskVisuMode = this.maskVisuMode === 'INSTANCE' ? 'SEMANTIC': 'INSTANCE'}"></mwc-icon-button>
				`;
			case 'cuboid-editor':
				return html`
					${this.genericTools}
					<mwc-icon-button icon="3d_rotation" @click=${() => { this.element.rotate()/*if (this.element.rotate()) this.collect();*/ }}></mwc-icon-button>
					<mwc-icon-button icon="swap_horiz" @click=${() => { this.element.swap()/*if (this.element.swap()) this.collect();*/ } }}></mwc-icon-button>
					<mwc-icon-button @click="${() => this.element.toggleView()}">${camera}</mwc-icon-button>
				`;
			case 'smart-rectangle':
				return html`
					${this.genericTools}
					<mwc-icon-button title="Smart mode"			icon="flare" @click="${() => this.element.setMode(this.element.mode,'smart-create')}"></mwc-icon-button>
					<mwc-icon-button title="ROI increase (+)"	@click=${() => this.element.roiUp()}>${increase}</mwc-icon-button>
					<mwc-icon-button title="ROI decrease (-)"	@click=${() => this.element.roiDown()}>${decrease}</mwc-icon-button>
				`;
			case 'smart-segmentation':
				return html`
					<mwc-icon-button title="Select/Edit instance"		icon="navigation"			?selected=${this.mode === 'edit'}			@click="${() => this.element.setMode(this.element.mode,'edit')}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Polygon)"		icon="add_circle_outline"	?selected=${this.mode === 'create'}			@click="${() => this.element.setMode(this.element.mode,'create')}"></mwc-icon-button>
					<mwc-icon-button title="Add instance (Brush)"		icon="brush"				?selected=${this.mode === 'create-brush'}	@click="${() => this.element.setMode(this.element.mode,'create-brush')}"></mwc-icon-button>
					<mwc-icon-button title="Add to instance (Shift)"		?selected=${this.getEditionMode()===EditionMode.ADD_TO_INSTANCE}			@click="${() => this.element.editionMode=EditionMode.ADD_TO_INSTANCE}">${union}</mwc-icon-button>
					<mwc-icon-button title="Remove from instance (Ctrl)"	?selected=${this.getEditionMode()===EditionMode.REMOVE_FROM_INSTANCE}	@click="${() => this.element.editionMode=EditionMode.REMOVE_FROM_INSTANCE}">${subtract}</mwc-icon-button>
					<mwc-icon-button title="Lock instances on click"	icon="lock"					?selected=${this.mode === 'lock'} @click="${() => this.element.setMode(this.element.mode,'lock')}"></mwc-icon-button>
					<mwc-icon-button title="Switch opacity"				icon="tonality"				@click="${() => this.element.toggleMask()}"></mwc-icon-button>
					<mwc-icon-button title="Filter isolated"			icon="filter_center_focus"	@click="${() => this.element.filterLittle()}"></mwc-icon-button>
					<mwc-icon-button title="Switch instance/semantic"	icon="face"					?selected=${this.maskVisuMode === 'INSTANCE'}
						@click="${() => this.maskVisuMode = this.maskVisuMode === 'INSTANCE' ? 'SEMANTIC': 'INSTANCE'}"></mwc-icon-button>
					<mwc-icon-button title="Smart create"				icon="add_circle_outline"	?selected=${this.mode === 'smart-create'}	@click="${() => this.element.setMode(this.element.mode,'smart-create')}"></mwc-icon-button>
				`;
			default:
				return html``;
		}
	}

	/******************* RENDERING: main and panels to be displayed, especially plugin dependent panel  *******************/

	/**
	 * Implement property panel content
	 */
	get propertyPanel() {
		console.log("propertyPanel");
		return html`
			<fleshy-jsoneditor style="display: none" mode="code"></fleshy-jsoneditor>
			<attribute-picker @update=${this.onAttributeChanged}></attribute-picker>`;
	}

	get plugin() {
		this.input = 'examples/image.jpg';// TODO: temporary
		switch (this.chosenPlugin) {
			case 'classification':
				return html`
					<pxn-classification .input=${this.input} @load=${this.onLoadedInput} @update=${this.onUpdate}
								disablefullscreen>
					</pxn-classification>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'keypoints':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-keypoints .input=${this.input} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection} @create=${this.onCreate}
								@delete=${this.onDelete}
								enableOutsideDrawing
								disablefullscreen>
					</pxn-keypoints>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'rectangle':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-rectangle .input=${this.input} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection} @create=${this.onCreate}
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-rectangle>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'polygon':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-polygon .input=${this.input} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection} @create=${this.onCreate}
								?isOpenedPolygon="${this.isOpenedPolygon}"
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-polygon>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'segmentation':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-segmentation .input=${this.input} maskVisuMode=${this.maskVisuMode} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection}
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-segmentation>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'cuboid-editor':
				this.input = 'examples/sample_pcl.bin';
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-cuboid-editor .input=${this.input} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection} @create=${this.onCreate}
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-cuboid-editor>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'tracking':
				this.input = 'examples/video/';// TODO: the input should be this path, not an array + TODO: / at the end needed, should not be mandatory
				var images = Array(10).fill(0).map((_, idx) => this.input + `${idx+1}`.padStart(2, '0') + '.png');
				return html`
					<pxn-tracking .input=${images} .tracks=${this.tracks} @load=${this.onLoadedInput} @selection-track=${this.onSelection} @update-tracks=${this.onUpdate} @delete-track=${this.onUpdate}
								disablefullscreen>
					</pxn-tracking>`;
			case 'tracking-graph':
				this.input = 'examples/video/';// TODO: the input should be this path, not an array + TODO: / at the end needed, should not be mandatory
				var images = Array(10).fill(0).map((_, idx) => this.input + `${idx+1}`.padStart(2, '0') + '.png');
				return html`
					<pxn-tracking-graph .input=${images} .tracks=${this.tracks} @load=${this.onLoadedInput} @selection-track=${this.onSelection} @update-tracks=${this.onUpdate} @delete-track=${this.onUpdate}
								disablefullscreen>
					</pxn-tracking-graph>`;
			case 'smart-rectangle':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-smart-rectangle .input=${this.input} mode="smart-create" scale="1" @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection} @create=${this.onCreate}
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-smart-rectangle>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'smart-segmentation':
				return html`
					<div class="tools">${this.tools}</div>
					<pxn-smart-segmentation .input=${this.input} maskVisuMode=${this.maskVisuMode} @load=${this.onLoadedInput} @update=${this.onUpdate} @selection=${this.onSelection}
								@delete=${this.onDelete}
								disablefullscreen>
					</pxn-smart-segmentation>
					<div class="properties-panel">${this.propertyPanel}</div>`;
			case 'smart-tracking':
				this.input = 'examples/video/';// TODO: the input should be this path, not an array + TODO: / at the end needed, should not be mandatory
				var images = Array(10).fill(0).map((_, idx) => this.input + `${idx+1}`.padStart(2, '0') + '.png');
				return html`
					<pxn-smart-tracking .input=${images} .tracks=${this.tracks} @load=${this.onLoadedInput}  @selection-track=${this.onSelection} @update-tracks=${this.onUpdate} @delete-track=${this.onUpdate}
								disablefullscreen>
					</pxn-smart-tracking>`;
			case '':
				return html`
					<div class="dashboard">
						<h1 style="margin: auto;">Select a plugin: </h1>
						<mwc-select label='Plugin' @selected=${(e) => { this.chosenPlugin = pluginsList[e.detail.index]; }}>
							${pluginsList.map((p) => html`<mwc-list-item value=${p} ?selected=${this.chosenPlugin === p}>${p}</mwc-list-item>`)}
						</mwc-select>
					</div>`;
			default:
				return html`THIS PLUGIN (${this.chosenPlugin}) IS NOT IMPLEMENTED`;
		}
	}

	get headerContent() {
		if (this.chosenPlugin==='') return html`
			<h1>Dashboard: choose your annotation plugin</h1>
		`;
		else return html`
			<h1>Annotate</h1>
			<mwc-icon-button icon="exit_to_app" @click=${() => { this.chosenPlugin = ''; this.setAnnotations([]); }} title="Back to plugin choice"></mwc-icon-button>
			<mwc-icon-button icon="upload_file" @click="${() => this.shadowRoot.getElementById('up').click()}" title="Upload one or more of your images">
				<input id="up" style="display:none;" accept="image/*.jpg|image/*.png" type="file" multiple @change=${this.onUpload}/>
			</mwc-icon-button>
			<mwc-icon-button icon="edit_note" @click=${this.swapAttributeEditor} title="Edit attributes"></mwc-icon-button>
			<mwc-icon-button icon="save" @click="${this.onSave}" title="Save to json file"></mwc-icon-button>
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
			</div>`;//tool and propertypanel should be declared here
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
		.properties-panel {
			flex: 0 0 300px;
			background: var(--theme-color);
			overflow: auto;
			color: var(--font-color);
		}
		`];
	}
}

customElements.define('serverless-demo', ServerlessDemo);

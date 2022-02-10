/**
 * Implementation of tracking plugin.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

 import { css, customElement, html, property } from 'lit-element';
 import '@material/mwc-icon-button';
 import '@material/mwc-icon-button-toggle';
 import '@material/mwc-button';
 import '@material/mwc-select';
 import '@material/mwc-list/mwc-list';
 import '@material/mwc-list/mwc-list-item';
 import '@material/mwc-dialog';
 import '@material/mwc-checkbox';
 import '@material/mwc-formfield';
 import { mergeTracks as mergeTracksIcon, cutTrack } from '@pixano/core/lib/style';
 import { Graph } from './pxn-graph'
 import { ShapeData, TrackData } from './types';
 import {
	getShape,
	convertShapes,
	copyShape,
	// setKeyShape,
	setShape,
	interpolate,
	isKeyShape,
	deleteShape,
	removeOrAddKeyShape,
	// switchVisibility,
	// switchTrack,
	trackColors,
	// splitTrack,
	getNewTrackId,
	// mergeTracks,
	getClosestFrames,
	invertColor,
	getNumShapes
 } from './utils-video';
 import { ShapesEditController } from './controller';
 // import { ClickController } from "./controller-tracking";
 import { style2d } from './style';
 
 
 @customElement('pxn-tracking-graph' as any)
 export class TrackingGraph extends Graph {

	@property({type: Boolean})
	public isTrackTillTheEndChecked: boolean = true;
 
    @property({ type: Object })
	public tracks: { [key: string]: TrackData } = {};

	displayMode: 'show_all' | 'show_selected' = 'show_all';

	@property({ type: Object })
	public selectedTrackIds: Set<string> = new Set();

	categories: any[] = [
		{
			name: 'person', color: "#eca0a0", properties: [
				{ name: 'posture', type: 'dropdown', enum: ['straight', 'inclined', 'squat', 'sit'], persistent: false, default: 'straight' },
				{ name: 'occlusion', type: 'dropdown', enum: [0, 0.25, 0.50, 0.75], persistent: false, default: 0 }
			]
		},
		{ name: 'car', color: "green", properties: [] }
	];

	protected isShiftKeyPressed: boolean = false;

	// Getter of the 1st selected track ID
	protected get selectedTrackId(){
		return this.selectedTrackIds.values().next().value;
	}

	static get styles() {
		return [
			...style2d,
			css`
			.card {
				box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 3px 0px;
				border-radius: 5px;
				width: 100%;
				background: white;
				margin-top: 20px;
				--mdc-icon-size: 20px;
			}
			.item {
				display: flex;
				margin-top: 10px;
				border-bottom: 1px solid #e2e2e2;
			}
			.item mwc-icon-button,mwc-icon-button-toggle {
				width: 40px;
			}
			.item > p {
				margin: 10px;
				align-items: center;
				display: flex;
			}
			.card > p {
				padding: 20px 0px 20px 20px;
				font-weight: bold;
				background: #f9f9f9;
				margin: 0;
			}
			.dot {
				height: 15px;
				width: 15px;
				background-color: #bbb;
				border-radius: 50%;
				display: inline-block;
				margin-top: 44px;
			}
			.track-button {
				display: inline-block;
				margin: 2px 5px;
				cursor: pointer;
				user-select: none;
				padding: 2px 5px;
				border-radius: 3px;
			}
		`];
	}

	constructor() {
		super();
		this.handleTrackSelection();

		this.addEventListener('timestamp', () => {
			console.log("Track", this.tracks);
			this.drawTracks();
		});
		this.addEventListener('create', (e) => {
			// if there is a selected track, add keyshape
			// else create a new track
			if (this.selectedTrackIds.size) {
				// add keyshape
				this.addNewKeyShapes([
					{
						...JSON.parse(JSON.stringify((e as any).detail)),
						id: this.selectedTrackId
					}
				]);
			} else {
				// new track
				this.newTrack(e);
			}
		});
		// The tracks have been updated
		this.addEventListener('update-tracks', () => {
			this.requestUpdate();
		});
		this.addEventListener('selection-track', () => {
			this.requestUpdate();
		});
		this.addEventListener('delete-track', () => {
			this.selectedTrackIds.clear();
			this.drawTracks();
			this.requestUpdate();
		});
		// when updating instance, create or edit keyshape
		this.addEventListener('update', () => {
			this.addNewKeyShapes([...this.targetShapes]);
		});
		this.addEventListener('selection', () => {
			// unselect track if shape is unselected
			if (!this.targetShapes.size) {
				this.selectedTrackIds.clear();
				this.dispatchEvent(new CustomEvent('selection-track', { detail: this.selectedTrackIds }));
			}
		});
		this.addEventListener('delete', (evt: any) => {
			const ids = evt.detail;
			ids.forEach((id: string) => {
				if (isKeyShape(this.tracks[id], this.timestamp)) {
					deleteShape(this.tracks[id], this.timestamp);
					if (!getNumShapes(this.tracks[id])) this.deleteTrack(id);// if track is empty remove it
				}
			});
			this.dispatchEvent(new CustomEvent('update-tracks', { detail: Object.values(this.tracks) }));
			this.drawTracks();
		});
	}

	protected keyDownHandler = (evt: KeyboardEvent) => {
		// if (evt.key === "r") {
		// 	this.mergeTracks(this.selectedTrackIds);
		// } else 
		if (evt.key === "f") {
			if (this.selectedTrackIds.size === 1) {
				this.goToFirstFrame(this.tracks[Array.from(this.selectedTrackIds)[0]]);
			}
		} else if (evt.key === "l") {
			if (this.selectedTrackIds.size === 1) {
				this.goToLastFrame(this.tracks[Array.from(this.selectedTrackIds)[0]]);
			}
		} else if (evt.key === 'n') {
			this.mode = 'create';// new track => create mode
		} else if (evt.key === 'Escape') {
			this.mode = 'edit';// back to edit mode
		}
		this.isShiftKeyPressed = evt.shiftKey;
	}
	protected keyUpHandler = (evt: KeyboardEvent) => { this.isShiftKeyPressed = evt.shiftKey; }

	connectedCallback() {
		super.connectedCallback();
		// set global window event listeners on connection
		window.addEventListener('keydown', this.keyDownHandler);
		window.addEventListener('keyup', this.keyUpHandler);
	}

	disconnectedCallback() {
		// A classic event listener will not be automatically destroyed by lit-element,
		// This will introduce memory leaks and weird bugs.
		window.removeEventListener('keydown', this.keyDownHandler);
		window.removeEventListener('keyup', this.keyUpHandler);
		super.disconnectedCallback();
	}

	/**
	 * Extend shape controller onObjectDown to handle track selection
	 */
	protected handleTrackSelection() {
		const editController = (this.modes.edit as ShapesEditController);
		editController.doObjectSelection = (shape: ShapeData, isShiftKey: boolean = false) => {
			const firstClick = ShapesEditController.prototype.doObjectSelection.call(editController, shape, isShiftKey);
			this.selectTrack(shape.id, isShiftKey);
			return firstClick;
		}
		editController.onRootDown = (evt: any) => {
			if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
				return;
			}
			if (this.selectedTrackIds.size) {
				this.selectedTrackIds.clear();
				this.targetShapes.clear();
				this.dispatchEvent(new CustomEvent('selection-track', { detail: this.selectedTrackIds }));
			}
		}
	}

	protected selectTrack(trackId: string, isShiftKey: boolean) {
		if (isShiftKey) {
			if (!this.selectedTrackIds.has(trackId)) {
				this.selectedTrackIds.add(trackId);
				this.dispatchEvent(new CustomEvent('selection-track', { detail: this.selectedTrackIds }));
			}
		} else if (!this.selectedTrackIds.has(trackId)) {
			this.selectedTrackIds.clear();
			this.selectedTrackIds.add(trackId);
			this.dispatchEvent(new CustomEvent('selection-track', { detail: this.selectedTrackIds }));
		}
	}

	/**
	 * Called on every property change
	 * @param changedProperty
	 */
	updated(changedProperties: any) {
		super.updated(changedProperties);
		if (changedProperties.has('tracks')) {
			// Called when we initialize the tracks for the first time
			this.drawTracks();
		}
	}

	drawTracks() {
		this.shapes = this.convertShapes(this.timestamp) as any;
		// update selection to be displayed
		const selectedIds = [...this.selectedTrackIds];
		this.selectedShapeIds = selectedIds;
	}

	/**
	 * Get rectangle shapes from specific frame
	 * @param fIdx
	 */
	convertShapes(timestamp: number): ShapeData[] {
		const tracks = this.displayMode === 'show_all' ?
			this.tracks : [...this.selectedTrackIds].reduce((map, id) => ({ ...map, [id]: this.tracks[id] }), {});
		this.copyShapes(tracks, this.timestamp);
		return convertShapes(tracks, timestamp);
	}

	/**
	 * Copy shapes from annotated shape to other frames where shape is not defined
	 * @param tracks 
	 * @param timestamp 
	 */
	copyShapes(tracks:{[key: string]: TrackData}, timestamp: number){
		if(tracks !== undefined){
			Object.keys(tracks).forEach((tid: string) => {
				const t = tracks[tid];
				const shape = getShape(t, timestamp);
				if (!shape) {
					const copied = copyShape(t, timestamp);
					if (copied) {
						setShape(t, timestamp, copied, false);
					}
				}
			});
		}
	}

	newTrack(e: any) {
		const newTrackId = getNewTrackId(this.tracks);
		const newShape = e.detail as ShapeData;
		newShape.id = newTrackId;
		newShape.color = trackColors[parseInt(newTrackId,10) % trackColors.length];
		newShape.createdBy = 'manual'
		const cls = this.categories[0].name;
		const shape = {
			id: newTrackId,
			geometry: newShape.geometry,
			createdBy: newShape.createdBy,
			timestamp: this.timestamp,
			labels: this.getDefaultProperties(cls)
		};
		const newTrack = {
			id: newTrackId,
			shapes: { [this.timestamp]: shape },
			category: cls,
			labels: {}
		};
		this.tracks[newTrackId] = newTrack;
		this.selectedTrackIds.clear();
		this.selectedTrackIds.add(newTrackId);
		this.selectedShapeIds = [newTrack.id];
		this.drawTracks();
		this.requestUpdate();
		this.mode = 'edit';// back to edit mode after each new creation
		this.dispatchEvent(new Event('create-track'));
	}

	// /**
	//  * Split track into two tracks
	//  * @param t
	//  */
	// splitTrack(tId: string) {
	// 	const newTrack = splitTrack(tId, this.timestamp, this.tracks);
	// 	this.selectedTrackIds.clear();
	// 	this.selectedTrackIds.add(newTrack.id);
	// 	this.dispatchEvent(new Event('update-tracks'));
	// }

	// /**
	//  * Merge two tracks.
	//  * If they do not overlap, do concatenation of keyshapes else display an error message.
	//  * @param tracks tracks to be merged
	//  */
	// mergeTracks(tracks: Set<string>) {
	// 	if (tracks.size !== 2) {
	// 		return;
	// 	}
	// 	const [t1Id, t2Id] = [...tracks];
	// 	const mergeResult = mergeTracks(this.tracks, t1Id, t2Id);
	// 	if (mergeResult.trackId !== "") {
	// 		this.selectedTrackIds.clear();
	// 		this.selectedTrackIds.add(mergeResult.trackId);
	// 		this.dispatchEvent(new Event('update-tracks'));
	// 	} else {
	// 		this.mergeErrorDialog(t1Id, t2Id, mergeResult.keysIntersection);
	// 	}
	// }

	// /**
	//  * Switch two tracks at given timestamp.
	//  * @param trackIds tracks to be switched
	//  */
	// switchTrack(trackIds: Set<string>) {
	// 	if (trackIds.size === 2) {
	// 		const [t1Id, t2Id] = [...trackIds]
	// 		switchTrack(this.tracks, t1Id, t2Id, this.timestamp);
	// 		this.dispatchEvent(new Event('update-tracks'));
	// 	}
	// }

	// /**
	//  * Enable or disable interpolation for the current frame
	//  */
	// switchVisibility(t: TrackData) {
	// 	switchVisibility(this.tracks[t.id], this.timestamp);
	// 	this.dispatchEvent(new Event('update-tracks'));
	// }

	addNewKeyShapes(shapes: ShapeData[]) {
		shapes.forEach((s) => {
			if (this.tracks[s.id]) {
				setShape(this.tracks[s.id], this.timestamp, { ...getShape(this.tracks[s.id], this.timestamp), ...s }, true);
			}
		});
		this.dispatchEvent(new CustomEvent('update-tracks', { detail: this.tracks }));
	}

	/**
	 * Remove keyshape from track
	 * @param t
	 */
	removeOrAddKeyShape(t: TrackData) {
		removeOrAddKeyShape(this.tracks[t.id], this.timestamp);
		this.dispatchEvent(new CustomEvent('update-tracks', { detail: this.tracks }));
	}

	getDefaultPermProps(categoryName: string) {
		const category = this.categories.find((c) => c.name === categoryName);
		if (category) {
			const permProps: { [key: string]: any } = {};
			category!.properties.forEach((p: any) => {
				if (p.persistent)
					permProps[p.name] = p.default
			})
			return permProps;
		}
		return {};
	}

	getDefaultProperties(categoryName: string) {
		const category = this.categories.find((c) => c.name === categoryName);
		const permProps: { [key: string]: any } = {};
		category!.properties.forEach((p: any) => {
			if (!p.persistent)
				permProps[p.name] = p.default;
		})
		return permProps;
	}

	/**
	 * Set class (category) of the selected track
	 * @param cls new class
	 */
	setClass(t: TrackData, cls: string) {
		t.category = cls;
		t.labels = this.getDefaultProperties(cls);
		const defaultProp = this.getDefaultProperties(t.category);
		for (const [, ks] of Object.entries(t.shapes)) {
			ks.labels = { ...defaultProp };
		}
		this.dispatchEvent(new CustomEvent('update-tracks', { detail: this.tracks }));
		this.requestUpdate();
	}

	/**
	 * Set property of the selected track
	 * @param cls new class
	 */
	setProperty(t: TrackData, propName: string, propValue: any) {
		const shape = getShape(t, this.timestamp);
		if (shape && shape.labels![propName] !== propValue) {
			shape.labels![propName] = propValue;
			setShape(this.tracks[t.id], this.timestamp, { ...shape });
			this.dispatchEvent(new CustomEvent('update-tracks', { detail: this.tracks }));
			this.requestUpdate();
		}
	}

	async runInterpolation(forwardMode=true){
		const target0Id = this.selectedTrackId;
		// Always start from key shape ? --> bouton grisé autrement
		if (forwardMode){
			var [, id2] = getClosestFrames(this.tracks[target0Id], this.timestamp + 1);
			if (this.isTrackTillTheEndChecked) id2 = this.maxFrameIdx! + 1;
			while(this.timestamp < id2 - 1){
				if(!isKeyShape(this.tracks[target0Id], this.timestamp + 1)){
					const shape = interpolate(this.tracks[target0Id], this.timestamp + 1);
					setShape(this.tracks[target0Id], this.timestamp + 1, shape['shape']!, false);
				}
				this.dispatchEvent(new Event('update-tracks'));
				await this.nextFrame();	// display
				await this.delay(10);
			}
			await this.nextFrame();
		}else{
			var [id1,] = getClosestFrames(this.tracks[target0Id], this.timestamp - 1);
			if (this.isTrackTillTheEndChecked) id1 = - 1;
			while(this.timestamp > id1 + 1){
				if(!isKeyShape(this.tracks[target0Id], this.timestamp - 1)){
					const shape = interpolate(this.tracks[target0Id], this.timestamp - 1);
					setShape(this.tracks[target0Id], this.timestamp - 1, shape['shape']!, false);
				}
				this.dispatchEvent(new Event('update-tracks'));
				await this.prevFrame();
				await this.delay(10);
			}
			await this.prevFrame();
		}
				
	}

	protected delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	};

	deleteTrack(tId: string) {
		const t = this.tracks[tId];
		delete this.tracks[tId];
		this.dispatchEvent(new CustomEvent('delete-track', { detail: t }));
	}

	/**
	 * Go to previous keyframe for a given track
	 * @param t
	 */
	goToPreviousKeyFrame(t: TrackData) {
		const [prev,] = getClosestFrames(t, this.timestamp);
		if (prev >= 0) {
			this.playback!.set(prev);
		}
	}

	/**
	 * Go to next keyframe for a given track
	 * @param t
	 */
	goToNextKeyFrame(t: TrackData) {
		const [, next] = getClosestFrames(t, this.timestamp);
		if (isFinite(next)) {
			this.playback!.set(next);
		}
	}

	/**
	 * Go to the first frame of a given track
	 * @param t
	 */
	goToFirstFrame(t: TrackData) {
		this.timestamp = parseInt(Object.keys(t.shapes)[0],10);
	}

	/**
	 * Go to the last frame of a given track
	 * @param t
	 */
	goToLastFrame(t: TrackData) {
		this.timestamp = parseInt(Object.keys(t.shapes).slice(-1)[0],10);
	}

	/**
	 * Open track delete confirmation pop-up
	 * @param tId track id
	 */
	askDeleteTrack(tId: string) {
		this.dialog.heading = tId;
		this.dialog.open = true;
	}

	/**
	 * Merge error dialog
	 */
	mergeErrorDialog(t1Id: string, t2Id: string, keysIntersection: string[]) {
		const mergeErrorDialog = this.shadowRoot!.getElementById("dialog-merge-error") as any;
		const message = this.shadowRoot!.getElementById("dialog-merge-error-message");
		message!.innerHTML = "Impossible to merge tracks " + t1Id + " and " + t2Id + ".</br>"
			+ "Tracks intersect at frames: " + keysIntersection;
		mergeErrorDialog!.open = true;
	}

	/**
	 * Return HTML dialog element
	 */
	protected get dialog(): any {
		return this.shadowRoot!.getElementById("dialog") as any;
	}

	htmlProperty(prop: any, t: TrackData) {
		const shape = getShape(t, this.timestamp);
		if (shape && prop.type === 'dropdown') {
			const value = shape.labels![prop.name];
			return html`
			<mwc-select id="${t.id}-${prop.name}" label="${prop.name}" >
			${prop.enum.map((v: any) => {
				return html`<mwc-list-item value="${v}" ?selected="${v === value}">${v}</mwc-list-item>`
			})}
			</mwc-select>`
		} else if (shape && prop.type === 'checkbox') {
			const checked = shape.labels![prop.name];
			return html`
			<mwc-formfield label="${prop.name}">
				<mwc-checkbox ?checked=${checked} ></mwc-checkbox>
			</mwc-formfield>`
		}
		return html``;
	}

	/**
	 * Display information tile of selected tracks
	 * @param t track item
	 */
	get selectionSection() {
		return html`
		<div class="card">
			<p style="display: inline-flex; width: -webkit-fill-available; height: 20px;">
				<span>Selected tracks</span>
				<span style="display: inline-flex; align-items: center;">${this.selectedTrackIds.size === 2 ? html`
					<mwc-icon-button title="Switch track" icon="shuffle"></mwc-icon-button>
					<mwc-icon-button title="Merge track">${mergeTracksIcon}</mwc-icon-button>` : ``}
				</span>
			</p>
			<div>
				${[...this.selectedTrackIds].map((tId) => {
			const t = this.tracks[tId];
			const currentShape = getShape(t, this.timestamp);
			const color = trackColors[parseInt(tId,10) % trackColors.length];
			let isHidden = true;
			const disabled = currentShape === null;
			// if (currentShape) {
			// 	isHidden = currentShape.isNextHidden === true && !isKeyShape(t, this.timestamp);
			// }
			const categoryProps = this.categories.find((c) => c.name === t.category).properties || [];
			return html`
					<div class="item">
						<p style="flex-direction: column; color: gray;">T${t.id.toString()}<span class="dot" style="background: ${color}"></span></p>
						<div style="display: flex; flex-direction: column; width: 100%; margin-right: 10px;">
							<mwc-select id="labels" outlined @action=${(evt: any) => this.setClass(t, this.categories[evt.detail.index].name)}>
								${this.categories.map((c) => html`<mwc-list-item value="${c.name}" ?selected="${c.name === t.category}">${c.name}</mwc-list-item>`)}
							</mwc-select>
							${currentShape ? categoryProps.map((prop: any) => this.htmlProperty(prop, t)) : html``}
							<div style="width: 100%;">
								<mwc-icon-button title="Go to previous keyframe" @click=${() => this.goToPreviousKeyFrame(t)} icon="keyboard_arrow_left"></mwc-icon-button>
								<mwc-icon-button title="Go to next keyframe" @click=${() => this.goToNextKeyFrame(t)} icon="keyboard_arrow_right"></mwc-icon-button>
								<mwc-icon-button title="Go to first frame (f)" @click=${() => this.goToFirstFrame(t)} icon="first_page"></mwc-icon-button>
								<mwc-icon-button title="Go to last frame (l)" @click=${() => this.goToLastFrame(t)} icon="last_page"></mwc-icon-button>
								</br>
								<mwc-icon-button-toggle title="Keyframe" id="keyshape" onIcon="star" offIcon="star_border" ?disabled=${disabled} ?on=${isKeyShape(t, this.timestamp)} @click=${() => this.removeOrAddKeyShape(t)}></mwc-icon-button-toggle>
								<mwc-icon-button-toggle title="Hidden" id="hiddenKeyshape" ?on=${!isHidden} ?disabled=${disabled}  onIcon="visibility" offIcon="visibility_off"></mwc-icon-button-toggle>								
								<mwc-icon-button title="Split track" ?disabled=${disabled}>${cutTrack}</mwc-icon-button>
								<mwc-icon-button title="Delete entire track" icon="delete_forever" @click=${() => this.askDeleteTrack(t.id)}></mwc-icon-button>
							</div>
						</div>
					</div>
					`;
		})}
			</div>
		</div>
		`;
	}

	get rightPanel() {
		return html`
		<div style="flex: 0 0 300px; background: #f9f9f9; padding: 10px; overflow-y: auto">
			${this.selectionSection}
			<div class="card">
				<p>${Object.keys(this.tracks).length} tracks</p>
				<div style="padding: 5px; text-align: center;">
					${Object.keys(this.tracks).map((id) => {
			const backgroundColor = trackColors[parseInt(id,10) % trackColors.length];
			return html`<div class="track-button" style="background: ${backgroundColor}; color: ${invertColor(backgroundColor)}"
							@click=${() => {
					this.selectTrack(id, this.isShiftKeyPressed);
					this.goToFirstFrame(this.tracks[id]);
				}}>${id}</div>`;
		})}
				</div>
			</div>
		</div>
		`;
	}

	get leftPanel() {
		const checked = this.isTrackTillTheEndChecked;
		var disabled1 = true;
		var disabled2 = true;
		if (this.selectedTrackIds.size){
			const target0Id = this.selectedTrackId;
			const [, id2] = getClosestFrames(this.tracks[target0Id], this.timestamp + 1);
			const [id1, ] = getClosestFrames(this.tracks[target0Id], this.timestamp - 1);
			disabled2 = !(id1!= -1 && isKeyShape(this.tracks[target0Id], this.timestamp));
			disabled1 = !(id2!= Infinity && isKeyShape(this.tracks[target0Id], this.timestamp));
		}
		if (checked) disabled1=disabled2=false;
		
		return html`
		<mwc-icon-button icon="edit"
						title="New track (n)"
						@click=${() => { this.selectedTrackIds.clear(); this.mode = 'create'; }}></mwc-icon-button>
		<div class="card" title="track until next keyframe or till the end (escape to stop tracking)">
			<p>Infinite tracking
			<mwc-switch ?checked=${checked}
							
							@change=${ () => { this.isTrackTillTheEndChecked = !this.isTrackTillTheEndChecked; } }
							></mwc-switch></p>
		</div>
		<div class="card">
			<p> Linear propagation
			<mwc-icon-button-toggle title="Backward" onIcon="keyboard_double_arrow_left" offIcon="keyboard_double_arrow_left"
						?disabled=${disabled2}
						@click=${() => this.runInterpolation(false)}></mwc-icon-button-toggle>
			<mwc-icon-button-toggle title="Forward" onIcon="keyboard_double_arrow_right" offIcon="keyboard_double_arrow_right"
						?disabled=${disabled1} 
						@click=${() => this.runInterpolation(true)}></mwc-icon-button-toggle></p>
		</div>
		`;
	}

	render() {
		return html`
		<div style="display: flex; height: 100%">
			${this.leftPanel}
			<div style="position: relative; min-width: 100px; width: 100%;">${super.render()}</div>
			${this.rightPanel}
		</div>
		${this.dialogs}
		`;
	}

	get dialogs() {
		return html`
		<mwc-dialog id="dialog">
			Remove track ? <br>
			WARNING: All its bounding boxes will be lost.
			</div>
			<mwc-button
				slot="primaryAction"
				dialogAction="ok"
				@click=${() => this.deleteTrack(this.dialog.heading)}>
				Ok
			</mwc-button>
			<mwc-button
				slot="secondaryAction"
				dialogAction="cancel">
				Cancel
			</mwc-button>
		</mwc-dialog>
		<mwc-dialog heading="Merge conflict" id="dialog-merge-error">
			<div id="dialog-merge-error-message"></div>
			<mwc-button slot="primaryAction" dialogAction="close">Ok</mwc-button>
		</mwc-dialog>
		`;
	}
}

/**
 * Class implementing tracking tools for a sequence
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2022)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property, LitElement, html, css } from 'lit-element';
import { GenericDisplayImpl } from './generic-display-impl';
import { interpolate2, delay, invertColor, trackColors } from './utils';
import { cutTrack, mergeTracks as mergeTracksIcon } from './style';
import { annotation, Annotations } from './annotations-manager';


@customElement('tracking-panel' as any)
export class TrackingPanel extends LitElement {

	static get styles() {
		return [
			css`
			.card {
				box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 3px 0px;
				border-radius: 5px;
				width: 100%;
				background: white;
				margin-top: 20px;
				--mdc-icon-size: 20px;
				color: black;
			}
			.track-button {
				display: inline-block;
				margin: 2px 5px;
				cursor: pointer;
				user-select: none;
				padding: 2px 5px;
				border-radius: 3px;
				border: 5px solid;
			}
			.dialog-buttons {
				font-weight: bold;
				color: black;
				text-align: right;
			}
        `]
	}

	@property({ type: Array })
	public trackIds = new Array<number>();//list of track ids
	@property({ type: Number })
	nbTracks = 0;//... only to force render update (does not update for arrays...)

	@property({ type: Array })
	public selectedTrackIds = new Array<number>();//currently selected track ids

	protected isShiftKeyPressed: boolean = false;
	public element: GenericDisplayImpl = new GenericDisplayImpl();
	public annotations: Annotations= new Annotations();

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('keydown', this.keyDownHandler);
		window.addEventListener('keyup', this.keyUpHandler);
	}

	disconnectedCallback() {
		window.removeEventListener('keydown', this.keyDownHandler);
		window.removeEventListener('keyup', this.keyUpHandler);
		super.disconnectedCallback();
	}

	protected keyDownHandler = (evt: KeyboardEvent) => { console.log("evt.shiftKey down=",evt.shiftKey); this.isShiftKeyPressed = evt.shiftKey; }
	protected keyUpHandler = (evt: KeyboardEvent) => { console.log("evt.shiftKey up=",evt.shiftKey); this.isShiftKeyPressed = evt.shiftKey; }
	protected onCreate = (evt: Event) => { console.log("onCreate !!!!",evt); }


	/******************* Utility functions *******************/

	/**
	 * Update data to be displayed
	 * @param {Object} sequence_annotations: annotations of whole sequence
	 */
	sequenceAnnotations2tracking(A: Annotations) {
		this.annotations = A;
		console.log("sequenceAnnotations2tracking this.annotations=",this.annotations);
		A.sequence_annotations.forEach((frame:any) => {//for each frame annotations
			frame.forEach((annotation:any) => {
				if (!this.trackIds.includes(annotation.tracknum)) this.trackIds.push(annotation.tracknum);
			});
		});
		this.nbTracks = this.trackIds.length;
	}

	/**
	 * Select tracks
	 * @param trackIds: array containing the track ids to select
	 */
	selectTracks(trackIds: Array<number>) {
		console.log("select trackId",trackIds);
		if (this.isShiftKeyPressed) {
			trackIds.forEach((id) => {
				if (!this.selectedTrackIds.includes(id)) this.selectedTrackIds.push(id);
			});
		} else {
			this.selectedTrackIds = [];
			this.selectedTrackIds = [...trackIds];
		}
		// update visualisation
		this.trackIds.forEach((id) => {
			if (this.trackButton(id)) {
				if (trackIds.includes(id)) this.trackButton(id).style.border="5px solid";
				else this.trackButton(id).style.border="none";
			}
		});
		this.requestUpdate();
	}
	
	/**
	 * get what should be the next tracknum for a newly created track
	 */
	getNextTracknum() {
		if (this.trackIds.length) return Math.max(...this.trackIds)+1;//TODO: smarter : check the first number from 0 that's not in trackIds
		else return 0;
	}
	
	/******************* BUTTONS handlers *******************/

	/**
	 * Interpolate on selected track, begining on current selected annotation
	 * @param forwardMode: true to interpolate to the next manually annotated frame, false to interpolate to the previous one
	 * ATTENTION: we assume here that interpolation is valid
	 */
	async runInterpolation(forwardMode: boolean, orig_annot: annotation, target_annot: annotation) {
		console.log("orig_annot.timestamp=",orig_annot.timestamp);
		console.log("target_annot.timestamp=",target_annot.timestamp);
		// goto first frame to interpolate
		if (forwardMode) await this.element.nextFrame();
		else await this.element.prevFrame();
		await delay(10);
		// run interpolation
		while ( forwardMode ? this.element.timestamp < target_annot.timestamp! : this.element.timestamp > target_annot.timestamp! ) {// for each successive timestamp from orig until target
			// compute interpolation for this frame
			const rate = (this.element.timestamp - orig_annot.timestamp!) / (target_annot.timestamp! - orig_annot.timestamp!);
			const newAnnot = interpolate2(orig_annot, target_annot, rate);
			// add this new annotation
			this.dispatchEvent(new CustomEvent('update-tracks', { detail: newAnnot }));
			// goto next frame to interpolate (and display)
			if (forwardMode) await this.element.nextFrame();
			else await this.element.prevFrame();
			await delay(10);
		}
	}

	/**
	 * Merge two tracks.
	 * If they do not overlap, do concatenation of keyshapes else display an error message.
	 * @param tracks tracks to be merged
	 */
	mergeTracks(trackIds: Array<number>) {
		if (trackIds.length<2) {
			console.error("mergeTracks called with",trackIds.length,"tracks");
			return;
		}
		console.log("merge tracks",trackIds,"at timestamp");//get current timestamp
		// verify that tracks do not overlap
		let overlap: Array<number> = [];
		this.annotations.sequence_annotations.forEach( (annotations) => {//for each frame
			let found = false;
			for (let i=0; i<trackIds.length; i++) {
				const annot = annotations.find((annotation: annotation)=> { annotation.tracknum===trackIds[i] })
				if (annot) {
					if (found) {
						overlap.push(annot.timestamp);
						break;
					} else found=true;
				}
			}
		});
		if (overlap.length) {
			const message = "Impossible to merge tracks "+trackIds+".<br>"+"Tracks intersect at frames:"+overlap;
			console.error(message);
			this.mergeErrorDialog(message);
			return;
		}
		// merge
		this.annotations.sequence_annotations.forEach((annotations) => {
			annotations.forEach((annotation: annotation) => {
				if (trackIds.includes(annotation.tracknum!)) annotation.tracknum = trackIds[0];
			});
		});
		//update trackIds and selection
		for (let i=0; i<trackIds.length; i++) this.trackIds.splice(this.trackIds.indexOf(trackIds[i]), 1);
		this.dispatchEvent(new CustomEvent('selection-track', { detail: trackIds[0] }));
		console.log("mergeTracks annotions après:",this.annotations);
		this.dispatchEvent(new Event('update-tracks'));
	}

	/**
	 * Switch two tracks at current timestamp.
	 * @param trackIds the two tracks to be switched at the current timestamp
	 */
	switchTrack(trackIds: Array<number>) {
		if (trackIds.length!==2) {
			console.error("switchTrack called with",trackIds.length,"tracks");
			return;
		}
		let timestamp = this.annotations.annotations[0].timestamp!;// current timestamp, start switch from here including this one
		console.log("switch",trackIds[0],"and",trackIds[1],"at timestamp",timestamp);
		for (let i = timestamp; i < this.annotations.sequence_annotations.length - 1; i++) {
			let annotations = this.annotations.sequence_annotations[i];//annotations for this frame
			annotations.forEach((annotation: annotation) => {
				if (annotation.tracknum===trackIds[0]) annotation.tracknum = trackIds[1];
				else if (annotation.tracknum===trackIds[1]) annotation.tracknum = trackIds[0];
			});
		}
		console.log("switchTrack annotions après:",this.annotations);
		this.dispatchEvent(new Event('update-tracks'));
	}

	/**
	 * Split track into two tracks at current timestamp.
	 * @param trackId the track to be split
	 */
	splitTrack(trackId: number) {
		this.trackIds.sort();
		const newTrackId = this.trackIds[-1]+1;
		console.error("splitTrack called for track",trackId,". New track will be",newTrackId);
		let timestamp = this.annotations.annotations[0].timestamp!;// current timestamp, split here
		for (let i = timestamp; i < this.annotations.sequence_annotations.length - 1; i++) {
			let annotations = this.annotations.sequence_annotations[i];//annotations for this frame
			annotations.forEach((annotation: annotation) => {
				if (annotation.tracknum===trackId) annotation.tracknum = newTrackId;
			});
		}
		//update trackIds and selection
		this.trackIds.push(newTrackId);
		this.dispatchEvent(new CustomEvent('selection-track', { detail: [newTrackId] }));
		console.log("switchTrack annotions après:",this.annotations);
		this.dispatchEvent(new Event('update-tracks'));
	}

	/**
	 * Delete tracks
	 * @param delTrackIds the tracks to be deleted
	 */
	deleteTrack(delTrackIds: Array<number>) {
		console.log("delTrackIds=",delTrackIds);
		console.log("this.trackIds=",this.trackIds);
		delTrackIds.forEach((id) => {
			//delete all annotations in the track
			const annots = this.annotations.getAnnotationsByTracknum(id);
			annots.forEach((a) => this.annotations.deleteAnnotation(a.id));
			// delete the track
			this.trackIds.splice(this.trackIds.indexOf(id), 1);
		});
		this.nbTracks = this.trackIds.length;
		//update selection
		console.log("this.trackIds2=",this.trackIds);
		this.dispatchEvent(new CustomEvent('selection-track', { detail: [] }));
		console.log("deleteTrack annotions après:",this.annotations);
		this.dispatchEvent(new CustomEvent('delete-track', { detail: delTrackIds }));//récup l'évènement pour renouveller l'affichage
	}

	/**
	 * Open track renumber dialog
	 * @param trackId the track to be renumbered
	 */
	showTrackRenumberDialog(trackId: number) {
		const newNumberTextField = this.shadowRoot!.getElementById("new-number") as any;
		newNumberTextField!.value = "";
		this.dialogRenumber.trackId = trackId;
		this.dialogRenumber.open = true;
	}
	/**
	 * Renumber a track
	 * @param trackIdprev previous track id
	 * @param trackIdnew new track id
	 */
	renumberTrack(trackIdprev: number, trackIdnew: number) {
		const annots = this.annotations.getAnnotationsByTracknum(trackIdprev);
		annots.forEach((a) => a.tracknum = trackIdnew);
		//update trackIds and selection
		this.trackIds.splice(this.trackIds.indexOf(trackIdprev), 1, trackIdnew);
		this.dispatchEvent(new CustomEvent('selection-track', { detail: [trackIdnew] }));
		console.log("renumberTrack annotions après:",this.annotations);
		this.dispatchEvent(new Event('update-tracks'));
	}

	/**
	 * Merge error dialog
	 */
	mergeErrorDialog(message: string) {
		const diagmessage = this.shadowRoot!.getElementById("dialog-error-message");
		diagmessage!.innerHTML = message;
		this.dialogError!.open = true;
	}

	/**
	 * Go to the first frame of a given track
	 * @param trackId the track to be renumbered
	 */
	goToFirstFrame(trackId: number) {
		const annots = this.annotations.getAnnotationsByTracknum(trackId);
		let timestamp = this.element.maxFrameIdx as number;
		annots.forEach((a) => { if (timestamp>a.timestamp!) timestamp=a.timestamp!; });
		this.element.timestamp = timestamp;
	}
	/**
	 * Go to the last frame of a given track
	 * @param trackId the track to be renumbered
	 */
	goToLastFrame(trackId: number) {
		const annots = this.annotations.getAnnotationsByTracknum(trackId);
		let timestamp = 0;
		annots.forEach((a) => { if (timestamp<a.timestamp!) timestamp=a.timestamp!; });
		this.element.timestamp = timestamp;
	}


	/******************* EVENTS handlers *******************/


	/******************* selector getters *******************/
	protected get dialogDelete(): any {
		return this.shadowRoot!.getElementById("dialog-delete") as any;
	}
	protected get dialogRenumber(): any {
		return this.shadowRoot!.getElementById("dialog-renumber") as any;
	}
	protected get dialogError(): any {
		return this.shadowRoot!.getElementById("dialog-error") as any;
	}
	protected trackButton(id: number): any {
		return this.shadowRoot!.getElementById("track-button-"+id) as any;
	}

	/******************* TOOLS to be displayed *******************/

	/**
	 * Tools dedicated to sequences
	 */
	get sequenceTools() {
		console.log("sequenceTools");
		// only enable interpolation when possible (i.e. when at least two manual annotations exist in the sequence) and only between manual annotations
		let disabled_forward = true;
		let disabled_backward = true;
		let disabled_switchTrack = true;
		let disabled_mergeTracks = true;
		let disabled_onetrackselected = true;
		let disabled_oneormoretrackselected = true;
		let orig_annot: annotation, next_annot: annotation, prev_annot: annotation;
		if (this.selectedTrackIds.length>=1) disabled_oneormoretrackselected = false;
		if (this.selectedTrackIds.length===1) {
			disabled_onetrackselected = false;
			//is it possible to interpolate on selected track, begining on current selected annotation
			orig_annot = this.annotations.getAnnotationByID(this.annotations.getSelectedIds[0]);
			if ((orig_annot) && (orig_annot.tracknum === this.selectedTrackIds[0]) ) {
				const annot_track = this.annotations.sequence_annotations.flat().filter( (a) => (a.tracknum === this.selectedTrackIds[0]) && (a.origin.createdBy==='manual') );//get manual annotations linked to the current track
				next_annot = annot_track.find( (a) => a.timestamp > orig_annot.timestamp! );
				prev_annot = annot_track.find( (a) => a.timestamp < orig_annot.timestamp! );
				if (next_annot) disabled_forward = false;
				if (prev_annot) disabled_backward = false;
			}
		} else {
			disabled_switchTrack = this.selectedTrackIds.length!==2;
			disabled_mergeTracks = this.selectedTrackIds.length<2;
		}

		return html`
			<div title="Tracking tools" style="display:flex; flex-direction: column">
				<label style="margin-left: 10px">Tracking tools</label>
				<span style="text-align: center">Interpolation</span>
				<div style="display:flex; flex-direction: row">
					<mwc-icon-button ?disabled=${disabled_backward} title="Backward interpolation" icon="switch_right" @click=${() => this.runInterpolation(false, orig_annot, prev_annot) }></mwc-icon-button>
					<mwc-icon-button ?disabled=${disabled_forward} title="Forward interpolation" icon="switch_left" @click=${() => this.runInterpolation(true, orig_annot, next_annot) }></mwc-icon-button>
				</div>
				<label style="text-align: center">Selected tracks tools</label>
				<div style="display:flex; flex-direction: row">
					<mwc-icon-button title="Switch track" ?disabled=${disabled_switchTrack} @click=${() => this.switchTrack(this.selectedTrackIds)} icon="shuffle"></mwc-icon-button>
					<mwc-icon-button title="Merge track" ?disabled=${disabled_mergeTracks} @click=${() => this.mergeTracks(this.selectedTrackIds)}>${mergeTracksIcon}</mwc-icon-button>
				</div>
				<label style="text-align: center">Navigation</label>
				<div style="display:flex; flex-direction: row">
					<mwc-icon-button ?disabled=${disabled_onetrackselected} title="Go to first frame (f)" @click=${() => this.goToFirstFrame(this.selectedTrackIds[0])} icon="first_page"></mwc-icon-button>
					<mwc-icon-button ?disabled=${disabled_onetrackselected} title="Go to last frame (l)" @click=${() => this.goToLastFrame(this.selectedTrackIds[0])} icon="last_page"></mwc-icon-button>
				</div>
				<label style="text-align: center">Selected track tools</label>
				<div style="display:flex; flex-direction: row">
					<mwc-icon-button ?disabled=${disabled_onetrackselected} title="Split track" @click=${() => this.splitTrack(this.selectedTrackIds[0])}>${cutTrack}</mwc-icon-button>
					<mwc-icon-button ?disabled=${disabled_onetrackselected} title="Renumber track" icon="edit" @click=${() => this.showTrackRenumberDialog(this.selectedTrackIds[0])}></mwc-icon-button>
					<mwc-icon-button ?disabled=${disabled_oneormoretrackselected} title="Delete entire track" icon="delete_forever" @click=${() => { this.dialogDelete.open = true; } }></mwc-icon-button>
				</div>
			</div>
		`;
	}

	// <mwc-icon-button-toggle title="Keyframe" id="keyshape" onIcon="star" offIcon="star_border" ?on=${isKeyShape(t, this.timestamp)} @click=${() => {console.log("TODO");}}></mwc-icon-button-toggle>
	// <mwc-icon-button-toggle title="Hidden" id="hiddenKeyshape" ?on=${!isHidden}  onIcon="visibility" offIcon="visibility_off"></mwc-icon-button-toggle>

	/******************* RENDERING: main tracking panel  *******************/

	/**
	 * Render the element template.
	 */
	render() {
		return html`
			<hr>
			${this.sequenceTools}
			<div class="card">
				<p>${this.nbTracks} tracks</p>
				<div style="padding: 5px; text-align: center;">
					${this.trackIds.map((id) => {
						const backgroundColor = trackColors[id % trackColors.length];
						return html`<div id="track-button-${id}" class="track-button" style="background: ${backgroundColor}; color: ${invertColor(backgroundColor)};"
										@click=${() => this.dispatchEvent(new CustomEvent('selection-track', { detail: [id] }))}>${id}</div>`;
					})}
				</div>
			</div>
			${this.dialogs}
		`;
	}

	get dialogs() {
		return html`
		<mwc-dialog id="dialog-delete">
			Remove folowing track(s) ? <br>
			<div style="padding: 5px; text-align: center;">
				${this.selectedTrackIds.map((id) => {
					const backgroundColor = trackColors[id % trackColors.length];
					return html`<div class="track-button" style="background: ${backgroundColor}; color: ${invertColor(backgroundColor)};"
									@click=${() => this.dispatchEvent(new CustomEvent('selection-track', { detail: [id] }))}>${id}</div>`;})}
				<br>
				WARNING: All its bounding boxes will be lost.
				<br><br>
				<mwc-button class="dialog-buttons" slot="primaryAction" dialogAction="ok" @click=${() => this.deleteTrack(this.selectedTrackIds)}> Ok </mwc-button>
				<mwc-button class="dialog-buttons" slot="secondaryAction" dialogAction="cancel"> Cancel </mwc-button>
			</div>
		</mwc-dialog>

		<mwc-dialog heading="Merge conflict" id="dialog-error">
			<div id="dialog-error-message"></div>
			<mwc-button class="dialog-buttons" slot="primaryAction" dialogAction="close"> Ok </mwc-button>
		</mwc-dialog>

		<mwc-dialog heading="Renumber track" id="dialog-renumber">
			<div>Enter a new number for this track:</div>
			<mwc-textfield
				id="new-number"
				label="New number"
				@input=${() => {
					const newNumberTextField = this.shadowRoot!.getElementById("new-number") as any;
					var constraint = new RegExp("[0-9]+", "");
					if (!constraint.test(newNumberTextField.value))
						newNumberTextField.setCustomValidity("Not a valid track id.");
					else if (this.trackIds.includes(newNumberTextField.value)) {
						console.log("this.trackIds=",this.trackIds);
						console.log("newNumberTextField.value=",newNumberTextField.value);
						newNumberTextField.setCustomValidity("A track with this id already exists.");
					}
					else
						newNumberTextField.setCustomValidity("");
					newNumberTextField.reportValidity();
				}}>
			</mwc-textfield>
			<mwc-button class="dialog-buttons"
				slot="primaryAction"
				@click=${() => {
					const newNumberTextField = this.shadowRoot!.getElementById("new-number") as any;
					const tIdPrevious = this.dialogRenumber.trackId;
					const tIdNew = newNumberTextField.value;
					const isValid = newNumberTextField.checkValidity();
					if (isValid) {
						this.renumberTrack(parseInt(tIdPrevious), parseInt(tIdNew));
						this.dialogRenumber.open = false;
					}
				}}>
				Ok
			</mwc-button>
			<mwc-button class="dialog-buttons" slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
		</mwc-dialog>
		`;
	}
}

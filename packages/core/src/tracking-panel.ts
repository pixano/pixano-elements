/**
 * Class implementing tracking tools for a sequence
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2022)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property, LitElement, html, css } from 'lit-element';
import { GenericDisplayImpl } from './generic-display-impl';
import { interpolate2, delay, invertColor, trackColors } from './utils';
// import { mergeTracks as mergeTracksIcon } from './style';
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
			this.selectedTrackIds = trackIds;
		}
		this.dispatchEvent(new CustomEvent('selection-track', { detail: this.selectedTrackIds }));
		this.requestUpdate();
	}


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

	/******************* EVENTS handlers *******************/


	/******************* TOOLS to be displayed *******************/

	/**
	 * Tools dedicated to sequences
	 */
	get sequenceTools() {
		console.log("sequenceTools");
		// only enable interpolation when possible (i.e. when at least two manual annotations exist in the sequence) and only between manual annotations
		let disabled_forward = true;
		let disabled_backward = true;
		let orig_annot: annotation, next_annot: annotation, prev_annot: annotation;
		// if ( (this.selectedTracknum !== -1) && (this.selectedIds.length===1) ) {
		// if ( (this.selectedTrackIds.length===1) && (this.selectedIds.length===1) ) {//interpolate on selected track, begining on current selected annotation
		if (this.selectedTrackIds.length===1) {//interpolate on selected track, begining on current selected annotation
			console.log("if");
			console.log("this.annotations=",this.annotations);
			console.log("this.annotations.getSelectedIds=",this.annotations.getSelectedIds);
			orig_annot = this.annotations.getAnnotationByID(this.annotations.getSelectedIds[0]);
			console.log("orig_annot=",orig_annot);
			console.log("orig_annot.tracknum=",orig_annot.tracknum);
			console.log("this.selectedTrackIds[0]=",this.selectedTrackIds[0]);
			if ((orig_annot) && (orig_annot.tracknum === this.selectedTrackIds[0]) ) {
				const annot_track = this.annotations.sequence_annotations.flat().filter( (a) => (a.tracknum === this.selectedTrackIds[0]) && (a.origin.createdBy==='manual') );//get manual annotations linked to the current track
				next_annot = annot_track.find( (a) => a.timestamp > orig_annot.timestamp! );
				prev_annot = annot_track.find( (a) => a.timestamp < orig_annot.timestamp! );

				console.log("next_annot=",next_annot);
				console.log("prev_annot=",prev_annot);
				if (next_annot) disabled_forward = false;
				if (prev_annot) disabled_backward = false;
			}
		} else {
			console.log("else");
		}
		// let disabled_multiTracks = this.selectedTrackIds.length<2;

		// if (this.selectedTrackIds.length===1) disabled_forward = false;
		// else if (this.selectedTrackIds.length===2) disabled_backward = false;

		return html`
			<div title="Tracking tools" style="display:flex; flex-direction: row">
				<p>Interpolation<p>
				<mwc-icon-button title="Backward interpolation" icon="switch_right"
							?disabled=${disabled_backward}
							@click=${() => this.runInterpolation(false, orig_annot, prev_annot) }></mwc-icon-button>
				<mwc-icon-button title="Forward interpolation" icon="switch_left"
							?disabled=${disabled_forward} 
							@click=${() => this.runInterpolation(true, orig_annot, next_annot) }></mwc-icon-button>
				<p><p>
			</div>
		`;
	}

	// <mwc-icon-button title="Switch track" ?disabled=${disabled_multiTracks} @click=${() => this.switchTrack(this.selectedTrackIds)} icon="shuffle"></mwc-icon-button>
	// <mwc-icon-button title="Merge track" ?disabled=${disabled_multiTracks} @click=${() => this.mergeTracks(this.selectedTrackIds)}>${mergeTracksIcon}</mwc-icon-button>

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
						return html`<div class="track-button" style="background: ${backgroundColor}; color: ${invertColor(backgroundColor)}"
										@click=${() => { this.selectTracks([id]); }}>${id}</div>`;
					})}
				</div>
			</div>
		`;
	}
	// ${this.dialogs}

	// get dialogs() {
	// 	return html`
	// 	<mwc-dialog id="dialog">
	// 		Remove track ? <br>
	// 		WARNING: All its bounding boxes will be lost.
	// 		</div>
	// 		<mwc-button
	// 			slot="primaryAction"
	// 			dialogAction="ok"
	// 			@click=${() => this.deleteTrack(this.dialog.heading)}>
	// 			Ok
	// 		</mwc-button>
	// 		<mwc-button
	// 			slot="secondaryAction"
	// 			dialogAction="cancel">
	// 			Cancel
	// 		</mwc-button>
	// 	</mwc-dialog>
	// 	<mwc-dialog heading="Merge conflict" id="dialog-merge-error">
	// 		<div id="dialog-merge-error-message"></div>
	// 		<mwc-button slot="primaryAction" dialogAction="close">Ok</mwc-button>
	// 	</mwc-dialog>
	// 	<mwc-dialog heading="Renumber track" id="dialog-renumber">
	// 		<div>Enter a new number for this track:</div>
	// 		<mwc-textfield
	// 			id="new-number"
	// 			label="New number"
	// 			@input=${() => {
	// 				const newNumberTextField = this.shadowRoot!.getElementById("new-number") as any;

	// 				var constraint = new RegExp("[0-9]+", "");
	// 				if (!constraint.test(newNumberTextField.value))
	// 					newNumberTextField.setCustomValidity("Not a valid track id.");
	// 				else if (newNumberTextField.value in this.tracks)
	// 					newNumberTextField.setCustomValidity("A track with this id already exists.");
	// 				else
	// 					newNumberTextField.setCustomValidity("");
	// 				newNumberTextField.reportValidity();
	// 			}}>
	// 		</mwc-textfield>
	// 		<mwc-button
	// 			slot="primaryAction"
	// 			@click=${() => {
	// 				const renumberDialog = this.shadowRoot!.getElementById("dialog-renumber") as any;
	// 				const newNumberTextField = this.shadowRoot!.getElementById("new-number") as any;
	// 				const tIdPrevious = renumberDialog.tId;
	// 				const tIdNew = newNumberTextField.value;

	// 				const isValid = newNumberTextField.checkValidity();
	// 				if (isValid) {
	// 					this.renumberTrack(tIdPrevious, tIdNew);
	// 					renumberDialog.open = false;
	// 				}
	// 			}}>
	// 			Ok
	// 		</mwc-button>
	// 		<mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
	// 	</mwc-dialog>
	// 	`;
	// }
}

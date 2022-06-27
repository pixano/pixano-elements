/**
 * Utility class to pick labels in a panel
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property, LitElement, html, css } from 'lit-element';
import { invertColor, trackColors } from './utils';

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

	constructor() {
		super();
	}

	/**
	 * Update data to be displayed
	 * @param {Object} sequence_annotations: annotations of whole sequence
	 */
	sequenceAnnotations2trackIds(sequence_annotations: []) {
		sequence_annotations.forEach((frame:any) => {//for each frame annotations
			frame.forEach((annotation:any) => {
				if (!this.trackIds.includes(annotation.tracknum)) this.trackIds.push(annotation.tracknum);
			});
		});
		this.nbTracks = this.trackIds.length;
	}

	firstUpdated() {
	}

	/**
	 * Render the element template.
	 */
	render() {
		return html`
		<div style="background: #f9f9f9; padding: 10px; overflow-y: auto">
			<div class="card">
				<p>${this.nbTracks} tracks</p>
				<div style="padding: 5px; text-align: center;">
					${this.trackIds.map((id) => {
						const backgroundColor = trackColors[id % trackColors.length];
						return html`<div class="track-button" style="background: ${backgroundColor}; color: ${invertColor(backgroundColor)}"
										@click=${() => {
											this.dispatchEvent(new CustomEvent('tracking-panel-select', { detail: id }));
										}}>${id}</div>`;
					})}
				</div>
			</div>
		</div>
		`;
	}
}

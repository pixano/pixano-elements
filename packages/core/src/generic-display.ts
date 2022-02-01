/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { html, internalProperty, LitElement, property, TemplateResult } from 'lit-element';
import './playback-control';
import './sequence-timeline';
import { SequenceLoader, Loader } from './data-loader';
import { genericStyles } from './style';

/**
 * Utility class to load images of sequences of images given
 * their sources.
 *
 * @fires CustomEvent#load upon loading input item { detail: input data }
 * @fires CustomEvent#timestamp upon changing current timestamp { detail: number }
 */
export abstract class GenericDisplay extends LitElement {

	public loader: Loader | SequenceLoader = new Loader();

	// additionnal properties for sequence loader
	public maxFrameIdx: number | null = null;
	public pendingLoad: boolean | null = null;

	@internalProperty()
	private _targetFrameIdx: number | null = null;

	private _lastTargetFrameIdx: number | null = null;

	// either use list item index as timestamp
	// or look for timestamp value in filename
	@property({ type: String })
	public timestampRule: 'index' | 'filename' = 'index';// TODO : not used

	protected authorizedType: 'image' | 'pcl' | 'all' = 'all';

	private _source: string | string[] = '';

	static get properties() {
		return {
			maxFrameIdx: { type: Number }
		};
	}

	/**
	 * Returns video playback slider element.
	 */
	get playback() {
		return this.shadowRoot?.querySelector('playback-control');
	}

	public static get styles() {
		return [genericStyles];
	}

	constructor() {
		super();
		this.onSliderChange = this.onSliderChange.bind(this);
	}

	protected firstUpdated() {
		const slot = this.shadowRoot?.querySelector('slot')!;
		slot.addEventListener('slotchange', () => {
			// let nodes = slot.assignedNodes();
			this.playback!.disconnectedCallback();
		});
	}

	@property({ type: String })
	get input(): string | string[] {
		return this._source;
	}

	/**
	 * Load data from source file or sequence of files
	 * @param {string | string[]} source - media file name or list of media file names
	 */
	set input(source: string | string[]) {
		this._source = source;

		// case of unique data file
		if (typeof source === 'string') {
			this.loader = new Loader(this.authorizedType);
			this.loader.load(source).then((data) => {
				this.notifyInputLoaded(data);
			});
		} else {
			// list of strings
			const loader = new SequenceLoader(this.authorizedType);
			const regex = /(?<=_)(\d+?)(?=\.)/g;
			this.loader = loader;
			const frames = this.timestampRule === 'index' ? source.map((path, timestamp) => ({ timestamp, path })) || [] :
				source.map((path) => {
					const match = path.match(regex);
					const timestamp = match && match.length ? parseInt(match.pop()!,10) : 0;
					return { path, timestamp }
				});
			loader.init(frames)
				.then((length) => {
					this.maxFrameIdx = Math.max(length - 1, 0);
					if (this.playback) {
						this.playback.set(0);
					} else {
						this.frameIdx = 0;
					}
				});
		}
		this.requestUpdate();
	}

	get timestamp(): number {
		return (this.loader instanceof SequenceLoader) ? this.loader.frames[this.frameIdx].timestamp : 0;
	}

	set timestamp(timestamp: number) {
		if (this.loader instanceof SequenceLoader) {
			const frameIdx = this.loader.frames.findIndex((f) => f.timestamp === timestamp);
			if (frameIdx !== -1) {
				this.frameIdx = frameIdx;
			}
		}
	}

	/**
	 * Get frame index
	 */
	get frameIdx(): number {
		return this._targetFrameIdx || 0;
	}

	/**
	 * Set frame to load
	 * @param {number} frameIndex - index of frame to load
	 */
	set frameIdx(frameIndex: number) {
		if (!this.isSequence) {
			return;
		}
		const maxFrameIdx = this.maxFrameIdx as number;
		const loader = this.loader as SequenceLoader;
		if (frameIndex >= 0 && frameIndex <= maxFrameIdx && this._targetFrameIdx !== frameIndex) {//don't notify if nothing changes
			this._lastTargetFrameIdx = this._targetFrameIdx;//keep the last state
			this._targetFrameIdx = frameIndex;
			this.playback!.current = frameIndex;
			if (this.pendingLoad) {
				return;
			}
			this.pendingLoad = true;
			loader.peekFrame(this._targetFrameIdx).then((data: any) => {
				this.pendingLoad = false;
				this.notifyInputLoaded(data);
				this.notifyTimestampChanged();
			});
		}
	}

	/**
	 * Get last frame index
	 */
	get lastFrameIdx(): number {
		return this._lastTargetFrameIdx || 0;
	}

	public nextFrame(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.isSequence) {
				resolve();
			}
			const obs = () => {
				this.removeEventListener('load', obs);
				resolve();
			}
			this.addEventListener('load', obs);
			if (this.playback) {
				this.playback.setNext();
			} else {
				const currIdx = this._targetFrameIdx as number;
				const maxIdx = this.maxFrameIdx as number;
				if (currIdx < maxIdx) {
					this.frameIdx = currIdx + 1;
				}
			}
		});
	}

	public isLastFrame(): boolean {
		const currIdx = this._targetFrameIdx as number;
		const maxIdx = this.maxFrameIdx as number;
		if (currIdx >= maxIdx) return true;
		return false;
	}

	/**
	 * Fired on playback slider update.
	 * @param {CustomEvent} evt
	 */
	onSliderChange(evt: CustomEvent) {
		this.frameIdx = evt.detail;
	}

	get isSequence() {
		return this.loader instanceof SequenceLoader;
	}

	private notifyInputLoaded(data: HTMLImageElement | Float32Array) {
		this.dispatchEvent(new CustomEvent('load', { detail: data }));
	}

	private notifyTimestampChanged() {
		this.dispatchEvent(new CustomEvent('timestamp', { detail: this._targetFrameIdx }));
	}

	display(): TemplateResult {
		return html``;
	}

	/**
	 * Generic render that display a playback slider at the bottom
	 * if the component displays a sequence.
	 * You can override the default "slider" slot by your own html child. E.g:
	 * `
	 * 	<pxn-cuboid>
	 * 		<div slot="slider">Slider</div>
	 * 	</pxn-cuboid>
	 * `
	 */
	render() {
		return html`
				<div id="container">
					${this.display()}
					<slot name="slider" id="slot">
						<div style="display: ${this.isSequence ? 'block' : 'none'};">
							<pxn-sequence-timeline style="display: ${this.isSequence ? 'flex' : 'none'}; height: 50px; width: 100%"></pxn-sequence-timeline>
							<playback-control @update=${this.onSliderChange}
																		style="display: ${this.isSequence ? 'flex' : 'none'};"
																		max=${this.maxFrameIdx}></playback-control>
						</div>
					</slot>
				</div>
				`;
	}
}

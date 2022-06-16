/**
 * Implementation of 2d canvas view controls.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { Renderer } from './renderer';
import { Rectangle as PIXIRectangle } from 'pixi.js';

export class ViewControls extends EventTarget {

	private init: { x: number, y: number } = { x: 0, y: 0 };

	public reinit() {
		// zoom
		this.viewer.s = 1;
		// apply zoom center (sx and sy are offsets)
		this.viewer.sx = 0;
		this.viewer.sy = 0;
		// apply changes
		this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth, this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
		this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
		this.triggerOnZoom();
		this.computeHitArea();
	}

	private isPanning: boolean = false;

	protected viewer: Renderer;

	constructor(viewer?: Renderer) {
		super();
		this.viewer = viewer || new Renderer();
		// necessity to store listener as variable
		// to keep ability to removelistener
		this.onPanInit = this.onPanInit.bind(this);
		this.onPan = this.onPan.bind(this);
		this.onPanUp = this.onPanUp.bind(this);
		this.onEdgeMove = this.onEdgeMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onMove = this.onMove.bind(this);
		if (viewer) {
			this.enableZoom();
			this.viewer.stage.interactive = true;
			this.viewer.stage.on('pointerdown', this.onPanInit);
			this.viewer.stage.on('pointermove', this.onMove);
		}
	}

	public disableZoom() {
		this.viewer.domElement.removeEventListener('wheel', this.onWheel);
	}

	public enableZoom() {
		this.viewer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
	}

	public computeHitArea() {
		this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
			-this.viewer.stage.position.y / this.viewer.stage.scale.y,
			this.viewer.canvasWidth / this.viewer.stage.scale.x,
			this.viewer.canvasHeight / this.viewer.stage.scale.y);
	}

	public triggerOnZoom() {
		this.dispatchEvent(new CustomEvent('zoom', { detail: this.viewer.s }));
		this.notifyUpdate();
	}

	/**
	 * Return magnitude of wheelevent
	 * @param evt
	 */
	public wheelDistance(evt: WheelEvent) {
		evt.preventDefault();
		const w = evt.deltaY;
		const d = evt.detail;
		if (d) {
			if (w) {
				return w / d / 40 * d > 0 ? 1 : -1; // Opera
			} else {
				return -d / 3;							// Firefox;				 TODO: do not /3 for OS X
			}
		} else {
			// Chrome
			// @ts-ignore
			if (evt.wheelDelta !== undefined) {
				return - w / 70;
			}
			return - w / 3;						 // IE/Safari
		}
	}

	/**
	 * Handle zoom scales and offset on wheelevent.
	 * Change s, sx and sy.
	 * @param evt
	 */
	public onWheel(evt: WheelEvent) {
		if (evt.ctrlKey) evt.preventDefault();
		// compute wheel mouse target relative to stage
		const canvasBounds = this.viewer.view.getBoundingClientRect();
		const scaleFactor = 1.0 + Math.sign(this.wheelDistance(evt)) * 0.1;
		this.zoomFct(scaleFactor, [evt.x - canvasBounds.left, evt.y - canvasBounds.top]);
	}

	public zoomIn() {
		this.zoomFct(1.1, [this.viewer.rw / 2, this.viewer.rh / 2]);
	}

	public zoomOut() {
		this.zoomFct(0.9, [this.viewer.rw / 2, this.viewer.rh / 2]);
	}

	/**
	 * Generalized zoom function
	 * @param scaleFactor scale factor to be applied
	 * @param center point where the zoom will be centered
	 */
	public zoomFct(scaleFactor: number, center: [number, number]) {
		// apply new scale
		const oldscale = this.viewer.s;
		this.viewer.s *= scaleFactor;
		// Check to see that the scale is not outside of the specified bounds
		if (this.viewer.s >= this.viewer.smax) {
			this.viewer.s = this.viewer.smax;
			this.viewer.sx = (this.viewer.sx - center[0]) * (this.viewer.s / oldscale) + center[0];
			this.viewer.sy = (this.viewer.sy - center[1]) * (this.viewer.s / oldscale) + center[1];
		} else if (this.viewer.s <= this.viewer.smin) {
			this.viewer.s = this.viewer.smin;
			// center placeholder if zoom is minimal
			this.viewer.computeDrawableArea(this.viewer.canvasWidth, this.viewer.canvasHeight, this.viewer.imageWidth, this.viewer.imageHeight, true);
		} else {
			// apply zoom center (sx and sy are offsets)
			this.viewer.sx = (this.viewer.sx - center[0]) * (this.viewer.s / oldscale) + center[0];
			this.viewer.sy = (this.viewer.sy - center[1]) * (this.viewer.s / oldscale) + center[1];
		}
		// apply changes
		this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth, this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
		this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
		this.triggerOnZoom();
		this.computeHitArea();
	}

	public onMove() {
		this.viewer.updateMouseCoordinates();
	}

	/**
	 * Pan initialization
	 * @param x normalized x
	 * @param y noramlized y
	 */
	public onPanInit(evt: any) {
		if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
			const mouseData = evt.data.getLocalPosition(this.viewer.stage);
			const { x, y } = this.viewer.normalize(mouseData);
			this.init.x = x;
			this.init.y = y;
			this.isPanning = true;
			this.viewer.stage.on('pointermove', this.onPan);
			this.viewer.stage.on('pointerupoutside', this.onPanUp);
		}
	}

	/**
	 * Pan renderer. No need to call render() as objects scaled are scaled along with the root.
	 * @param x normalized x
	 * @param y normalized y
	 */
	public onPan(evt: PIXIInteractionEvent) {
		if (this.isPanning) {
			const imgX = (evt.data.global.x - this.viewer.rx * this.viewer.s - this.viewer.sx) / this.viewer.stage.width * this.viewer.imageWidth;
			const imgY = (evt.data.global.y - this.viewer.ry * this.viewer.s - this.viewer.sy) / this.viewer.stage.height * this.viewer.imageHeight;
			evt.stopPropagation();
			const { x, y } = this.viewer.normalize({ x: imgX, y: imgY });
			const deltaX = 0.5 * (x - this.init.x) * this.viewer.rw;
			const deltaY = 0.5 * (y - this.init.y) * this.viewer.rh;
			this.viewer.rx += deltaX;
			this.viewer.ry += deltaY;
			this.viewer.stage.position.x = this.viewer.rx * this.viewer.s + this.viewer.sx;
			this.viewer.stage.position.y = this.viewer.ry * this.viewer.s + this.viewer.sy;
		}
	}

	/**
	 * Check root is positioned within view
	 */
	public onPanUp() {
		this.isPanning = false;
		this.viewer.stage.removeListener('pointermove', this.onPan);
		this.viewer.stage.removeListener('pointerupoutside', this.onPanUp);
		this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
		this.computeHitArea();
		this.notifyUpdate();
	}

	public notifyUpdate() {
		this.dispatchEvent(new CustomEvent('update-display', {
			detail: {
				s: this.viewer.s, // zoom
				rx: this.viewer.rx, // pan offset
				ry: this.viewer.ry, // pan offset
				sx: this.viewer.sx, // zoom offset
				sy: this.viewer.sy, // zoom offset
			}
		}))
	}

	public onEdgeMove(evt: PIXIInteractionEvent) {
		if (this.viewer.s <= 1) {
			return;
		}
		const { x, y } = evt.data.global;
		let transX = 0;
		let transY = 0;
		const threshX = 0.05 * this.viewer.canvasWidth;
		const threshY = 0.05 * this.viewer.canvasHeight;
		const speed = 0.05;
		if (this.viewer.canvasWidth - x < threshX && x < this.viewer.canvasWidth) {
			// panning to the right
			const paddRight = (this.viewer.rx * this.viewer.s + this.viewer.sx) + this.viewer.stage.width;
			if (paddRight > this.viewer.canvasWidth) {
				transX = -speed;
			}
		} else if (x < threshX && x > 0
			&& this.viewer.rx * this.viewer.s + this.viewer.sx < 0) {
			transX = speed;
		}
		if (this.viewer.canvasHeight - y < threshY && y < this.viewer.canvasHeight) {
			const paddTop = (this.viewer.ry * this.viewer.s + this.viewer.sy) + this.viewer.stage.height;
			if (paddTop > this.viewer.canvasHeight) {
				transY = -speed;
			}
		} else if (y < threshY && y > 0
			&& this.viewer.ry * this.viewer.s + this.viewer.sy < 0) {
			transY = speed;
		}
		this.viewer.rx += transX;
		this.viewer.ry += transY;
		const stageX = this.viewer.rx * this.viewer.s + this.viewer.sx;
		const stageY = this.viewer.ry * this.viewer.s + this.viewer.sy;
		// scale-independant minimal pixel distance between image to canvas border
		const thresh = 10;
		if (stageX + this.viewer.stage.width < thresh || stageY + this.viewer.stage.height < thresh
			|| this.viewer.canvasWidth - stageX < thresh || this.viewer.canvasHeight - stageY < thresh) {
			return;
		}
		this.viewer.stage.position.set(stageX, stageY);
		this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
			-this.viewer.stage.position.y / this.viewer.stage.scale.y,
			this.viewer.canvasWidth / this.viewer.stage.scale.x,
			this.viewer.canvasHeight / this.viewer.stage.scale.y);
	}
}

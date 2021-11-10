/**
 * Implementation of segmentation mask interaction manager.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { observable } from '@pixano/core';
import { rgbToHex } from '@pixano/core/lib/utils';
import { Renderer } from './renderer';
import { GraphicMask, GraphicPolygon } from './graphics';
import {
	unfuseId, fuseId, getPolygonExtrema,
	extremaUnion, convertIndexToDict, DensePolygon,
	getDensePolysExtrema, arraysMatch
} from './utils-mask';
import { Graphics as PIXIGraphics, Point } from 'pixi.js'
import { Controller } from './controller-base';


export enum EditionMode {
	ADD_TO_INSTANCE = 'add_to_instance',
	REMOVE_FROM_INSTANCE = 'remove_from_instance',
	NEW_INSTANCE = 'new_instance'
}

/**
 * Base controller for all mask controllers.
 * Construction arguments are partially the public class properties (renderer, gmask, ...).
 */
export class MaskController extends Controller {
	public renderer: Renderer;

	public gmask: GraphicMask;

	public _selectedId: {
		value: [number, number, number] | null
	};

	// graphic contour of selected instance
	public contours = new PIXIGraphics();

	// coordinates of contour polygons
	public densePolygons: DensePolygon[] = new Array();

	constructor(props: Partial<MaskController> = {}) {
		super(props);
		this.renderer = props.renderer || new Renderer();
		this.densePolygons = props.densePolygons || new Array();
		this.gmask = props.gmask || new GraphicMask();
		this._selectedId = props._selectedId || { value: null };
		this.renderer.stage.addChild(this.contours);
		this.onKeyDown = this.onKeyDown.bind(this);
	}

	activate() {
		this.contours.visible = true;
		if (this._selectedId.value) {// && !arraysMatch(this._selectedId.value, [0,0,0]
			this.densePolygons = getPolygons(this.gmask, this._selectedId.value);
			updateDisplayedSelection(this.contours, this.densePolygons);
			//this.select(this._selectedId.value);
		} else {
			this.densePolygons = [];
			this.contours.clear();
		}
		window.addEventListener('keydown', this.onKeyDown, false);
	}

	deactivate() {
		this.contours.visible = false;
		this.contours.clear();
		window.removeEventListener('keydown', this.onKeyDown, false);
	}

	/**
		 * On keyboard press (down)
		 * @param evt KeyboardEvent
		 */
	onKeyDown(evt: KeyboardEvent) {
		if (evt.key === 'Escape') {
			this.deselect();
		}
	}

	deselect() {
		if (this._selectedId.value) {
			this.densePolygons = [];
			updateDisplayedSelection(this.contours, this.densePolygons);
			this._selectedId.value = null;
			this.dispatchEvent(new CustomEvent('selection', { detail: null }));
		}
	}

	select(selectedId: [number, number, number]) {
		if (selectedId) {
			this._selectedId.value = selectedId;
			this.densePolygons = getPolygons(this.gmask, selectedId);
			updateDisplayedSelection(this.contours, this.densePolygons);
			this.dispatchEvent(new CustomEvent('selection', { detail: selectedId }));
		}
	}
}

/**
 * Basic interaction that selects region when clicked on it.
 * Construction arguments are partially the public class properties (renderer, gmask, ...).
 */
export class SelectController extends MaskController {

	constructor(props: Partial<SelectController> = {}) {
		super(props);
		this.onPointerDownSelectInstance = this.onPointerDownSelectInstance.bind(this);
	}

	activate() {
		super.activate();
		this.renderer.stage.on('mousedown', this.onPointerDownSelectInstance);
	}

	deactivate() {
		super.deactivate();
		this.renderer.stage.removeListener('mousedown', this.onPointerDownSelectInstance);
	}

	onPointerDownSelectInstance(evt: PIXIInteractionEvent) {
		const { x, y } = this.renderer.getPosition(evt.data);
		const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
		if (id[0] === 0 && id[1] === 0 && id[2] === 0) {
			this.deselect();
			return;
		}
		this.select(id);
	}

	onKeyDown(evt: KeyboardEvent) {
		super.onKeyDown(evt);
		if (evt.key === 'Delete') {
			if (this._selectedId.value) {
				this.gmask.deleteInstance(this._selectedId.value);
				this.dispatchEvent(new CustomEvent('delete', { detail: this._selectedId.value }));
			}
			this.deselect();
		}
	}
}

export class LockController extends SelectController {

	public lockType: "instance" | "class";

	constructor(props: Partial<LockController> = {}) {
		super(props);
		this.lockType = props.lockType || "class";
		this.onPointerDownLock = this.onPointerDownLock.bind(this);
	}

	activate() {
		super.activate();
		this.renderer.stage.on('mousedown', this.onPointerDownLock);
	}

	deactivate() {
		super.deactivate();
		this.renderer.stage.removeListener('mousedown', this.onPointerDownLock);
	}

	protected onPointerDownLock(evt: PIXIInteractionEvent) {
		const { x, y } = this.renderer.getPosition(evt.data);
		const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
		if (this.lockType === "instance") {
			const fId = fuseId(id);
			if (this.gmask.lockedInstances.has(fId)) {
				this.gmask.lockedInstances.delete(fId);
			} else {
				this.gmask.lockedInstances.add(fId);
			}
		} else if (this.lockType === "class") {
			const cls = id[2];
			const currentLockedClasses = [...this.gmask.lockedInstances].map((id) => unfuseId(id)[2]);
			if (currentLockedClasses.includes(cls)) {
				// remove all instances of class from the locked instances
				this.gmask.fusedIds.forEach((fId) => {
					if (unfuseId(fId)[2] == cls) {
						this.gmask.lockedInstances.delete(fId);
					}
				});
			} else {
				// add all instances of class to locked instances
				this.gmask.fusedIds.forEach((fId) => {
					if (unfuseId(fId)[2] == cls) {
						this.gmask.lockedInstances.add(fId);
					}
				});
			}
		}
		this.gmask.recomputeColor();
	}
}

/**
 * Add/edit instance to mask using polygon interaction.
 * Note: contrary to CreateController, you do not need to use EditionAddController or
 * EditionRemoveController to edit this new instance. Keyboard shortcuts specify which edition type you use.
 */
export class CreateBrushController extends MaskController {

	public _targetClass: { value: number };

	// temporary polygon
	protected tempPolygon: GraphicPolygon | null = null;

	private roi = new PIXIGraphics();

	private roiMatrix = new Float32Array();

	// roi ratio radius in pixels
	public roiRadius: number = -1;

	public nextId: {
		value: [number, number, number] | null
	};

	public _editionMode: { value: EditionMode };

	private isActive: boolean = false;

	constructor(props: Partial<CreateBrushController> = {}) {
		super(props);
		this._targetClass = props._targetClass || { value: 0 };
		this._editionMode = props._editionMode || { value: EditionMode.NEW_INSTANCE };
		this.nextId = props._selectedId || { value: null };
		this.renderer.stage.addChild(this.roi);
		this.onPointerMoveBrush = this.onPointerMoveBrush.bind(this);
		this.onPointerDownBrush = this.onPointerDownBrush.bind(this);
		this.onPointerUpBrush = this.onPointerUpBrush.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
	}

	activate() {
		super.activate();
		this.renderer.stage.on('mousedown', this.onPointerDownBrush);
		this.renderer.stage.on('pointermove', this.onPointerMoveBrush);
		this.renderer.stage.on('pointerupoutside', this.onPointerUpBrush);
		window.addEventListener('keyup', this.onKeyUp, false);
		this.initRoi();
		this.contours.visible = true;
		if (this._selectedId.value) {
			this.densePolygons = getPolygons(this.gmask, this._selectedId.value);
			updateDisplayedSelection(this.contours, this.densePolygons);
		} else {
			this.densePolygons = [];
			this.contours.clear();
		}
	}

	deactivate() {
		super.deactivate();
		this.renderer.stage.removeListener('mousedown', this.onPointerDownBrush);
		this.renderer.stage.removeListener('pointermove', this.onPointerMoveBrush);
		this.renderer.stage.removeListener('pointerupoutside', this.onPointerUpBrush);
		window.removeEventListener('keyup', this.onKeyUp, false);
		this.roi.cacheAsBitmap = false;
		this.roi.clear();
		this.roi.cacheAsBitmap = true;
	}

	/**
	 * Display temporary filled circle around cursor to indicate
	 * the brush pixels.
	 */
	initRoi() {
		if (this.roiRadius == -1) {//first call : we compute the optimal roiRadius regarding image size
			this.roiRadius = Math.trunc(Math.min(this.renderer.imageHeight, this.renderer.imageWidth) / 144);
		}
		this.roi.cacheAsBitmap = false;
		this.roi.clear();
		if (this._editionMode.value == EditionMode.NEW_INSTANCE) {
			let color = this.gmask.pixelToColor(...this.getNextTargetValue());
			let hex = rgbToHex(...color);
			this.roi.beginFill(parseInt(hex, 16));
		} else if (this._editionMode.value == EditionMode.ADD_TO_INSTANCE) {
			let color = this.gmask.pixelToColor(...this.getTargetValue());
			let hex = rgbToHex(...color);
			this.roi.beginFill(parseInt(hex, 16));
		} else if (this._editionMode.value == EditionMode.REMOVE_FROM_INSTANCE) {
			let color = this.gmask.pixelToColor(...this.getTargetValue());
			let hex = rgbToHex(...color);
			this.roi.lineStyle(1, parseInt(hex, 16), 1, 0.5, true);
		}
		this.roi.drawCircle(0, 0, this.roiRadius);
		this.roi.endFill();
		this.roi.x = this.renderer.mouse.x;
		this.roi.y = this.renderer.mouse.y;
		this.roi.cacheAsBitmap = true;

		// compute binary array
		this.roiMatrix = new Float32Array((2 * this.roiRadius) * (2 * this.roiRadius));
		this.roiMatrix.fill(0);
		const r2 = this.roiRadius * this.roiRadius;
		for (let x = 0; x < this.roiRadius * 2; x++) {
			for (let y = 0; y < this.roiRadius * 2; y++) {
				let dx = Math.abs(this.roiRadius - x - 0.5);
				let dy = Math.abs(this.roiRadius - y - 0.5);
				dx *= dx;
				dy *= dy;
				this.roiMatrix[x + this.roiRadius * 2 * y] = (dx + dy <= r2) ? 1 : 0;
			}
		}
	}

	/**
	 * Utility function to retrieve the selected mask value
	 * depending on the edition mode (new, add, remove).
	 */
	getTargetValue(): [number, number, number] {
		if (this._selectedId.value) if (this._selectedId.value.toString() != [-1, -1, -1].toString()) return this._selectedId.value;
		return [0, 0, 0];
	}

	/**
	 * Utility function to retrieve the mask value to next be created
	 */
	getNextTargetValue(): [number, number, number] {
		const cls = this.gmask.clsMap.get(this._targetClass.value);
		const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0] as [number, number];
		const value = [newId[0], newId[1], this._targetClass.value] as [number, number, number];
		return value;
	}

	/**
	 * Mouse press to start brushing
	 * @param evt PIXIInteractionEvent
	 */
	onPointerDownBrush(evt: PIXIInteractionEvent) {
		if (evt.data.button == 1) return;//middle button : nothing to do

		if (this._editionMode.value === EditionMode.NEW_INSTANCE) this._selectedId.value = this.getNextTargetValue(); //goto next value if new_instance mode is selected

		this.isActive = true;
		this.roi.x = this.renderer.mouse.x;
		this.roi.y = this.renderer.mouse.y;

		const fillType = (this._editionMode.value === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
		this.gmask.updateByMaskInRoi(this.roiMatrix,
			[this.roi.x - this.roiRadius, this.roi.y - this.roiRadius, this.roi.x + this.roiRadius, this.roi.y + this.roiRadius],
			this.getTargetValue(), fillType
		);
	}

	/**
	 * Mouse move when brushing
	 * @param evt PIXIInteractionEvent
	 */
	onPointerMoveBrush(evt: PIXIInteractionEvent) {
		const newPos = this.renderer.getPosition(evt.data);
		if (this.isActive) {
			const fillType = (this._editionMode.value === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
			this.gmask.updateByMaskInRoi(this.roiMatrix,
				[newPos.x - this.roiRadius, newPos.y - this.roiRadius, newPos.x + this.roiRadius, newPos.y + this.roiRadius],
				this.getTargetValue(), fillType
			);
			// filling space between successive mousepoints to enable easy surface painting
			//... assuming roiMatrix is a circle
			//... filling by a strait line even if the user describes a curve
			const alpha = Math.atan2((newPos.y - this.roi.y), (newPos.x - this.roi.x));
			const dy = Math.trunc(-Math.cos(alpha) * this.roiRadius);
			const dx = Math.trunc(Math.sin(alpha) * this.roiRadius);
			this.gmask.updateByPolygon([new Point(this.roi.x + dx, this.roi.y + dy), new Point(this.roi.x - dx, this.roi.y - dy), new Point(newPos.x - dx, newPos.y - dy), new Point(newPos.x + dx, newPos.y + dy)],
				this.getTargetValue(), fillType
			);
		}
		this.roi.x = newPos.x;
		this.roi.y = newPos.y;
	}

	/**
	 * Mouse release after brushing
	 */
	onPointerUpBrush() {
		if (this.isActive) {
			this.densePolygons = getPolygons(this.gmask, this._selectedId.value!);
			updateDisplayedSelection(this.contours, this.densePolygons);
			this.gmask.fusedIds.add(fuseId(this._selectedId.value!));
			this.dispatchEvent(new CustomEvent('update', { detail: this._selectedId.value }));
		}
		this.isActive = false;
		this.initRoi();
	}

	/**
	 * On keyboard press (down)
	 * @param evt KeyboardEvent
	 */
	onKeyDown(evt: KeyboardEvent) {
		super.onKeyDown(evt);
		if (evt.code == "NumpadAdd" || evt.key == "+") {
			this.roiRadius += 1;
			this.initRoi();
		} else if (evt.code == "NumpadSubtract" || evt.key == "-") {
			this.roiRadius = Math.max(this.roiRadius - 1, 1);
			this.initRoi();
		} else if (evt.shiftKey) {
			// shift down = union
			this._editionMode.value = EditionMode.ADD_TO_INSTANCE;
			this.initRoi();
		} else if (evt.ctrlKey) {
			// ctrl down = remove
			this._editionMode.value = EditionMode.REMOVE_FROM_INSTANCE;
			this.initRoi();
		}
	}
	/**
		 * On keyboard release (up)
		 * @param evt KeyboardEvent
		 */
	protected onKeyUp() {
		// shift or ctrl released = return to default = create
		this._editionMode.value = EditionMode.NEW_INSTANCE;
		this.initRoi();
	}
}


/**
 * Add new instance to mask using polygon interaction.
 * Note: use EditionAddController or EditionRemoveController to edit this new instance.
 */
export class CreatePolygonController extends MaskController {

	public _targetClass: { value: number };

	// show roi rectangle around cursor
	// as indicator of minimal annotation size.
	public showRoi: boolean = false;

	// roi ratio size w.r.t smaller side of image
	public roiRatio: { height: number, width: number } = { height: 0.15, width: 0.05 };

	///// Internal properties
	private roi = new PIXIGraphics();
	private isActive: boolean = false;

	// temporary polygon
	protected tempPolygon: GraphicPolygon | null = null;

	public _editionMode: { value: EditionMode };

	constructor(props: Partial<CreatePolygonController> = {}) {
		super(props);
		this._targetClass = props._targetClass || { value: 0 };
		this._editionMode = props._editionMode || { value: EditionMode.NEW_INSTANCE };
		this.renderer.stage.addChild(this.roi);
		this.renderer.stage.addChild(this.contours);
		this.onPointerMoveTempPolygon = this.onPointerMoveTempPolygon.bind(this);
		this.onPointerDownSelectionPolygon = this.onPointerDownSelectionPolygon.bind(this);
	}

	activate() {
		super.activate();
		this.renderer.stage.on('mousedown', this.onPointerDownSelectionPolygon);
		this.renderer.stage.on('pointermove', this.onPointerMoveTempPolygon);
		this.initRoi();
	}

	deactivate() {
		super.deactivate();
		this.renderer.stage.removeListener('mousedown', this.onPointerDownSelectionPolygon);
		this.renderer.stage.removeListener('pointermove', this.onPointerMoveTempPolygon);
		this.roi.clear();
		this.removeTempPolygon();
	}

	initRoi() {
		const minSize = Math.min(this.renderer.imageHeight, this.renderer.imageWidth);
		this.roi.lineStyle(1, 0xFFFFFF, 1, 0.5, true);
		this.roi.drawRect(-minSize * this.roiRatio.width / 2,
			-minSize * this.roiRatio.height / 2,
			minSize * this.roiRatio.width,
			minSize * this.roiRatio.height);
		this.roi.endFill();
		this.roi.x = this.renderer.mouse.x;
		this.roi.y = this.renderer.mouse.y;
		this.roi.visible = this.showRoi;
	}

	/**
	 * Mouse down to add node to polygon
	 * @param evt PIXIInteractionEvent
	 */
	onPointerDownSelectionPolygon(evt: PIXIInteractionEvent) {
		const newPos = this.renderer.getPosition(evt.data);
		const { x, y } = this.renderer.normalize(newPos);
		if (this.tempPolygon) {
			this.tempPolygon.popNode();
			this.tempPolygon.pushNode(x, y);
			this.tempPolygon.pushNode(x, y);
		} else {
			this.isActive = true;
			this.tempPolygon = new GraphicPolygon(observable({ id: '', color: 'red', geometry: { type: 'polygon', vertices: [] } }));
			this.tempPolygon.pushNode(x, y);
			this.tempPolygon.pushNode(x, y);
			this.tempPolygon.scaleX = this.renderer.imageWidth;
			this.tempPolygon.scaleY = this.renderer.imageHeight;
			this.renderer.stage.addChild(this.tempPolygon);
			this.roi.clear();
		}
	}

	/**
	 * Mouse move to place next polygon node
	 * @param evt PIXIInteractionEvent
	 */
	onPointerMoveTempPolygon(evt: PIXIInteractionEvent) {
		const newPos = this.renderer.getPosition(evt.data);
		if (this.tempPolygon) {
			const { x, y } = this.renderer.normalize(newPos);
			this.tempPolygon.popNode();
			this.tempPolygon.pushNode(x, y);
		} else {
			this.roi.x = newPos.x;
			this.roi.y = newPos.y;
		}
	}

	/**
	 * On keyboard press
	 * @param evt KeyboardEvent
	 */
	onKeyDown(evt: KeyboardEvent) {
		super.onKeyDown(evt);
		if (this.isActive && evt.key === 'Enter') {
			// End polygon creation
			if (this.tempPolygon) {
				this.tempPolygon.popNode();
				const vertices: any[] = new Array(0.5 * this.tempPolygon.data.geometry.vertices.length)
					.fill(0)
					.map(() => ({ x: 0, y: 0 }));
				this.tempPolygon.data.geometry.vertices.forEach((v, idx) => {
					if (idx % 2 === 0) vertices[Math.floor(idx / 2)].x = Math.round(v * this.renderer.imageWidth);
					else vertices[Math.floor(idx / 2)].y = Math.round(v * this.renderer.imageHeight);
				});
				this.tempPolygon.destroy();
				this.renderer.stage.removeChild(this.tempPolygon);
				this.tempPolygon = null;
				if (vertices.length > 2) {
					const fillType = (this._editionMode.value === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
					const newValue: [number, number, number] = this.getTargetValue();
					this.gmask.fusedIds.add(fuseId(newValue));
					let extrema = undefined;
					if (fillType != 'remove') {
						extrema = getPolygonExtrema(vertices);
						extrema = extremaUnion(extrema, getDensePolysExtrema(this.densePolygons));
					}
					this.gmask.updateByPolygon(vertices, newValue, fillType);
					this.densePolygons = getPolygons(this.gmask, newValue, extrema);
					updateDisplayedSelection(this.contours, this.densePolygons);
					this.dispatchEvent(new CustomEvent('update', { detail: this._selectedId.value }));
					this.initRoi();
				}
			}
		}
	}

	private removeTempPolygon() {
		if (this.tempPolygon) {
			this.tempPolygon.destroy();
			this.renderer.stage.removeChild(this.tempPolygon);
			this.tempPolygon = null;
			this.initRoi();
		}
	}

	deselect() {
		this.removeTempPolygon();
		super.deselect();
	}

	/**
	 * Utility function to retrieve the mask value to next be created
	 * depending on the edition mode (new, add, remove).
	 */
	getTargetValue(): [number, number, number] {
		if (this._editionMode.value == EditionMode.NEW_INSTANCE) {
			const cls = this.gmask.clsMap.get(this._targetClass.value);
			const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0] as [number, number];
			const value = [newId[0], newId[1], this._targetClass.value] as [number, number, number];
			this._selectedId.value = value;
			return value;
		} else if ((this._editionMode.value == EditionMode.ADD_TO_INSTANCE || this._editionMode.value == EditionMode.REMOVE_FROM_INSTANCE)
			&& this._selectedId.value) {
			return this._selectedId.value;
		}
		return [0, 0, 0];
	}
}


//// utils //////
/////////////////

/**
 * Returns all blobs contours of gmask whose id is equal to targetId. Basically
 * the same function a BlobExtraction but for fixed mask (gmask's one)
 * @param targetId the id of the blobs to be found
 * @param extrema (optional) the box research zone [xMin, yMin, xMax, yMax]
 */
export function getPolygons(mask: GraphicMask, targetId: [number, number, number], extrema?: number[]): DensePolygon[] {
	if (arraysMatch(targetId, [0, 0, 0])) {
		return [];
	}
	const blobs = mask.getBlobs(targetId, extrema);
	const newPolys: DensePolygon[] = [];
	for (const [, blob] of blobs) {
		blob.contours.forEach((contour) => {
			const arr = convertIndexToDict(contour.points, mask.canvas.width + 1);
			newPolys.push({ type: contour.type, data: arr });
		});
	}
	return newPolys;
}


export function updateDisplayedSelection(contours: PIXIGraphics, densePolygons: DensePolygon[]) {
	contours.clear();
	contours.lineStyle(1, 0X426eff, 1, 0.5, true);
	densePolygons.forEach((poly) => {
		drawDashedPolygon(poly.data, contours);
	});
}

/**
 * Draw dashed polygons to contour graphics
 * @param polygon
 */
export function drawDashedPolygon(polygon: Point[], contours: PIXIGraphics) {
	const dashed = false;
	if (dashed) {
		for (let i = 0; i < polygon.length; i++) {
			const p1 = polygon[i];
			let p2;
			if (i === polygon.length - 1) {
				p2 = polygon[0];
			}
			else {
				p2 = polygon[i + 1];
			}
			if (dashed) {
				contours.moveTo(0.5 * (p2.x + p1.x), 0.5 * (p2.y + p1.y));
			} else {
				contours.moveTo(p1.x, p1.y);
			}
			contours.lineTo(p2.x, p2.y);
		}
	} else {
		contours.drawPolygon(polygon);
	}
}

import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { observable } from '@pixano/core';
import { ShapesEditController, ShapeCreateController } from './controller';
import { GraphicPolygon } from './graphics';
import { ShapeData } from './types';
import { insertMidNode } from './utils';

/**
 * Polygon interaction controls for polygon edition
 */
export class PolygonsEditController extends ShapesEditController {

	private activeNodeIdx: number = -1;

	private isNodeTranslating: boolean = false;

	private isMidNodeTranslating: boolean = false;

	protected reclick: boolean = false;

	bindings() {
		super.bindings();
		this.onNodeDown = this.onNodeDown.bind(this);
		this.onNodeMove = this.onNodeMove.bind(this);
		this.onNodeUp = this.onNodeUp.bind(this);
		this.onMidNodeDown = this.onMidNodeDown.bind(this);
		this.onMidNodeMove = this.onMidNodeMove.bind(this);
		this.onMidNodeUp = this.onMidNodeUp.bind(this);
	}

	protected toggle(obj: GraphicPolygon): GraphicPolygon {
		if (!(obj instanceof GraphicPolygon)) {
			return obj;
		}
		if (obj.state === 'box') {
			obj.state = 'nodes';
		} else if (obj.state === 'nodes') {
			obj.state = 'nodes';
		}
		this.setShapeInteraction(obj);
		obj.draw();

		return obj;
	}

	doObjectSelection(shape: ShapeData, isShiftKey: boolean) {
		const changed = super.doObjectSelection(shape, isShiftKey);
		this.reclick = !changed;
		return changed;
	}

	onObjectUp(e: PIXIInteractionEvent) {
		super.onObjectUp(e);
		const obj = this.getGraphic((e as any).shape) as GraphicPolygon;
		if (obj && this.reclick && !this.changed) {
			this.reclick = false;
			this.toggle(obj);
		}
	}

	public setShapeInteraction(obj: GraphicPolygon | null = null) {
		super.setShapeInteraction(obj);
		if (obj) {
			if (obj.state === 'nodes') {
				obj.addNodeListener('pointerdown', (evt: any) => {
					// stop bubbling
					evt.stopPropagation();
					this.onNodeDown(evt);
				});
				obj.addMidnodeListener('pointerdown', (evt: any) => {
					// stop bubbling
					evt.stopPropagation();
					this.onMidNodeDown(evt);
				});
			} else if (obj instanceof GraphicPolygon) {
				// only polygonshape has interactive nodes
				// => multipolygons do not
				obj.removeNodeListeners();
			}
		}
	}

	public onNodeDown(evt: any) {
		const obj = this.getGraphic((evt as any).shape) as GraphicPolygon;
		if (evt.data.originalEvent.buttons !== 2) {
			this.activeNodeIdx = evt.nodeIdx;
			this.isNodeTranslating = true;
			this.changed = false;
			this.renderer.stage.on('pointermove', this.onNodeMove);
			this.renderer.stage.on('pointerupoutside', this.onNodeUp);
		} else {
			// remove node
			if (obj.data.geometry.vertices.length > 6) {
				obj.removeNode(evt.nodeIdx);
				this.emitUpdate();
			}
		}
	}

	public onNodeMove(evt: any) {
		if (this.isNodeTranslating) {
			const newPos = evt.data.getLocalPosition(this.renderer.stage);
			let xN = newPos.x / this.renderer.imageWidth;
			let yN = newPos.y / this.renderer.imageHeight;
			xN = Math.max(0, Math.min(1, xN));
			yN = Math.max(0, Math.min(1, yN));
			const obj = this.targetShapes.values().next().value;
			if (!this.changed) {
				this.changed = true;
			}
			if (obj) {
				obj.geometry.vertices[this.activeNodeIdx * 2] = xN;
				obj.geometry.vertices[this.activeNodeIdx * 2 + 1] = yN;
			}
		}
	}

	public onNodeUp(evt: any) {
		const obj = this.getGraphic((evt as any).shape) as GraphicPolygon;
		this.renderer.stage.removeListener('pointermove', this.onNodeMove);
		this.renderer.stage.removeListener('pointerupoutside', this.onNodeUp);
		this.isNodeTranslating = false;
		if (this.changed) {
			if (obj && !obj.isValid()) {
				obj.data.geometry.vertices = [...this.cachedShape!.geometry.vertices];
			} else {
				this.emitUpdate();
			}
			this.changed = false;
		}
	}

	public onMidNodeDown(evt: any) {
		if (evt.data.originalEvent.buttons !== 2) {
			this.activeNodeIdx = evt.nodeIdx;
			this.isMidNodeTranslating = true;
			this.renderer.stage.on('pointermove', this.onMidNodeMove);
			this.renderer.stage.on('pointerupoutside', this.onMidNodeUp);
		}
	}

	protected onMidNodeMove(evt: any) {
		if (this.isMidNodeTranslating) {
			const newPos = evt.data.getLocalPosition(this.renderer.stage);
			let xN = newPos.x / this.renderer.imageWidth;
			let yN = newPos.y / this.renderer.imageHeight;
			xN = Math.max(0, Math.min(1, xN));
			yN = Math.max(0, Math.min(1, yN));
			const obj = this.targetShapes.values().next().value as ShapeData;
			if (!this.changed) {
				// insert a new polygon node
				this.changed = true;
				obj.geometry.vertices = insertMidNode(obj.geometry.vertices, this.activeNodeIdx);
				this.activeNodeIdx = (this.activeNodeIdx + 1) % (0.5 * obj.geometry.vertices.length);
			}
			if (obj) {
				obj.geometry.vertices[this.activeNodeIdx * 2] = xN;
				obj.geometry.vertices[this.activeNodeIdx * 2 + 1] = yN;
			}
		}
	}

	protected onMidNodeUp(evt: any) {
		if (this.isMidNodeTranslating) {
			this.isMidNodeTranslating = false;
			if (this.changed) {
				const obj = this.getGraphic((evt as any).shape) as GraphicPolygon;
				if (obj && !obj.isValid()) {
					// cancel update;
					console.warn('Invalid polygon. Node creation cancelled.');
					obj.data.geometry.vertices = [...this.cachedShape!.geometry.vertices];
				} else if (obj) {
					this.emitUpdate();
				}
				this.changed = false;
			}
			this.renderer.stage.removeListener('pointermove', this.onMidNodeMove);
			this.renderer.stage.removeListener('pointerupoutside', this.onMidNodeUp);
		}
	}

}

/**
 * Inherit ShapeCreationController to handle polygon shapes.
 */
export class PolygonCreateController extends ShapeCreateController {

	// arguments
	public isOpenedPolygon: boolean;

	// internal properties
	private isDbClick: number = -1;

	constructor(props: Partial<PolygonCreateController> = {}) {
		super(props);
		this.isOpenedPolygon = props.isOpenedPolygon || false;
	}

	bindings() {
		super.bindings();
		this.onKeyDownCreate = this.onKeyDownCreate.bind(this);
	}

	/**
	 * Handle keyboard events
	 */
	protected onKeyDownCreate(event: KeyboardEvent) {
		switch (event.key) {
			case 'Enter': {
				// close path and create object
				this.isCreating = false;
				this.createPolygon();
				window.removeEventListener('keydown', this.onKeyDownCreate, false);
				break;
			}
			case 'Escape': {
				// abort creation of the shape
				this.isCreating = false;
				if (this.tmpShape) {
					this.renderer.stage.removeChild(this.tmpShape);
					this.tmpShape.destroy();
					this.tmpShape = null;
					break;
				}
				window.removeEventListener('keydown', this.onKeyDownCreate, false);
				break;
			}
			case 'Backspace': {
				// delete last node
				const obj = this.tmpShape as GraphicPolygon;
				if (obj.data.geometry.vertices.length > 6) {
					obj.popNode(false);
				}
			}
		}
	}

	protected onRootDown(evt: PIXIInteractionEvent) {
		if ((evt.data.originalEvent as PointerEvent).buttons !== 2) {
			this.isCreating = true;
			const m = this.renderer.getPosition(evt.data);
			const shape = this.tmpShape as GraphicPolygon;
			if (shape && this.isDbClick >= 0 && m.x === this.mouse.x && m.y === this.mouse.y) {
				this.isCreating = false;
				this.createPolygon();
				return;
			}
			this.mouse = m;
			const pt = this.renderer.normalize(m);
			if (shape) {
				clearTimeout(this.isDbClick);
				shape.pushNode(pt.x, pt.y);
				// time for double click detection
				this.isDbClick = window.setTimeout(() => { this.isDbClick = -1; }, 180);
			} else {
				// start new polygon
				this.dispatchEvent(new Event('creating-polygon'));
				const data = observable({
					id: 'tmp',
					geometry: {
						vertices: [pt.x, pt.y, pt.x, pt.y],
						type: 'polygon',
						isOpened: this.isOpenedPolygon
					},
					color: 'red',
				} as ShapeData);
				this.tmpShape = new GraphicPolygon(data) as GraphicPolygon;
				window.addEventListener('keydown', this.onKeyDownCreate, false);
				this.renderer.stage.addChild(this.tmpShape);
				this.tmpShape.scaleX = this.renderer.imageWidth;
				this.tmpShape.scaleY = this.renderer.imageHeight;
				this.tmpShape.draw();
			}
		}
	}

	onRootMove(evt: PIXIInteractionEvent) {
		super.onRootMove(evt);
		const m = this.renderer.getPosition(evt.data);
		if (m.x === this.mouse.x && m.y === this.mouse.y) {
			return;
		}
		this.mouse = m;
		const pt = this.renderer.normalize(m);
		if (this.isCreating) {
			const shape = this.tmpShape as GraphicPolygon;
			if (shape) {
				shape.data.geometry.vertices[shape.data.geometry.vertices.length - 1] = pt.y;
				shape.data.geometry.vertices[shape.data.geometry.vertices.length - 2] = pt.x;
			}
		}
	}

	public createPolygon() {
		const shape = this.tmpShape as GraphicPolygon;
		shape.popNode();
		if (!shape.isValid()) {
			console.warn('Invalid polygon. Polygon creation cancelled.');
			this.renderer.stage.removeChild(shape);
			shape.destroy();
			this.tmpShape = null;
			return;
		}
		shape.data.id = Math.random().toString(36);
		this._shapes.add(shape.data);
		this.renderer.stage.removeChild(shape);
		shape.destroy();
		this.tmpShape = null;
		this.emitCreate();
		this.emitSelection();// select the new created polygon
	}
}

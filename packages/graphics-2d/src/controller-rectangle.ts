import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { observable } from '@pixano/core';
import { ShapeCreateController } from './controller';
import { GraphicRectangle } from './graphics';


/**
 * Inherit ShapeCreateController to handle creation of rectangle shapes.
 */
export class RectangleCreateController extends ShapeCreateController {

	protected updated: boolean = false;

	protected onRootDown(evt: PIXIInteractionEvent) {
		// prevent shape creating when using middle or right mouse click
		const pointer = (evt.data.originalEvent as PointerEvent);
		if (pointer.buttons === 2 || pointer.buttons === 4) {
			return;
		}
		this.isCreating = true;
		this.mouse = this.renderer.getPosition(evt.data);
		const pt = this.renderer.normalize(this.mouse);
		const data = observable({
			id: 'tmp',
			color: 'red',
			geometry: {
				vertices: [pt.x, pt.y, pt.x, pt.y],
				type: 'rectangle'
			}
		});
		this.tmpShape = new GraphicRectangle(data) as GraphicRectangle;
		this.renderer.stage.addChild(this.tmpShape);
		this.tmpShape.scaleX = this.renderer.imageWidth;
		this.tmpShape.scaleY = this.renderer.imageHeight;
		this.tmpShape.draw();
	}

	onRootMove(evt: PIXIInteractionEvent) {
		super.onRootMove(evt);
		const mouse = this.renderer.getPosition(evt.data);
		if (mouse.x === this.mouse.x && mouse.y === this.mouse.y) {
			return;
		}
		this.mouse = mouse;
		if (this.isCreating) {
			const shape = this.tmpShape as GraphicRectangle;
			if (shape) {
				if (!this.updated) {
					this.updated = true;
				}
				const pt = this.renderer.normalize(this.mouse);
				shape.data.geometry.vertices[3] = pt.y;
				shape.data.geometry.vertices[2] = pt.x;
			}
		}
	}

	protected onRootUp() {
		if (this.isCreating) {
			this.isCreating = false;
			if (this.updated) {
				this.createRectangle();
			}
		}
	}

	public createRectangle() {
		this.updated = false;
		const shape = this.tmpShape as GraphicRectangle;
		const v: number[] = shape.data.geometry.vertices;
		const xmin = Math.min(v[0], v[2]);
		const xmax = Math.max(v[0], v[2]);
		const ymin = Math.min(v[1], v[3]);
		const ymax = Math.max(v[1], v[3]);
		shape.data.id = Math.random().toString(36).substring(7);
		shape.data.geometry.vertices = [xmin, ymin, xmax, ymax];
		this.renderer.stage.removeChild(shape);
		shape.destroy();
		this.tmpShape = null;
		this._shapes.add(shape.data);
		this.emitCreate();
		this.emitSelection();//select the new created rectangle
	}
}

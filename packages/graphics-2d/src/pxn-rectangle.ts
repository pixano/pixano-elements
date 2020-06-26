/**
 * Implementation of rectangle canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { ShapeCreateController } from './shapes-manager';
import { RectangleShape } from './shapes-2d';
import { observable } from '@pixano/core';

/**
 * Inherit Canvas2d to handle rectangles.
 */
@customElement('pxn-rectangle' as any)
export class Rectangle extends Canvas2d {
    constructor() {
        super();
        this.shManager.setController('create', new RectangleCreateController(this.renderer, this.shapes));
    }

    protected initShapeManagerListeners() {
        super.initShapeManagerListeners();
        this.shManager.addEventListener('creating-rectangle', () => {
            this.showTooltip('Drag and release to end rectangle.')
        });
    }
}

/**
 * Inherit ShapeCreateController to handle creation of rectangle shapes.
 */
export class RectangleCreateController extends ShapeCreateController {

    protected updated: boolean = false;

    protected onRootDown(evt: PIXI.InteractionEvent) {
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
        this.tmpShape = new RectangleShape(data) as RectangleShape;
        this.renderer.stage.addChild(this.tmpShape);
        this.tmpShape.scaleX = this.renderer.imageWidth;
        this.tmpShape.scaleY = this.renderer.imageHeight;
        this.tmpShape.draw();
    }

    onRootMove(evt: PIXI.InteractionEvent) {
        super.onRootMove(evt);
        const mouse = this.renderer.getPosition(evt.data);
        if (mouse.x === this.mouse.x && mouse.y === this.mouse.y) {
            return;
        }
        this.mouse = mouse;
        if (this.isCreating) {
            const shape = this.tmpShape as RectangleShape;
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
        const shape = this.tmpShape as RectangleShape;
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
        this.shapes.add(shape.data);
    }
}

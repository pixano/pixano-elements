/**
 * Implementation of rectangle canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { ShapesManager } from './shapes-manager';
import { RectangleShape } from './shapes-2d';
import { observable } from '@pixano/core';

/**
 * Inherit Canvas2d to handle rectangles.
 */
@customElement('pxn-rectangle' as any)
export class Rectangle extends Canvas2d {
    protected createShapeManager() {
        const shManager = new RectanglesManager(this.renderer, this.shapes);
        return shManager;
    }

    protected initShapeManagerListeners() {
        super.initShapeManagerListeners();
        this.shManager.on('creating-rectangle', () => {
            this.showTooltip('Drag and release to end rectangle.')
        });
    }
}

/**
 * Inherit ShapesManager to handle rectangle shapes.
 */
export class RectanglesManager extends ShapesManager {
    public setMode(mode: string) {
        super.setMode(mode);
        if (mode === 'create') {
            this.renderer.objects.forEach((o) => {
                this.applyMode(o);
            });
        }
    }

    protected onRootDown(evt: any) {
        super.onRootDown(evt);
        if (this.mode === 'create') {
            this.isCreating = true;
            const mouseData = evt.data.getLocalPosition(this.renderer.stage);
            this.mouseX = mouseData.x  / this.renderer.imageWidth;
            this.mouseY = mouseData.y  / this.renderer.imageHeight;
            this.mouseX = Math.max(Math.min(this.mouseX, 1), 0);
            this.mouseY = Math.max(Math.min(this.mouseY, 1), 0);
            const data = observable({
                id: 'tmp',
                color: 'red',
                geometry: {
                    vertices: [this.mouseX, this.mouseY, this.mouseX, this.mouseY],
                    type: 'rectangle'
                }
            });
            this.tmpShape = new RectangleShape(data) as RectangleShape;
            this.addChild(this.tmpShape);
            this.tmpShape.scaleX = this.renderer.imageWidth;
            this.tmpShape.scaleY = this.renderer.imageHeight;
            this.tmpShape.draw();
            this.renderer.stage.on('pointerupoutside', this.onRootUp.bind(this));
        }
    }

    protected onRootMove(evt: any) {
        super.onRootMove(evt);
        if (this.mode === 'create') {
            const mouseData = evt.data.getLocalPosition(this.renderer.stage);
            this.mouseX = mouseData.x  / this.renderer.imageWidth;
            this.mouseY = mouseData.y  / this.renderer.imageHeight;
            this.mouseX = Math.max(Math.min(this.mouseX, 1), 0);
            this.mouseY = Math.max(Math.min(this.mouseY, 1), 0);
            if (this.isCreating) {
                const shape = this.tmpShape as RectangleShape;
                if (shape) {
                    if (!this.updated) {
                        this.updated = true;
                    }
                    shape.data.geometry.vertices[3] = this.mouseY;
                    shape.data.geometry.vertices[2] = this.mouseX;
                }
            }
        }
    }

    protected onRootUp() {
        super.onRootUp();
        if (this.isCreating) {
            this.isCreating = false;
            if (this.updated) {
                this.updated = false;
                this.createRectangle();
            }
        }
    }

    public createRectangle() {
        const shape = this.tmpShape as RectangleShape;
        const v: number[] = shape.data.geometry.vertices;
        const xmin = Math.min(v[0], v[2]);
        const xmax = Math.max(v[0], v[2]);
        const ymin = Math.min(v[1], v[3]);
        const ymax = Math.max(v[1], v[3]);
        shape.data.id = Math.random().toString(36).substring(7);
        shape.data.geometry.vertices = [xmin, ymin, xmax, ymax];
        this.shapes.add(shape.data);
        this.removeChild(shape);
        shape.destroy();
        this.tmpShape = null;
    }
}

declare global {
    interface HTMLElementTagNameMap {
      'pxn-rectangle': Rectangle;
    }
}
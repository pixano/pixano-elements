/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import {
	Container as PIXIContainer, Graphics as PIXIGraphics,
	Point
} from 'pixi.js';

/**
 * Brush utils graphics used when drawing on a canvas.
 */
export class Brush extends PIXIContainer {

	public brushCursor: PIXIGraphics;

	public brushSize: number = 3;

	public isActive = false;

	private moveExtrema: number[] = [1000000, 1000000, 0, 0]; // [xMin, yMin, xMax, yMax]

	constructor() {
		super();
		this.brushCursor = new PIXIGraphics();
		this.brushCursor.cacheAsBitmap = true;
		this.brushCursor.beginFill(0xF5F);
		this.brushCursor.drawRect(0.0, 0.0, this.brushSize, this.brushSize);
		this.brushCursor.x = 1;
		this.brushCursor.y = 1;
		this.brushCursor.endFill();
	}

	public getPolygon(): Point[] {
		return [new Point(this.brushCursor.x, this.brushCursor.y),
		new Point(this.brushCursor.x + this.brushSize, this.brushCursor.y),
		new Point(this.brushCursor.x + this.brushSize, this.brushCursor.y + this.brushSize),
		new Point(this.brushCursor.x, this.brushCursor.y + this.brushSize)];
	}

	public updateMoveExtrema(x: number, y: number, width: number, height: number) {
		let [xMin, yMin, xMax, yMax] = this.moveExtrema;
		const newXMin = Math.max(0, Math.round(x - 0.5 * this.brushSize))
		const newYMin = Math.max(0, Math.round(y - 0.5 * this.brushSize))
		const newXMax = Math.min(width, Math.round(x + 0.5 * this.brushSize))
		const newYMax = Math.min(height, Math.round(y + 0.5 * this.brushSize))
		if (newXMin < xMin) xMin = newXMin;
		if (newXMax > xMax) xMax = newXMax;
		if (newYMin < yMin) yMin = newYMin;
		if (newYMax > yMax) yMax = newYMax;
		this.moveExtrema = [xMin, yMin, xMax, yMax];
	}

	public getMoveExtrema() {
		return this.moveExtrema;
	}

	public resetMoveExtrema() {
		this.moveExtrema = [1000000, 1000000, 0, 0];
	}
}
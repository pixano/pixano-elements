/**
 * Implementation of rectangle canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { RectangleCreateController } from './controller-rectangle';

/**
 * Inherit Canvas2d to handle rectangles.
 */
@customElement('pxn-rectangle' as any)
export class Rectangle extends Canvas2d {
	constructor() {
		super();
		this.setController('create', new RectangleCreateController({ ...this }));
		this.addEventListener('creating-rectangle', () => {
			this.showTooltip('Drag and release to end rectangle.')
		});
	}
}

/**
 * A sequence of pxn-rectangle
 */
@customElement('pxn-sequence-rectangle' as any)
export class SeqRectangle extends Rectangle {
	constructor() {
		super();
		console.log("OUAIIIIIIII");
	}
}
 
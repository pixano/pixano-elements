/**
 * Implementation of a classification canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2021)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas } from './pxn-canvas';

/**
 * Simple classification module. No controler is needed here.
 */
@customElement('pxn-classification' as any)
export class Classification extends Canvas {

	// annotations linked to this element
	public annotations: [];

	/**
	 * Copy this annotations into the clipboard
	 */
	onCopy(): string | void {
		// ... TODO
		// if (this.annotations.length) {
		// 	return JSON.stringify([...this.targetShapes]);
		// }
		return "onCopy";
	}

	/**
	 * Paste copied stuff
	 */
	onPaste(text: string) {
		console.warn("onPaste not implemented : ",text);
		// ... TODO
		// const value = JSON.parse(text);
		// if (value instanceof Array) {
		// 	value.forEach((v) => {
		// 		const shape = observable({
		// 			...v,
		// 			id: Math.random().toString(36).substring(7)
		// 		} as ShapeData)
		// 		// Add new object to the list of annotations
		// 		this.shapes.add(shape);
		// 		this.notifyCreate(shape);
		// 	})
		// }
	}

	protected onTabulation(): void { /* nothing to do */ }

	constructor() {
		super();
		this.annotations = [];
	}
}

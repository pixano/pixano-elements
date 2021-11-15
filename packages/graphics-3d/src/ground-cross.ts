/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';

/** A simple colored disk */
export class GroundCross extends THREE.Line implements Destructible {

	get material() {
		return super.material as THREE.MeshBasicMaterial;
	}

	set material(material) {
		super.material = material;
	}

	get color() {
		return this.material.color.getHex();
	}

	set color(value: number) {
		this.material.color.set(value);
	}

	constructor(color = 0xffffff, heading = 0) {
		const material = new THREE.LineBasicMaterial();
		const points = [
			new THREE.Vector3(- 100, 0, 0),
			new THREE.Vector3(100, 0, 0),
			new THREE.Vector3(0, -100, 0),
			new THREE.Vector3(0, 100, 0)
		];
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const idx = [0, 1, 2, 3];
		geometry.setIndex(idx);
		super(geometry, material);
		this.rotateZ(heading);
		this.color = color;
	}

	destroy() {
		this.geometry.dispose();
		this.material.dispose();
	}
}
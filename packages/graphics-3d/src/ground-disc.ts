/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';

/** A simple colored disk */
export class GroundDisc extends THREE.Mesh implements Destructible {

	getMaterial() {
		return super.material as THREE.MeshBasicMaterial;
	}

	setMaterial(material) {
		super.material = material;
	}

	get color() {
		return this.getMaterial().color.getHex();
	}

	set color(value: number) {
		this.getMaterial().color.set(value);
	}

	constructor(radius = 1., color = 0xffffff) {
		const geometry = new THREE.CircleGeometry(radius, 32);
		geometry.lookAt(new THREE.Vector3(0, 0, 1));
		const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
		super(geometry, material);
		this.color = color;
	}

	destroy() {
		this.geometry.dispose();
		this.getMaterial().dispose();
	}
}
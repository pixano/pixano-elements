/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';

/** An invisible plane used for raycasting on the ground. */
export class GroundPlot extends THREE.Mesh implements Destructible {

	constructor() {
		const geometry = new THREE.PlaneBufferGeometry(1000, 1000);
		const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide });
		// make sure the transparent ground does not write to the depthMap
		// so that it does not hide anything behind it (e.g.: box aopacity)
		material.depthWrite = false;
		super(geometry, material);
	}

	setZ(z: number) {
		this.position.set(0, 0, z);
	}

	destroy() {
		this.geometry.dispose();
		(this.material as THREE.MeshBasicMaterial).dispose();
	}
}
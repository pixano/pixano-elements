/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';
import { Cuboid } from './types';

/** Cuboid plot with edges and translucid faces. */
export class CuboidPlot extends THREE.Group implements Destructible {

	private colors: THREE.Color[];

	set color(c: number) {
		for (const color of this.colors) {
			color.set(c);
		}
	}

	constructor(cuboid: Cuboid) {
		super();
		const [x, y, z] = cuboid.position;
		const [l, w, h] = cuboid.size;
		const color = 0xffffff;
		const opacity = 0.0;
		const boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
		const boxMaterial = new THREE.MeshBasicMaterial(
			{ transparent: true, opacity });
		const box = new THREE.Mesh(boxGeometry, boxMaterial);
		this.add(box);
		const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
		const edgesMaterial = new THREE.LineBasicMaterial(
			{ linewidth: 1, color });
		const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
		this.add(edges);
		const triGeometry = new THREE.Geometry();
		triGeometry.vertices.push(
			new THREE.Vector3(0, -1 / 2, -1 / 2),
			new THREE.Vector3(1 / 2, 0, -1 / 2),
			new THREE.Vector3(1 / 2, 0, -1 / 2),
			new THREE.Vector3(0, 1 / 2, -1 / 2));
		const tri = new THREE.LineSegments(triGeometry, edgesMaterial);
		this.add(tri);
		this.rotateZ(cuboid.heading);
		this.scale.set(l, w, h);
		this.position.set(x, y, z);
		this.colors = [boxMaterial.color, edgesMaterial.color];
	}

	destroy() {
		this.traverse((child) => {
			if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			}
		});
	}
}
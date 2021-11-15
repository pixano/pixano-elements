/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible, ObservableSet, observe, unobserve, Observer } from '@pixano/core';
import { Cuboid } from './types';
import { PointCloudPlot } from './pointcloud-plot';
import { findPtsInBox } from './utils';

/** Continously updates the colors of pointcloud points inside cuboids. */
export class InnerPointsPainter implements Destructible {
	private pclPlot: PointCloudPlot;
	private innerPoints = new Map<Cuboid, Uint32Array>();
	private observers = new Map<object, Observer>();

	constructor(pclPlot: PointCloudPlot, cuboids: ObservableSet<Cuboid>) {
		this.pclPlot = pclPlot;

		const observer = observe(cuboids, (op, value?) => {

			if (op === "add") {
				this.innerPoints.set(value, new Uint32Array(0));
				this.updateInnerPoints(value);
				this.updateColorBuffer();

				const obs = observe(value, (cubOp) => {
					if (cubOp === "position" || cubOp === "size" || cubOp === "heading" || cubOp === "color") {
						this.updateInnerPoints(value);
						this.updateColorBuffer();
					}
				});
				this.observers.set(value, obs);
			} else if (op === "delete") {
				const colors = this.pclPlot.colors;
				for (const i of this.innerPoints.get(value)!) {
					colors[i * 3] = 1.;
					colors[i * 3 + 1] = 1.;
					colors[i * 3 + 2] = 1.;
				}
				this.innerPoints.delete(value);
				unobserve(value, this.observers.get(value)!);
				this.observers.delete(value);
				this.updateColorBuffer();
			} else if (op === "clear") {
				this.innerPoints.clear();
				for (const [target, o] of this.observers.entries()) {
					if (target !== cuboids) {
						unobserve(target, o);
					}
				}
				this.blankColorBuffer();
			}
		});
		this.observers.set(cuboids, observer);
	}

	updateInnerPoints(cuboid: Cuboid) {
		const oldInnerPoints = this.innerPoints.get(cuboid)!;
		const newInnerPoints = findPtsInBox(this.pclPlot.positionBuffer, cuboid);
		const colors = this.pclPlot.colors;
		for (const i of oldInnerPoints) {	// restore default colors
			colors[i * 3] = 1.;
			colors[i * 3 + 1] = 1.;
			colors[i * 3 + 2] = 1.;
		}
		this.innerPoints.set(cuboid, newInnerPoints);
		this.updateColorBuffer();
	}

	updateAllInnerPoints(cuboids: Set<Cuboid>) {
		cuboids.forEach(this.updateInnerPoints);
	}

	updateColorBuffer() {
		// Only the inner points are updated!
		const colors = this.pclPlot.colors;
		for (const [cuboid, innerPoints] of this.innerPoints.entries()) {
			if (cuboid.color) {
				const color = new THREE.Color(cuboid.color);
				for (const i of innerPoints) {
					colors[i * 3] = color.r;
					colors[i * 3 + 1] = color.g;
					colors[i * 3 + 2] = color.b;
				}
			}
		}
		this.pclPlot.colors = colors;
	}


	updateColorGround(groundPts: Uint32Array) {
		// Only the inner points are updated!
		const colors = this.pclPlot.colors;
		const groundColor = 65280;
		const color = new THREE.Color(groundColor);
		for (const i of groundPts) {
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g
			colors[i * 3 + 2] = color.b;
		}
		this.pclPlot.colors = colors;
	}
	blankColorBuffer() {
		const colors = this.pclPlot.colors;
		colors.fill(1.);
		this.pclPlot.colors = colors;
	}

	destroy() {
		for (const [target, observer] of this.observers.entries()) {
			unobserve(target, observer);
		}
	}
}

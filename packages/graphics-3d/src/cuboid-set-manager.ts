/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Destructible, ObservableSet, observe, unobserve, Observer } from '@pixano/core';
import { SceneView } from './scene-view';
import { Cuboid } from './types';
import { CuboidPlot } from './plots';

/**
 * Manages the plots for a list of editable cuboids.
 */
export class CuboidSetManager implements Destructible {

	private viewer: SceneView;

	readonly plotsMap = new Map<Cuboid, CuboidPlot>();

	readonly annotationsMap = new Map<CuboidPlot, Cuboid>();

	// to ensure proper disposal
	private observers = new Map<object, Observer>();

	// Setup
	constructor(viewer: SceneView, annotations: ObservableSet<Cuboid>) {
		const observer = observe(annotations, (op, value) => {
			if (op === "add") {
				this.createCuboidPlot(value);
			} else if (op === "delete") {
				this.deleteCuboidPlot(value);
			} else if (op === "clear") {
				for (const cuboid of this.plotsMap.keys()) {
					this.deleteCuboidPlot(cuboid);
				}
			}
		});
		this.observers.set(annotations, observer);

		for (const cuboid of annotations) {
			this.createCuboidPlot(cuboid);
		}
		this.viewer = viewer;
	}

	createCuboidPlot(cuboid: Cuboid) {
		const plot = new CuboidPlot(cuboid);
		plot.color = cuboid.color || 0xffffff;

		const observer = observe(cuboid, (prop: string, value: any) => {
			if (prop === "position") {
				plot.position.set(value[0], value[1], value[2]);
			}
			else if (prop === "size") {
				plot.scale.set(value[0], value[1], value[2]);
			}
			else if (prop === "heading") {
				plot.rotation.set(0, 0, value);
			} else if (prop === "color") {
				plot.color = value;
			}
		});
		this.observers.set(cuboid, observer);

		this.viewer.scene.add(plot);
		this.plotsMap.set(cuboid, plot);
		this.annotationsMap.set(plot, cuboid);
	}

	deleteCuboidPlot(cuboid: Cuboid) {
		const plot = this.plotsMap.get(cuboid)!;
		this.viewer.scene.remove(plot);
		plot.destroy();
		this.plotsMap.delete(cuboid);
		this.annotationsMap.delete(plot);
	}

	destroy() {
		for (const [target, observer] of this.observers) {
			unobserve(target, observer);
		}
		for (const cuboid of this.plotsMap.keys()) {
			this.deleteCuboidPlot(cuboid);
		}
	}
}
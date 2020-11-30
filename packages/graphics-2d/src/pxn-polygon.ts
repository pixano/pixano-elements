/**
 * Implementation of polygon canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property } from 'lit-element';
import { observable } from '@pixano/core';
import { Canvas2d } from './pxn-canvas-2d';
import { ShapeData } from './types';
import { PolygonCreateController, PolygonsEditController} from './controller-polygon';

/**
 * Inherit Canvas2d to handle polygons.
 */
@customElement('pxn-polygon' as any)
export class Polygon extends Canvas2d {

    @property({type: Boolean})
    public isOpenedPolygon: boolean = false;

    constructor() {
        super();
        // interactions with polygons (creation, edition)
        this.setController('create', new PolygonCreateController({ renderer: this.renderer, shapes: this.shapes, isOpenedPolygon: this.isOpenedPolygon }));
        this.setController('edit', new PolygonsEditController( { renderer: this.renderer, graphics: this.graphics, targetShapes: this.targetShapes, dispatchEvent: this.dispatchEvent }));
        this.addEventListener('creating-polygon', () => {
            this.showTooltip('Press Enter or double click to close polygon. Escape to cancel.')
        });
    }

    /**
     * Called on every property change
     * @param changedProperty
     */
    protected updated(changedProperties: any) {
        super.updated(changedProperties);
        if (changedProperties.has('isOpenedPolygon')) {
            (this.modes.create as PolygonCreateController).isOpenedPolygon = this.isOpenedPolygon;
        }
    }

    /**
     * Group selected shapes into a single
     * multi polygon.
     */
    merge() {
        function getFlattenVertices(s: ShapeData["geometry"]): number[][] {
            if (s.type === 'multi_polygon') {
                return s.mvertices!.map((v) => {
                    return v;
                }) as number[][];
            } else {
                return [s.vertices];
            }
        }

        if (this.targetShapes.size > 1) {
            const shapes = [...this.targetShapes];
            // split all selected groups
            const newAnn: ShapeData = shapes.reduce((prev, curr) => {
                // update geometry
                const currVertices = getFlattenVertices(curr.geometry);
                return {
                    ...prev,
                    id: prev.id + curr.id,
                    geometry: {
                        ...prev.geometry,
                        mvertices: [...prev.geometry.mvertices!, ...currVertices]
                    }
                };
            }, {
                ...shapes[0],
                geometry: {
                    mvertices: [],
                    vertices: [],
                    type: 'multi_polygon'
                }
            });
            this.shapes.add(observable(newAnn));
            shapes.forEach((s) => {
                this.shapes.delete(s);
            });
        }
    }

    /**
     * Split multi polygon
     * into multiple polygons.
     */
    split() {
        if (this.targetShapes.size === 1) {
            const shape = this.targetShapes.values().next().value;
            if (shape.geometry.type === 'multi_polygon') {
                shape.geometry.mvertices.forEach((v: number[], idx: number) => {
                    this.shapes.add(observable({
                        ...shape,
                        id: shape.id + String(idx),
                        geometry: {
                            mvertices: [],
                            vertices: v,
                            type: 'polygon'
                        }
                    }));
                });
                this.shapes.delete(shape);
            }
        }
    }
}

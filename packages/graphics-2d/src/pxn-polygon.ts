/**
 * Implementation of polygon canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

 import { customElement, property } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { ShapesEditController, ShapeCreateController } from './shapes-controllers';
import { PolygonShape, Decoration, Shape } from './shapes-2d';
import { Renderer } from './renderer';
import { ObservableSet, observable } from '@pixano/core';
import { ShapeData } from './types';
import { insertMidNode } from './utils';


/**
 * Polygon interaction controls for polygon edition
 */
class PolygonsEditController extends ShapesEditController {

    private activeNodeIdx: number = -1;

    private isNodeTranslating: boolean = false;

    private isMidNodeTranslating: boolean = false;

    protected reclick: boolean = false;

    public isOpenedPolygon: boolean = false;

    constructor(renderer: Renderer,
                graphics: Set<Shape>,
                targetShapes: ObservableSet<ShapeData>,
                dispatchEvent?: (event: Event) => boolean,
                isOpenedPolygon: boolean = false) {
        super(renderer, graphics, targetShapes, dispatchEvent);
        this.isOpenedPolygon = isOpenedPolygon;
    }

    bindings() {
        super.bindings();
        this.onNodeDown = this.onNodeDown.bind(this);
        this.onNodeMove = this.onNodeMove.bind(this);
        this.onNodeUp = this.onNodeUp.bind(this);
        this.onMidNodeDown = this.onMidNodeDown.bind(this);
        this.onMidNodeMove = this.onMidNodeMove.bind(this);
        this.onMidNodeUp = this.onMidNodeUp.bind(this);
    }

    protected toggle(obj: PolygonShape): PolygonShape {
        if (!(obj instanceof PolygonShape)) {
            return obj;
        }
        if (obj.state === Decoration.Box) {
            this.decorateTo(obj, Decoration.Nodes);
        } else if (obj.state === Decoration.Nodes) {
            this.decorateTo(obj, Decoration.Box);
        }
        obj.draw();
        return obj;
    }

    doObjectSelection(shape: ShapeData, isShiftKey: boolean) {
        const firstClick = super.doObjectSelection(shape, isShiftKey);
        this.reclick = !firstClick;
        return firstClick;
    }

    onObjectUp() {
        super.onObjectUp();
        const obj = this.getFirstGraphic() as PolygonShape;
        if (obj && this.reclick && !this.updated) {
            this.reclick = false;
            this.toggle(obj);
        }
    }

    public decorateTo(obj: PolygonShape, state: Decoration) {
        super.decorateTo(obj, state);
        if (state === Decoration.Nodes) {
            obj.addNodeListener('pointerdown', (evt: any) => {
                // stop bubbling
                evt.stopPropagation();
                this.onNodeDown(evt);
            });
            obj.addMidnodeListener('pointerdown', (evt: any) => {
                // stop bubbling
                evt.stopPropagation();
                this.onMidNodeDown(evt);
            });
        } else if (obj instanceof PolygonShape) {
            // only polygonshape has interactive nodes
            // => multipolygons do not
            obj.removeNodeListeners();
        }
    }

    public onNodeDown(evt: any) {
        const obj = this.getFirstGraphic() as PolygonShape;
        if (evt.data.originalEvent.buttons !== 2) {
            this.activeNodeIdx = evt.nodeIdx;
            this.isNodeTranslating = true;
            const node = obj.nodes[this.activeNodeIdx];
            this.updated = false;
            node.removeAllListeners('pointermove');
            node.removeAllListeners('pointerupoutside');
            node.on('pointermove', this.onNodeMove.bind(this));
            node.on('pointerupoutside', this.onNodeUp.bind(this));
        } else {
            // remove node
            if (obj.data.geometry.vertices.length > 6) {
                obj.removeNode(evt.nodeIdx);
                this.emitUpdate();
            }
        }
    }

    public onNodeMove(evt: any) {
        if (this.isNodeTranslating) {
            const newPos = evt.data.getLocalPosition(this.renderer.stage);
            let xN = newPos.x / this.renderer.imageWidth;
            let yN = newPos.y / this.renderer.imageHeight;
            xN = Math.max(0, Math.min(1, xN));
            yN = Math.max(0, Math.min(1, yN));
            const obj = this.targetShapes.values().next().value;
            if (!this.updated) {
                this.updated = true;
            }
            if (obj) {
                obj.geometry.vertices[this.activeNodeIdx * 2] = xN;
                obj.geometry.vertices[this.activeNodeIdx * 2 + 1] = yN;
            }
        }
    }

    public onNodeUp() {
        const obj = this.getFirstGraphic() as PolygonShape;
        const node = obj.nodes[this.activeNodeIdx];
        node.removeAllListeners('pointermove');
        node.removeAllListeners('pointerupoutside');
        this.isNodeTranslating = false;
        if (this.updated) {
            if (obj && !obj.isValid()) {
                obj.data.geometry.vertices = [...this.cachedShape!.geometry.vertices];
            } else {
                this.emitUpdate();
            }
            this.updated = false;
        }
    }

    public onMidNodeDown(evt: any) {
        if (evt.data.originalEvent.buttons !== 2) {
            this.activeNodeIdx = evt.nodeIdx;
            this.isMidNodeTranslating = true;
            this.renderer.stage.on('pointermove', this.onMidNodeMove);
            this.renderer.stage.on('pointerupoutside', this.onMidNodeUp);
        }
    }

    protected onMidNodeMove(evt: any) {
        if (this.isMidNodeTranslating) {
            const newPos = evt.data.getLocalPosition(this.renderer.stage);
            let xN = newPos.x / this.renderer.imageWidth;
            let yN = newPos.y / this.renderer.imageHeight;
            xN = Math.max(0, Math.min(1, xN));
            yN = Math.max(0, Math.min(1, yN));
            const obj = this.targetShapes.values().next().value as ShapeData;
            if (!this.updated) {
                // insert a new polygon node
                this.updated = true;
                obj.geometry.vertices = insertMidNode(obj.geometry.vertices, this.activeNodeIdx);
                this.activeNodeIdx = (this.activeNodeIdx + 1) % (0.5 * obj.geometry.vertices.length);
            }
            if (obj) {
                obj.geometry.vertices[this.activeNodeIdx * 2] = xN;
                obj.geometry.vertices[this.activeNodeIdx * 2 + 1] = yN;
            }
        }
    }

    protected onMidNodeUp() {
        if (this.isMidNodeTranslating) {
            this.isMidNodeTranslating = false;
            if (this.updated) {
                const obj = this.getFirstGraphic() as PolygonShape;
                if (obj && !obj.isValid()) {
                    // cancel update;
                    console.warn('Invalid polygon. Node creation cancelled.');
                    obj.data.geometry.vertices = [...this.cachedShape!.geometry.vertices];
                } else if (obj) {
                    this.emitUpdate();
                }
                this.updated = false;
            }
            this.renderer.stage.removeListener('pointermove', this.onMidNodeMove);
            this.renderer.stage.removeListener('pointerupoutside', this.onMidNodeUp);
        }
    }

}

/**
 * Inherit ShapeCreationController to handle polygon shapes.
 */
class PolygonCreateController extends ShapeCreateController {

    private isDbClick: number = -1;

    public isOpenedPolygon: boolean = false;

    constructor(renderer: Renderer, shapes: ObservableSet<ShapeData>, isOpenedPolygon: boolean){
        super(renderer, shapes);
        this.isOpenedPolygon = isOpenedPolygon
    }

    /**
     * Handle keyboard events
     */
    protected onKeyDownCreate = (event: KeyboardEvent) => {
        switch (event.key) {
            case 'Enter': {
                // close path and create object
                this.isCreating = false;
                this.createPolygon();
                window.removeEventListener('keydown', this.keyHandlers.CREATEDOWN, false);
                break;
            }
            case 'Escape': {
                // abort creation of the shape
                this.isCreating = false;
                if (this.tmpShape) {
                    this.renderer.stage.removeChild(this.tmpShape);
                    this.tmpShape.destroy();
                    this.tmpShape = null;
                    break;
                }
                window.removeEventListener('keydown', this.keyHandlers.CREATEDOWN, false);
                break;
            }
            case 'Backspace': {
                // delete last node
                const obj = this.tmpShape as PolygonShape;
                if (obj.data.geometry.vertices.length > 6) {
                    obj.popNode(false);
                }
            }
        }
    }

    protected keyHandlers = {
        CREATEDOWN: this.onKeyDownCreate.bind(this)
    }

    protected onRootDown(evt: PIXI.InteractionEvent) {
        if ((evt.data.originalEvent as PointerEvent).buttons !== 2) {
            this.isCreating = true;
            const m = this.renderer.getPosition(evt.data);
            const shape = this.tmpShape as PolygonShape;
            if (shape && this.isDbClick >= 0 && m.x === this.mouse.x && m.y === this.mouse.y) {
                this.createPolygon();
                return;
            }
            this.mouse = m;
            const pt = this.renderer.normalize(m);
            if (shape) {
                clearTimeout(this.isDbClick);
                shape.pushNode(pt.x, pt.y);
                // time for double click detection
                this.isDbClick = window.setTimeout(() => { this.isDbClick = -1; }, 180);
            } else {
                // start new polygon
                this.dispatchEvent(new Event('creating-polygon'));
                const data = observable({
                    id: 'tmp',
                    geometry: {
                        vertices: [pt.x, pt.y, pt.x, pt.y],
                        type: 'polygon'
                    },
                    color: 'red',
                    category: this.isOpenedPolygon ? 'opened' : 'closed'
                } as ShapeData);
                this.tmpShape = new PolygonShape(data) as PolygonShape;
                window.addEventListener('keydown', this.keyHandlers.CREATEDOWN, false);
                this.renderer.stage.addChild(this.tmpShape);
                this.tmpShape.scaleX = this.renderer.imageWidth;
                this.tmpShape.scaleY = this.renderer.imageHeight;
                this.tmpShape.draw();
            }
        }
    }

    onRootMove(evt: PIXI.InteractionEvent) {
        super.onRootMove(evt);
        const m = this.renderer.getPosition(evt.data);
        if (m.x === this.mouse.x && m.y === this.mouse.y) {
            return;
        }
        this.mouse = m;
        const pt = this.renderer.normalize(m);
        if (this.isCreating) {
            const shape = this.tmpShape as PolygonShape;
            if (shape) {
                shape.data.geometry.vertices[shape.data.geometry.vertices.length - 1] = pt.y;
                shape.data.geometry.vertices[shape.data.geometry.vertices.length - 2] = pt.x;
            }
        }
    }

    public createPolygon() {
        const shape = this.tmpShape as PolygonShape;
        shape.popNode();
        if (!shape.isValid()) {
            console.warn('Invalid polygon. Polygon creation cancelled.');
            this.renderer.stage.removeChild(shape);
            shape.destroy();
            this.tmpShape = null;
            return;
        }
        shape.data.id = Math.random().toString(36);
        this.shapes.add(shape.data);
        this.renderer.stage.removeChild(shape);
        shape.destroy();
        this.tmpShape = null;
    }
}


/**
 * Inherit Canvas2d to handle polygons.
 */
@customElement('pxn-polygon' as any)
export class Polygon extends Canvas2d {

    @property({type: Boolean})
    public isOpenedPolygon: boolean = false;

    constructor() {
        super();
        this.setController('create', new PolygonCreateController(this.renderer, this.shapes, this.isOpenedPolygon));
        this.setController('edit', new PolygonsEditController(this.renderer,
                                                    this.graphics, this.targetShapes, this.dispatchEvent.bind(this), this.isOpenedPolygon));
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
        (this.modes.edit as PolygonsEditController).isOpenedPolygon = this.isOpenedPolygon;
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

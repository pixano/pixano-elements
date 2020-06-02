/**
 * Implementation of graph canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { ShapeCreateController, ShapesEditController } from './shapes-manager';
import { GraphShape, Decoration } from './shapes-2d';
import { ShapeData } from './types';
import { observable } from '@pixano/core';

interface GraphSettings {
    edges: [number, number][];
    names: string[];
}

/**
 * Inherit Canvas2d to handle graph shapes (keypoints).
 */
@customElement('pxn-graph' as any)
export class Graph extends Canvas2d {

    private selectedNodeIdx: number = -1;

    /**
     * Set skeleton type (#keypoints, ).
     * Default value is: {
     *  edges: [[0,1], [0,2]],
     *  names: ['header', 'RFoot', 'LFoot']
     * }
     */
    set graphType(t: GraphSettings) {
        (this.shManager.modes['create'] as GraphCreateController).graphType = t;
    }

    get graphType() {
        return (this.shManager.modes['create'] as GraphCreateController).graphType;
    }

    constructor() {
        super();
        this.shManager.setController('create', new GraphCreateController(this.renderer, this.shapes))
                      .setController('edit', new GraphsUpdateController(this.renderer, this.shManager.graphics,
                                                                          this.shManager.targetShapes, this.shManager.dispatchEvent.bind(this.shManager)));
    }

    protected firstUpdated() {
        super.firstUpdated();
        window.addEventListener('keyup', (evt: KeyboardEvent) => {
            switch (evt.key) {
                case 'z': case 's':
                case 'd': case 'q': {
                    if (this.selectedNodeIdx !== -1 && this.shManager.targetShapes.size === 1 && !evt.ctrlKey) {
                        const obj = [...this.shManager.targetShapes][0];
                        if (obj) {
                            this.dispatchEvent(new CustomEvent('update', { detail: [obj.id] }));
                        }
                    }
                    break;
                }
            }
        })
        window.addEventListener('keydown', (evt: KeyboardEvent) => {
            switch (evt.key) {
                case 'z': case 's':
                case 'd': case 'q': {
                    if (this.selectedNodeIdx !== -1 && this.shManager.targetShapes.size === 1 && !evt.ctrlKey) {
                        const obj = [...this.shManager.targetShapes][0];
                        if (obj) {
                            // translate selected node
                            const xsign = evt.key === 'q' ? -1 : evt.key === 'd' ? 1 : 0;
                            const ysign = evt.key === 'z' ? -1 : evt.key === 's' ? 1 : 0;
                            obj.geometry.vertices[2 * this.selectedNodeIdx] += 0.005 * xsign;
                            obj.geometry.vertices[2 * this.selectedNodeIdx + 1] += 0.005 * ysign;
                        }
                    }
                    break;
                }
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9': {
                    this.selectedNodeIdx = Number(evt.key);
                    break;
                }
            }
        })
    }
}

class GraphsUpdateController extends ShapesEditController {

    protected activeNodeIdx: number = -1;

    protected isNodeTranslating: boolean = false;

    bindings() {
        super.bindings();
        this.onNodeDown = this.onNodeDown.bind(this);
    }

    public activate() {
        // handle update mode for each shape
        this.graphics.forEach((s) => {
            s.interactive = true;
            s.buttonMode = true;
            s.on('pointerdown', this.onObjectDown.bind(this));
            this.decorateTo(s as GraphShape, Decoration.None);
        });
        this.renderer.stage.interactive = true;
        this.renderer.stage.on('pointerdown', this.onRootDown);
        this.drawSelection();
    }

    drawSelection() {
        this.targetShapes.forEach((t) => {
            const shape = this.getTargetGraphic(t) as GraphShape;
            this.decorateTo(shape, Decoration.Nodes);
            this.renderer.bringToFront(shape);
            shape.draw();
        });
    }

    protected toggle(obj: GraphShape): GraphShape {
        if (!(obj instanceof GraphShape)) {
            return obj;
        }
        obj.draw();
        return obj;
    }

    public decorateTo(obj: GraphShape, state: Decoration) {
        obj.state = state;
        obj.onNode('pointerdown', this.onNodeDown);
        obj.draw();
    }

    onNodeDown(evt: PIXI.interaction.InteractionEvent) {
        const origEvt = evt.data.originalEvent as PointerEvent;
        const nodeIdx = (evt as any).nodeIdx;
        const shape = (evt as any).shape as ShapeData;
        if (!this.targetShapes.has(shape)) {
            this.targetShapes.clear();
            this.targetShapes.add(shape);
        }
        if (origEvt.buttons === 2) {
            const obj = this.targetShapes.values().next().value;
            obj.geometry.visibles![nodeIdx] = !obj.geometry.visibles![nodeIdx];
            this.emitUpdate();
        } else {   
            this.activeNodeIdx = nodeIdx;
            this.isNodeTranslating = true;
            const obj = this.getFirstGraphic() as GraphShape;
            const node = obj.nodes[this.activeNodeIdx];
            this.updated = false;
            node.removeAllListeners('pointermove');
            node.removeAllListeners('pointerupoutside');
            node.on('pointermove', this.onNodeMove.bind(this));
            node.on('pointerupoutside', this.onNodeUp.bind(this));
        } 
    }

    public onNodeMove(evt: PIXI.interaction.InteractionEvent) {
        if (this.isNodeTranslating) {
            const newPos = this.renderer.getPosition(evt.data);
            const {x, y} = this.renderer.normalize(newPos);
            const obj = this.targetShapes.values().next().value;
            if (!this.updated) {
                this.updated = true;
            }
            if (obj) {
                obj.geometry.vertices[this.activeNodeIdx * 2] = x;
                obj.geometry.vertices[this.activeNodeIdx * 2 + 1] = y;
            }
        }
    }

    public onNodeUp() {
        const obj = this.getFirstGraphic() as GraphShape;
        const node = obj.nodes[this.activeNodeIdx];
        node.removeAllListeners('pointermove');
        node.removeAllListeners('pointerupoutside');
        this.isNodeTranslating = false;
        if (this.updated) {
            this.updated = false;
            this.emitUpdate();
        }
    }
}

/**
 * Inherit ShapesManager to handle graph shapes.
 */
class GraphCreateController extends ShapeCreateController {

    public graphType: GraphSettings = {
        edges: [[0,1], [0,2]],
        names: ['header', 'RFoot', 'LFoot']
    }

    protected onRootDown(evt: PIXI.interaction.InteractionEvent) {
        this.isCreating = true;
        const mouse = this.renderer.getPosition(evt.data);
        const pos = this.renderer.normalize(mouse);
        const shape = this.tmpShape as GraphShape;
        if (shape) {
            shape.pushNode(pos.x, pos.y);
            const l = shape.data.geometry.vertices.length * 0.5;
            shape.data.geometry.edges = [...this.graphType.edges.filter(([e1, e2]) => e1 < l && e2 < l)];
        } else {
            const data = observable({
                id: 'tmp',
                geometry: {
                    vertices: [pos.x, pos.y],
                    edges: [],
                    visibles: [],
                    type: 'graph'
                }
            } as ShapeData);
            this.tmpShape = new GraphShape(data) as GraphShape;
            this.tmpShape.scaleX = this.renderer.imageWidth;
            this.tmpShape.scaleY = this.renderer.imageHeight;
            this.renderer.stage.addChild(this.tmpShape);
            this.tmpShape.draw();
        }
        // check length
        if (this.tmpShape && this.tmpShape!.data.geometry.vertices.length === this.graphType.names.length * 2) {
            this.createGraph();
        }
    }

    public createGraph() {
        const shape = this.tmpShape as GraphShape;
        shape.data.id = Math.random().toString(36).substring(7);
        this.shapes.add(shape.data);
        this.renderer.stage.removeChild(shape);
        shape.destroy();
        this.tmpShape = null;
    }
}
import { observable } from '@pixano/core';
import { ShapesEditController, ShapeCreateController } from './controller';
import { GraphicGraph } from './graphics';
import { ShapeData } from './types';
import { settings } from './graphic-graph';

export class GraphsUpdateController extends ShapesEditController {

    protected activeNodeIdx: number = -1;

    protected isNodeTranslating: boolean = false;

    bindings() {
        super.bindings();
        this.onNodeDown = this.onNodeDown.bind(this);
    }

    public activate() {
        // handle update mode for each shape
        this.graphics.forEach((s) => {
            if (s instanceof GraphicGraph) {
                s.interactive = true;
                s.buttonMode = true;
                s.on('pointerdown', this.onObjectDown.bind(this));
                this.decorateTo(s as GraphicGraph, 'none');
            }
        });
        this.renderer.stage.interactive = true;
        this.renderer.stage.on('pointerdown', this.onRootDown);
        this.drawSelection();
    }

    drawSelection() {
        this.targetShapes.forEach((t) => {
            const shape = this.getTargetGraphic(t) as GraphicGraph;
            this.decorateTo(shape, 'nodes');
            this.renderer.bringToFront(shape);
            shape.draw();
        });
    }

    protected toggle(obj: GraphicGraph): GraphicGraph {
        if (!(obj instanceof GraphicGraph)) {
            return obj;
        }
        obj.draw();
        return obj;
    }

    public decorateTo(obj: GraphicGraph, state: 'box' | 'contour' | 'nodes' | 'none') {
        if (obj instanceof GraphicGraph) {
            obj.state = state;
            obj.onNode('pointerdown', this.onNodeDown);
            obj.draw();
        }
    }

    onNodeDown(evt: PIXI.InteractionEvent) {
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
            const obj = this.getTargetGraphic((evt as any).shape) as GraphicGraph;
            const node = obj.nodes[this.activeNodeIdx];
            this.updated = false;
            node.removeAllListeners('pointermove');
            node.removeAllListeners('pointerupoutside');
            node.on('pointermove', this.onNodeMove.bind(this));
            node.on('pointerupoutside', this.onNodeUp.bind(this));
        }
    }

    public onNodeMove(evt: PIXI.InteractionEvent) {
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

    public onNodeUp(evt: any) {
        const obj = this.getTargetGraphic((evt as any).shape) as GraphicGraph;
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
export class GraphCreateController extends ShapeCreateController {

    protected onRootDown(evt: PIXI.InteractionEvent) {
        // prevent shape creating when using right mouse click
        const pointer = (evt.data.originalEvent as PointerEvent);
        if (pointer.buttons === 2) {
            return;
        }
        this.isCreating = true;
        const mouse = this.renderer.getPosition(evt.data);
        const pos = this.renderer.normalize(mouse);
        const shape = this.tmpShape as GraphicGraph;
        if (shape) {
            shape.pushNode(pos.x, pos.y);
            const l = shape.data.geometry.vertices.length * 0.5;
            shape.data.geometry.visibles![shape.data.geometry.visibles!.length-1] = pointer.buttons !== 4;
            shape.data.geometry.edges = [...settings.edges.filter(([e1, e2]) => e1 < l && e2 < l)];
        } else {
            const data = observable({
                id: 'tmp',
                geometry: {
                    vertices: [pos.x, pos.y],
                    edges: [],
                    visibles: [pointer.buttons !== 4],
                    type: 'graph'
                }
            } as ShapeData);
            this.tmpShape = new GraphicGraph(data) as GraphicGraph;
            this.tmpShape.scaleX = this.renderer.imageWidth;
            this.tmpShape.scaleY = this.renderer.imageHeight;
            this.renderer.stage.addChild(this.tmpShape);
            this.tmpShape.draw();
        }
        // check length
        if (this.tmpShape && this.tmpShape!.data.geometry.vertices.length === settings.vertexNames.length * 2) {
            this.createGraph();
        }
    }

    public createGraph() {
        const shape = this.tmpShape as GraphicGraph;
        shape.data.id = Math.random().toString(36).substring(7);
        this.shapes.add(shape.data);
        this.renderer.stage.removeChild(shape);
        shape.destroy();
        this.tmpShape = null;
    }
}

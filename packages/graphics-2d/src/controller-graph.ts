import { observable } from '@pixano/core';
import { Text as PIXIText, InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { ShapesEditController, ShapeCreateController } from './controller';
import { GraphicGraph } from './graphics';
import { ShapeData } from './types';
import { settings } from './graphic-graph';

export class GraphsUpdateController extends ShapesEditController {

    protected activeNodeIdx: number = -1;

    protected isNodeTranslating: boolean = false;

    protected nodeText: PIXIText = new PIXIText("", {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: '#ffffff',
        strokeThickness: 5,
    });

    bindings() {
        super.bindings();
        this.onNodeDown = this.onNodeDown.bind(this);
        this.onNodeHover = this.onNodeHover.bind(this);
        this.onNodeOut = this.onNodeOut.bind(this);
    }

    public activate() {
        // handle update mode for each shape
        this.graphics.forEach((s) => {
            if (s instanceof GraphicGraph) {
                s.interactive = true;
                s.buttonMode = true;
                s.on('pointerdown', this.onObjectDown.bind(this));
                s.state = 'none';
            }
        });
        this.renderer.stage.interactive = true;
        this.renderer.stage.addChild(this.nodeText);
        this.renderer.stage.on('pointerdown', this.onRootDown);
        this.drawDefaultShapesDecoration();
    }

    public deactivate() {
        super.deactivate();
        this.renderer.stage.removeChild(this.nodeText);
    }

    protected toggle(obj: GraphicGraph): GraphicGraph {
        if (!(obj instanceof GraphicGraph)) {
            return obj;
        }
        obj.draw();
        return obj;
    }

    public setShapeInteraction(obj: GraphicGraph | null = null) {
        super.setShapeInteraction(obj);
        if (obj instanceof GraphicGraph) {
            obj.onNode('pointerdown', this.onNodeDown);
            if (settings.showVertexName) {
                obj.onNode('pointerover', this.onNodeHover);
                obj.onNode('pointerout', this.onNodeOut);
            }
            obj.draw();
        }
    }

    onNodeDown(evt: PIXIInteractionEvent) {
        const origEvt = evt.data.originalEvent as PointerEvent;
        const nodeIdx = (evt as any).nodeIdx;
        const shape = (evt as any).shape as ShapeData;
        if (!this.targetShapes.has(shape)) {
            // select the belonging skeleton
            this.targetShapes.clear();
            this.targetShapes.add(shape);
        }
        if (origEvt.buttons === 2) {
            // set as non-visible
            const obj = this.targetShapes.values().next().value;
            obj.geometry.visibles![nodeIdx] = !obj.geometry.visibles![nodeIdx];
            this.emitUpdate();
        } else {
            this.activeNodeIdx = nodeIdx;
            this.isNodeTranslating = true;
            const obj = this.getGraphic((evt as any).shape) as GraphicGraph;
            const node = obj.nodes[this.activeNodeIdx];
            this.updated = false;
            node.removeAllListeners('pointermove');
            node.removeAllListeners('pointerupoutside');
            node.on('pointermove', this.onNodeMove.bind(this));
            node.on('pointerupoutside', this.onNodeUp.bind(this));
        }
    }

    public onNodeHover(evt: PIXIInteractionEvent) {
        const nodeIdx = (evt as any).nodeIdx;
        const x = (evt as any).shape.geometry.vertices[nodeIdx*2+0];
        const y = (evt as any).shape.geometry.vertices[nodeIdx*2+1];
        this.nodeText.text = settings.vertexNames[nodeIdx];
        this.nodeText.position.x = this.renderer.denormalizeX(x);
        this.nodeText.position.y = this.renderer.denormalizeY(y);
    }

    public onNodeOut() {
        this.nodeText.text = "";
    }

    public onNodeMove(evt: PIXIInteractionEvent) {
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
        const obj = this.getGraphic((evt as any).shape) as GraphicGraph;
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

    protected nodeText: PIXIText = new PIXIText("", {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: '#ffffff',
        strokeThickness: 5,
    });

    public activate() {
        super.activate();
        if (settings.showVertexName) {
            this.renderer.stage.addChild(this.nodeText);
            this.nodeText.text = settings.vertexNames[0];
            this.nodeText.position.x = this.renderer.mouse.x - this.nodeText.width - 10;
            this.nodeText.position.y = this.renderer.mouse.y - this.nodeText.height - 10;
        }
    }

    public deactivate() {
        super.deactivate();
        if (settings.showVertexName) {
            this.renderer.stage.removeChild(this.nodeText);
        }
    }

    protected onRootDown(evt: PIXIInteractionEvent) {
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
            this.nodeText.text = settings.vertexNames[l];
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
            this.nodeText.text = settings.vertexNames[1] || "";
        }
        // update node text position
        if (settings.showVertexName) {
            this.nodeText.position.x = this.renderer.mouse.x - this.nodeText.width - 10;
            this.nodeText.position.y = this.renderer.mouse.y - this.nodeText.height - 10;
        }
        // check length
        if (this.tmpShape && this.tmpShape!.data.geometry.vertices.length === settings.vertexNames.length * 2) {
            this.createGraph();
        }
    }

    onRootMove(evt: PIXIInteractionEvent) {
        super.onRootMove(evt);
        const mouse = this.renderer.getPosition(evt.data);
        // text position at top left + margin
        this.nodeText.position.x = mouse.x - this.nodeText.width - 10;
        this.nodeText.position.y = mouse.y - this.nodeText.height - 10;
    }

    public createGraph() {
        const shape = this.tmpShape as GraphicGraph;
        shape.data.id = Math.random().toString(36).substring(7);
        this.shapes.add(shape.data);
        this.renderer.stage.removeChild(shape);
        shape.destroy();
        this.tmpShape = null;
        this.emitCreate();
    }
}

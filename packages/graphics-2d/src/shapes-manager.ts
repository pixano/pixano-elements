/**
 * Custom implementation of 2d shapes manager.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Renderer } from './renderer';
import { Shape, DrawingCross } from './shapes-2d';
import { ObservableSet, observe } from '@pixano/core';
import { ShapeData } from './types';
import { dataToShape } from './adapter';
import { Decoration, CONTROL_POINTS } from './shapes-2d';
import { bounds } from './utils';
import { Controller } from './base-controller';

export class ShapesEditController extends Controller {

    public targetShapes: ObservableSet<ShapeData> = new ObservableSet();

    public graphics: Set<Shape> = new Set();

    public cachedShape: ShapeData | null = null;

    private activeObjectId: string = '';

    private isDragging: boolean = false;

    private isScaling: boolean = false;

    private _updated: boolean = false;

    private initialControlIdx: number = -1;

    private activeControlIdx: number = -1;

    protected renderer: Renderer;

    protected previousPos: {x: number, y: number} = {x: 0, y: 0};

    set updated(updated: boolean) {
        this._updated = updated;
        if (updated) {
            const obj = this.getShape(this.activeObjectId);
            if (obj) {
                this.cachedShape = JSON.parse(JSON.stringify(obj));
            }
        } else {
            this.cachedShape = null;
        }
    }

    get updated() {
        return this._updated;
    }

    constructor(renderer: Renderer,
                graphics: Set<Shape>,
                targetShapes: ObservableSet<ShapeData>,
                dispatchEvent?: (event: Event) => boolean) {
        super();
        this.renderer = renderer;
        this.graphics = graphics;
        this.targetShapes = targetShapes;
        if (dispatchEvent) {
            this.dispatchEvent = dispatchEvent;
        }
        observe(this.targetShapes, (prop: string, value?: any) => {
            switch(prop) {
                case 'set':
                case 'add': {
                    // add new selection
                    this.drawSelection();
                    break;
                }
                case 'delete': {
                    // remove selection
                    const o = this.getTargetGraphic(value as ShapeData)!;
                    this.decorateTo(o, Decoration.None);
                    o.draw();
                    break;
                }
                case 'clear': {
                    // remove all selection
                    this.graphics.forEach((o) => {
                        this.decorateTo(o, Decoration.None);
                        o.draw();
                    });
                    break;
                }
            }
        });
        // prebind methods
        this.onRootDown = this.onRootDown.bind(this);
        this.onObjectDown = this.onObjectDown.bind(this);
        this.onObjectMove = this.onObjectMove.bind(this);
        this.onObjectUp = this.onObjectUp.bind(this);
    }

    public drawSelection() {
        this.graphics.forEach((o) => {
            const decorator = !this.targetShapes.has(o.data) ? Decoration.None :
                                this.targetShapes.size > 2 ? Decoration.Contour : Decoration.Box;
            o.state = decorator;
            if (o.state === Decoration.Box) {
                o.controls.forEach((c, idx) => {
                    c.removeAllListeners();
                    c.on('pointerdown', (evt: any) => {
                        // stop bubbling
                        evt.stopPropagation();
                        evt.idx = idx;
                        this.onControlDown(evt);
                    });
                });
            }
            o.draw();
        });
        const sel = this.getFirstGraphic();
        if (sel) {
            this.renderer.bringToFront(sel);
        }
    }

    public decorateTo(obj: Shape, state: Decoration) {
        obj.state = state;
    }

    public activate() {
        // handle update mode for each shape
        this.graphics.forEach((s) => {
            s.interactive = true;
            s.buttonMode = true;
            s.on('pointerdown', this.onObjectDown);
        });
        this.drawSelection();
        this.renderer.stage.on('pointerdown', this.onRootDown);
    }

    public deactivate() {
        this.graphics.forEach((s) => {
            s.interactive = false;
            s.buttonMode = false;
            s.removeAllListeners('pointerdown');
        });
        this.renderer.stage.removeListener('pointerdown', this.onRootDown);
    }

    protected onRootDown(evt: any) {
        if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
            return;
        }
        if (this.targetShapes.size) {
            this.targetShapes.clear();
        }
    }

    onObjectDown(evt: PIXI.interaction.InteractionEvent) {

        // default behaviour is
        // cancel action if pointer is right or middle
        const button = (evt.data.originalEvent as PointerEvent).button;
        if ( button === 2 || button === 1) {
            return;
        }
        const shape = (evt as any).shape as ShapeData;
        const id = shape.id;
        this.previousPos = this.renderer.getPosition(evt.data);
        this.activeObjectId = id;
        this.isDragging = true;
        this.updated = false;
        // direct update of targets
        // should trigger related observer
        const obj = [...this.graphics].find((o) => o.data === shape);
        if (!obj) {
            return;
        }
        obj.on('pointermove', this.onObjectMove);
        obj.on('pointerupoutside', this.onObjectUp);
        this.doObjectSelection(shape, evt.data.originalEvent.shiftKey);
    }

    doObjectSelection(shape: ShapeData, isShiftKey: boolean = false): boolean {
        const beforeSelection = new Set(this.targetShapes);
        if (isShiftKey) {
            if (!this.targetShapes.has(shape)) {
                this.targetShapes.add(shape);
            } else {
                this.targetShapes.delete(shape);
            }
        } else if (!this.targetShapes.has(shape)) {
            this.targetShapes.clear();
            this.targetShapes.add(shape);
        }
        return this.targetShapes.size === 1 && beforeSelection.size === 0 &&
                [...this.targetShapes][0].id === [...this.targetShapes][0].id;
    }

    public onObjectMove(evt: PIXI.interaction.InteractionEvent) {
        const shape = (evt as any).shape;
        if ((evt.data.originalEvent as PointerEvent).pressure && this.isDragging && this.targetShapes.has(shape)) {
            const mouse = this.renderer.getPosition(evt.data);
            if (mouse.x === this.previousPos.x && mouse.y === this.previousPos.y) {
                return;
            }
            let dx = (mouse.x - this.previousPos.x) / this.renderer.imageWidth;
            let dy = (mouse.y - this.previousPos.y) / this.renderer.imageHeight;
            const bb = this.globalBounds();
            const dbottom = 1 - bb[3];
            const dtop = bb[1];
            const dright = 1 - bb[2];
            const dleft = bb[0];
            dy = Math.min(dbottom, dy);
            dy = Math.max(-dtop, dy);
            dx = Math.min(dright, dx);
            dx = Math.max(-dleft, dx);
            if (dx === 0 && dy === 0) {
                return;
            }
            if (!this.updated) {
                this.updated = true;
            }
            this.targetShapes.forEach(({geometry}) => {
                geometry.vertices = geometry.vertices
                                        .map((v, idx) => (idx%2) ? v + dy : v + dx);
            });
            this.previousPos = mouse;
        }
    }

    onObjectUp() {
        this.isDragging = false;
        const obj = this.getFirstGraphic();
        if (obj) {
            obj.removeAllListeners('pointermove');
            obj.removeAllListeners('pointerupoutside');
            obj.removeAllListeners('pointerup');
            if (this.updated) {
                this.emitUpdate();
            }
        }
    }

    protected emitUpdate() {
        this.emit('update', [...this.targetShapes].map((data) => data.id));
    }

    protected onControlDown(evt: PIXI.interaction.InteractionEvent) {
        this.isScaling = true;
        // @ts-ignore
        const idx = evt.idx;
        this.activeControlIdx = idx;
        this.updated = false;
        this.initialControlIdx = idx;
        const obj = this.getFirstGraphic();
        if (obj) {
            obj.controls[this.activeControlIdx].on('pointermove', (e: any) => {
                // stop bubbling
                e.stopPropagation();
                e.idx = this.activeControlIdx;
                this.onControlMove(e);
            });
            obj.controls[this.activeControlIdx].on('pointerupoutside', (e: any) => {
                // stop bubbling
                e.stopPropagation();
                this.onControlUp();
            });
        }
    }

    public onControlMove(evt: PIXI.interaction.InteractionEvent) {
        if (this.isScaling && (evt as any).idx === this.activeControlIdx) {
            if (!this.updated) {
                // this.emit('start-update', this.selectToJson());
                this.updated = true;
            }
            let xMin = 1;
            let xMax = 0;
            let yMin = 1;
            let yMax = 0;
            [xMin, yMin, xMax, yMax] = this.globalBounds();
            const mouseData = this.renderer.getPosition(evt.data);
            let xN = mouseData.x  / this.renderer.imageWidth;
            let yN = mouseData.y  / this.renderer.imageHeight;
            xN = Math.min(1, Math.max(0, xN));
            yN = Math.min(1, Math.max(0, yN));
            [xMin, yMin, xMax, yMax] = this.globalBounds();
            let rx = 1;
            let ry = 1;
            let anchorX = 1;
            let anchorY = 1;
            let ctrlX = 1;
            let ctrlY = 1;
            if (CONTROL_POINTS[this.activeControlIdx].x !== 0.5) {
                anchorX = xMin + Math.abs(CONTROL_POINTS[this.activeControlIdx].x - 1) * (xMax - xMin);
                ctrlX = xMin + CONTROL_POINTS[this.activeControlIdx].x * (xMax - xMin);
                rx = (xN - anchorX) / (ctrlX - anchorX);
            }
            if (CONTROL_POINTS[this.activeControlIdx].y !== 0.5) {
                anchorY = yMin + Math.abs(CONTROL_POINTS[this.activeControlIdx].y - 1) * (yMax - yMin);
                ctrlY = yMin + CONTROL_POINTS[this.activeControlIdx].y * (yMax - yMin);
                ry = (yN - anchorY) / (ctrlY - anchorY);
            }
            if (rx === 0 || ry === 0) {
                // forbid complete flattening of coordinates
                return;
            }
            if (rx < 0 || ry < 0) {
                // reverse coords order
                if (rx <= 0) {
                    this.activeControlIdx = CONTROL_POINTS.findIndex((c) => c.y === CONTROL_POINTS[this.activeControlIdx].y &&
                                                                            c.x === Math.abs(CONTROL_POINTS[this.activeControlIdx].x - 1));
                }
                if (ry <= 0) {
                    this.activeControlIdx = CONTROL_POINTS.findIndex((c) => c.x === CONTROL_POINTS[this.activeControlIdx].x &&
                                                                            c.y === Math.abs(CONTROL_POINTS[this.activeControlIdx].y - 1));
                }
            }
            this.targetShapes.forEach((data) => {
                if (rx < 0 || ry < 0) {
                    // reverse coords order
                    const coords = data.geometry.vertices;
                    let ch: number[] = [];
                    for (let index = coords.length - 2; index >= 0; index -= 2) {
                        const x = (rx < 0) ? coords[index] : coords[coords.length - 2 - index];
                        const y = (ry < 0) ? coords[index + 1] : coords[coords.length - 1 - index]
                        ch = ch.concat( [x, y] );
                    }
                    data.geometry.vertices = ch;
                }
                data.geometry.vertices = [...data.geometry.vertices.map((c, idx) => {
                    if (idx % 2 === 0 && rx !== 1) {
                        return (c - anchorX) * rx + anchorX;
                    } else if (idx % 2 === 1 && ry !== 1) {
                       return (c - anchorY) * ry + anchorY;
                    } else {
                        return c;
                    }
                })];
            });

        }
    }

    public onControlUp() {
        if (this.initialControlIdx !== -1) {
            const obj = this.getFirstGraphic();
            if (obj) {
                obj.controls[this.initialControlIdx].removeAllListeners('pointermove');
                obj.controls[this.initialControlIdx].removeAllListeners('pointerupoutside');
                this.isScaling = false;
                this.activeControlIdx = -1;
                this.initialControlIdx = -1;
                if (this.updated) {
                    this.updated = false;
                    this.emitUpdate();
                }
            }
        }
    }

    /**
     * Get global bounds of multiple shapes.
     */
    protected globalBounds() {
        let xMin = 1;
        let yMin = 1;
        let xMax = 0;
        let yMax = 0;
        this.targetShapes.forEach((data) => {
            const bb = bounds(data.geometry.vertices);
            if (bb[0] < xMin) { xMin = bb[0]; }
            if (bb[2] > xMax) { xMax = bb[2]; }
            if (bb[1] < yMin) { yMin = bb[1]; }
            if (bb[3] > yMax) { yMax = bb[3]; }
        });
        return [xMin, yMin, xMax, yMax];
    }

    protected getTargetGraphic(s: ShapeData) {
        return [...this.graphics].find((o) => o.data === s);
    }

    protected getFirstGraphic() {
        const s = this.targetShapes.values().next().value;
        if (s) {
            return [...this.graphics].find((o) => o.data === s);
        }
        return null;
    }

    protected getShape(id: string) {
        return [...this.targetShapes].find((s) => s.id === id);
    }
}

export abstract class ShapeCreateController extends Controller {

    protected renderer: Renderer;

    protected shapes: ObservableSet<ShapeData>;

    protected cross: DrawingCross = new DrawingCross();

    protected tmpShape: Shape | null = null;

    protected isCreating: boolean = false;

    protected mouse: {x: number, y: number} = {x: 0, y: 0};

    constructor(renderer: Renderer, shapes: ObservableSet<ShapeData>) {
        super();
        this.renderer = renderer;
        this.shapes = shapes;
        this.renderer.stage.addChild(this.cross);
        this.onRootMove = this.onRootMove.bind(this);
        this.onRootDown = this.onRootDown.bind(this);
        this.onRootUp = this.onRootUp.bind(this);
    }

    public activate() {
        this.cross.visible = true;
        const pos = this.renderer.mouse;
        this.cross.cx = pos.x;
        this.cross.cy = pos.y;
        this.cross.scaleX = this.renderer.imageWidth;
        this.cross.scaleY = this.renderer.imageHeight;
        this.cross.draw();
        this.renderer.stage.on('pointerdown', this.onRootDown);
        this.renderer.stage.on('pointermove', this.onRootMove);
        this.renderer.stage.on('pointerupoutside', this.onRootUp);
    }

    public deactivate() {
        this.cross.visible = false;
        const shape = this.tmpShape as Shape;
        if (shape) {
            this.renderer.stage.removeChild(shape);
            shape.destroy();
            this.tmpShape = null;
        }
        this.renderer.stage.removeListener('pointerdown', this.onRootDown);
        this.renderer.stage.removeListener('pointermove', this.onRootMove);
        this.renderer.stage.removeListener('pointerupoutside', this.onRootUp);
    }

    protected abstract onRootDown(evt: PIXI.interaction.InteractionEvent): void;

    onRootMove(evt: PIXI.interaction.InteractionEvent) {
        const pointer = (evt.data.originalEvent as PointerEvent);
        if (pointer.buttons === 2 || pointer.buttons === 4) {
            return;
        }
        const mouse = this.renderer.getPosition(evt.data);
        if (mouse.x === this.cross.cx && mouse.y === this.cross.cy) {
            return;
        }
        this.cross.scaleX = this.renderer.imageWidth;
        this.cross.scaleY = this.renderer.imageHeight;
        this.cross.cx = mouse.x;
        this.cross.cy = mouse.y;
        this.cross.draw();
    }

    protected onRootUp() {
        // Implement your own onRootUp method when inheriting.
    };
}

/**
 * Manage set of interactive shapes
 */
export class ShapesManager extends EventTarget {
    protected renderer: Renderer;

    protected shapes: ObservableSet<ShapeData>;

    public targetShapes: ObservableSet<ShapeData> = new ObservableSet();

    public graphics: Set<Shape> = new Set();

    public mode: string = 'edit';

    public modes: {
        [key: string]: Controller;
    };

    constructor(renderer: Renderer = new Renderer(),
                shapes: ObservableSet<ShapeData> = new ObservableSet()) {
        super();
        this.renderer = renderer;
        this.shapes = shapes;
        this.modes = {
            edit: new ShapesEditController(this.renderer, this.graphics, this.targetShapes, this.dispatchEvent.bind(this))
        }
        this.renderer.onImageSizeChange = () => {
            shapes.forEach((s: ShapeData) => {
                const obj = dataToShape(s);
                this.graphics.add(obj);
                obj.scaleX = this.renderer.imageWidth || 100;
                obj.scaleY = this.renderer.imageHeight || 100;
                this.renderer.labelLayer.addChild(obj);
                obj.draw();
            });
        }
        // new ShapeCreateController(this.renderer)
        // listen global changes on the set of shapes:
        // add a new shape, delete a shape, initialize set.
        observe(shapes, (prop: string, value?: any) => {
            switch(prop) {
                case 'set':
                case 'add': {
                    value = [value];
                    if (prop === 'set') {
                        // reset all objects at once
                        this.renderer.clearLabels();
                        this.graphics.clear();
                        value = shapes;
                    }
                    value.forEach((s: ShapeData) => {
                        const obj = dataToShape(s);
                        this.graphics.add(obj);
                        obj.scaleX = this.renderer.imageWidth || 100;
                        obj.scaleY = this.renderer.imageHeight || 100;
                        this.renderer.labelLayer.addChild(obj);
                        obj.draw();
                    });
                    // reapply controller to new objects
                    this.modes[this.mode].reset();
                    break;
                }
                case 'delete': {
                    const obj = [...this.graphics].find(({data}) => data === value);
                    if (obj) {
                        this.graphics.delete(obj);
                        this.renderer.labelLayer.removeChild(obj);
                        this.targetShapes.clear();
                    }
                    break;
                }
                case 'clear': {
                    this.renderer.clearLabels();
                    if (this.targetShapes.size) {
                        this.targetShapes.clear();
                    }
                    break;
                }
            }
        });
        this.modes[this.mode].activate();
    }

    public setController(mode: string, controller: Controller) {
        if (mode === this.mode && this.modes[mode]) {
            // remove active base controller
            this.modes[mode].deactivate();
            this.modes[mode] = controller;
            this.modes[mode].activate();
        } else {
            this.modes[mode] = controller;
        }
        return this;
    }

    /**
     * Handle new mode set:
     * 1. Reset canvas to default "mode-free" (no interaction)
     * 2. Apply interactions of new mode
     * @param mode string
     */
    public setMode(mode: string) {
        if (mode !== this.mode) {
            if (this.modes[this.mode]) {
                // Restore default state
                this.modes[this.mode].deactivate();
            }
            if (this.modes[mode]) {
                // Set up new mode state
                this.modes[mode].activate();
            }
            this.mode = mode;
        }
    }
}

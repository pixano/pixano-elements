/**
 * Custom implementation of 2d shapes manager.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { PxnRenderer } from './renderer-2d';
import { Shape, DrawingCross } from './shapes-2d';
import { ObservableSet, observe } from '@pixano/core';
import { ShapeData } from './types';
import { dataToShape } from './adapter';
import { Decoration, CONTROL_POINTS } from './shapes-2d';
import { Container as PIXIContainer } from 'pixi.js';
import { bounds } from './utils';

/**
 * Manage set of interactive shapes
 */
export class ShapesManager extends PIXIContainer {
    protected renderer: PxnRenderer;

    protected shapes: ObservableSet<ShapeData>;

    public targetShapes: ObservableSet<ShapeData> = new ObservableSet();

    protected mode: string = 'update';

    private startPosition: any = {};

    protected activeObjectId: string = '';

    private reclick: boolean = false;

    private isDragging: boolean = false;

    protected isCreating: boolean = false;

    private isScaling: boolean = false;

    private activeControlIdx: number = -1;

    private initialControlIdx: number = -1;

    protected _updated: boolean = false;

    protected mouseX: number = -1;

    protected mouseY: number = -1;

    protected tmpShape: Shape | null = null;

    protected cachedShape: ShapeData | null = null;

    protected cross: DrawingCross = new DrawingCross();

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

    constructor(renderer: PxnRenderer = new PxnRenderer(),
                shapes: ObservableSet<ShapeData> = new ObservableSet()) {
        super();
        this.renderer = renderer;
        this.renderer.stage.addChild(this);
        this.addChild(this.cross);
        this.renderer.stage.on('pointerdown', this.onRootDown.bind(this));
        this.renderer.stage.on('pointermove', this.onRootMove.bind(this));
        this.renderer.stage.on('pointerupoutside', this.onRootUp.bind(this));
        this.shapes = shapes;
        this.interactive = true;
        observe(this.targetShapes, () => {
            const selType = this.targetShapes.size <= 1 ? Decoration.Box: Decoration.Contour;
            // only one is selected
            this.renderer.objects.forEach((o) => {
                if (this.targetShapes.has(o.data)) {
                    o.state = selType;
                    if (selType === Decoration.Box) {
                        this.renderer.bringToFront(o);
                        o.controls.forEach((c, idx) => {
                            c.removeAllListeners();
                            c.on('pointerdown', (evt: any) => {
                                evt.stopPropagation();
                                evt.idx = idx;
                                this.onControlDown(evt);
                            });
                        });
                    }
                } else {
                    o.state = Decoration.None;
                }
                o.draw();
            });
        });
        // listen global changes on the set of shapes:
        // add a new shape, delete a shape, initialize set.
        observe(shapes, (prop: String, value?: any) => {
            switch(prop) {
                case 'add': {
                    const obj = dataToShape(<ShapeData>value);
                    this.renderer.add(obj);
                    this.applyMode(obj);
                    break;
                }
                case 'set': {
                    // set all objects at once
                    this.renderer.clearObjects();
                    shapes.forEach((s) => {
                        const obj = this.renderer.add(dataToShape(s));
                        this.applyInteractions(obj);
                    });
                    // console.timeEnd('t1');
                    break;
                }
                case 'delete': {
                    this.renderer.remove(<string>value.id);
                    this.targetShapes.clear();
                    break;
                }
                case 'clear': {
                    this.renderer.clearObjects();
                    this.targetShapes.clear();
                    break;
                }
            }
        });
        this.setMode(this.mode);
    }

    public setMode(mode: string) {
        this.mode = mode;
        if (this.mode === 'update') {
            this.cross.visible = false;
        } else if (this.mode === 'create') {
            this.targetShapes.clear();
            this.cross.visible = true;
            const pos = this.renderer.mouse;
            this.cross.cx = Math.max(0, Math.min(pos.x, this.renderer.imageWidth));
            this.cross.cy = Math.max(0, Math.min(pos.y, this.renderer.imageHeight));
            this.cross.scaleX = this.renderer.imageWidth;
            this.cross.scaleY = this.renderer.imageHeight;
            this.cross.draw();
        }
        this.renderer.objects.forEach((o) => {
            this.applyMode(o);
        });
    }

    protected applyInteractions(s: Shape) {
        if (this.mode === 'update') {
            s.interactive = true;
            s.on('pointerdown', this.onObjectDown.bind(this));
        }
    }

    protected applyMode(s: Shape) {
        if (this.mode === 'update') {
            s.interactive = true;
            s.removeAllListeners('pointerdown');
            s.on('pointerdown', this.onObjectDown.bind(this));
            // const selType = this.targetIds.size <= 1 ? Decoration.Box: Decoration.Contour;
            // only one is selected
            // this.renderer.objects.forEach((o) => {
            //     if (this.targetIds.has(o.data.id)) {
            //         o.state = selType;
            //         // box controllers
            //         if (selType === Decoration.Box) {
            //             o.controls.forEach((c, idx) => {
            //                 c.removeAllListeners();
            //                 c.on('pointerdown', (evt: any) => {
            //                     evt.stopPropagation();
            //                     evt.idx = idx;
            //                     this.onControlDown(evt);
            //                 });
            //             });
            //         }
            //     } else {
            //         o.state = Decoration.None;
            //     }
            //     // o.draw();
            // });
        } else if (this.mode === 'create') {
            s.interactive = false;
            s.removeAllListeners('pointerdown');
        }
    }

    public getShape(id: string) {
        return [...this.shapes].find((s) => s.id === id);
    }

    protected onRootDown(evt: any) {
        if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
            return;
        }
        if (this.mode === 'update') {
            if (this.targetShapes.size) {
                this.targetShapes.clear();
            }
        }
    }

    protected onRootMove(evt: any) {
        if (evt.data.originalEvent.buttons === 2 || evt.data.originalEvent.buttons === 4) {
            return;
        } else if (this.mode === 'create') {
            const pos = evt.data.getLocalPosition(this.renderer.stage);
            this.cross.scaleX = this.renderer.imageWidth;
            this.cross.scaleY = this.renderer.imageHeight;
            this.cross.cx = Math.min(this.renderer.imageWidth, Math.max(0, Math.round(pos.x)));
            this.cross.cy = Math.min(this.renderer.imageHeight, Math.max(0, Math.round(pos.y)));
            this.cross.draw();
        }
    }

    protected onRootUp() {
    }

    protected onObjectDown(evt: PIXI.interaction.InteractionEvent) {
        // default behaviour is
        // cancel action if pointer is right or middle
        if ((<PointerEvent>evt.data.originalEvent).button === 2 || (<PointerEvent>evt.data.originalEvent).button === 1) {
            return;
        }
        if (this.mode === 'update') {
            const shape = (<any>evt).shape as ShapeData;
            const id = shape.id;
            this.startPosition = evt.data.getLocalPosition(this.renderer.stage);
            this.activeObjectId = id;
            this.isDragging = true;
            this.updated = false;
            // direct update of targets
            // should trigger related observer
            const obj = this.renderer.objects.find((o) => o.data.id === shape.id)!;
            obj.on('pointermove', this.onObjectMove.bind(this));
            obj.on('pointerupoutside', this.onObjectUp.bind(this));
            if (this.targetShapes.has(shape) && !evt.data.originalEvent.shiftKey) {
                
                // already contains target
                if (this.targetShapes.size === 1) {
                    this.reclick = true;
                }
                return;
            } else if (evt.data.originalEvent.shiftKey) {
                if (!this.targetShapes.has(shape)) {
                    this.targetShapes.add(shape);
                } else {
                    this.targetShapes.delete(shape);
                }
            } else if (!this.targetShapes.has(shape)) {
                this.reclick = false;
                this.targetShapes.set([shape]);
            }
        }
    }

    public onObjectMove(evt: PIXI.interaction.InteractionEvent) {
        if (this.mode === 'update') {
            const shape = (<any>evt).shape;
            const id = shape.id;
            if ((<PointerEvent>evt.data.originalEvent).pressure && this.isDragging && this.activeObjectId === id) {
                const newPos = evt.data.getLocalPosition(this.renderer.stage);
                let dxN = (newPos.x - this.startPosition.x) / this.renderer.imageWidth;
                let dyN = (newPos.y - this.startPosition.y) / this.renderer.imageHeight;
                const bounds = this.globalBounds();
                const dbottom = 1 - bounds[3];
                const dtop = bounds[1];
                const dright = 1 - bounds[2];
                const dleft = bounds[0];
                dyN = Math.min(dbottom, dyN);
                dyN = Math.max(-dtop, dyN);
                dxN = Math.min(dright, dxN);
                dxN = Math.max(-dleft, dxN);
                if (!this.updated) {
                    // remove temporarily interaction & decoration from other scene objects
                    this.renderer.objects.forEach((o) => { if (!this.targetShapes.has(o.data)) o.interactive = false; });
                    this.updated = true;
                }
                this.renderer.objects.forEach((o) => { if (this.targetShapes.has(o.data)) o.translate(dxN, dyN); });
                this.startPosition = newPos;
            }
        }
    }

    protected toggle(obj: Shape) {
        return obj;
    }

    protected getFirstTarget() {
        return this.targetShapes.values().next().value;
    }

    protected getFirstTargetObject() {
        const s = this.targetShapes.values().next().value;
        if (s) {
            return this.renderer.objects.find((o) => o.data.id === s.id);
        }
        return null;
    }

    private onObjectUp() {
        if (this.mode === 'update') {
            this.isDragging = false;
            const obj = this.getFirstTargetObject();
            if (obj && this.reclick && !this.updated) {
                this.reclick = false;
                this.toggle(obj);
            }
            // this.activeObjectId = '';
            if (obj) {
                obj.removeAllListeners('pointermove');
                obj.removeAllListeners('pointerupoutside');
                this.renderer.objects.forEach((o) => { if (!this.targetShapes.has(o.data)) o.interactive = true; });
                if (this.updated) {
                    this.updated = false;
                    this.emit('update', [...this.targetShapes].map((t) => t.id));
                }
            }
        }
    }

    protected onControlDown(evt: PIXI.interaction.InteractionEvent) {
        this.isScaling = true;
        //@ts-ignore
        const idx = evt.idx;
        this.activeControlIdx = idx;
        this.updated = false;
        this.initialControlIdx = idx;
        const obj = this.getFirstTargetObject();
        if (obj) {
            obj.controls[this.activeControlIdx].on('pointermove', (e: any) => {
                e.stopPropagation();
                e.idx = this.activeControlIdx;
                this.onControlMove(e);
            });
            obj.controls[this.activeControlIdx].on('pointerupoutside', (e: any) => {
                e.stopPropagation();
                this.onControlUp();
            });
        }
    }

    public onControlMove(evt: any) {
        if (this.isScaling && evt.idx === this.activeControlIdx) {
            if (!this.updated) {
                // this.emit('start-update', this.selectToJson());
                this.updated = true;
            }
            let xMin = 1;
            let xMax = 0;
            let yMin = 1;
            let yMax = 0;
            [xMin, yMin, xMax, yMax] = this.globalBounds();
            const mouseData = evt.data.getLocalPosition(this.renderer.stage);
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
            if (CONTROL_POINTS[this.activeControlIdx].x != 0.5) {
                anchorX = xMin + Math.abs(CONTROL_POINTS[this.activeControlIdx].x - 1) * (xMax - xMin);
                ctrlX = xMin + CONTROL_POINTS[this.activeControlIdx].x * (xMax - xMin);
                rx = (xN - anchorX) / (ctrlX - anchorX);
            }
            if (CONTROL_POINTS[this.activeControlIdx].y != 0.5) {
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
                    this.activeControlIdx = CONTROL_POINTS.findIndex((c) => c.y == CONTROL_POINTS[this.activeControlIdx].y &&
                                                                            c.x == Math.abs(CONTROL_POINTS[this.activeControlIdx].x - 1));
                }
                if (ry <= 0) {
                    this.activeControlIdx = CONTROL_POINTS.findIndex((c) => c.x == CONTROL_POINTS[this.activeControlIdx].x &&
                                                                            c.y == Math.abs(CONTROL_POINTS[this.activeControlIdx].y - 1));
                }
            }
            this.targetShapes.forEach((obj: ShapeData) => {
                if (rx < 0 || ry < 0) {
                    // reverse coords order
                    const coords = obj.geometry.vertices;
                    let ch: number[] = [];
                    for (let index = coords.length - 2; index >= 0; index -= 2) {
                        const x = (rx < 0) ? coords[index] : coords[coords.length - 2 - index];
                        const y = (ry < 0) ? coords[index + 1] : coords[coords.length - 1 - index]
                        ch = ch.concat( [x, y] );
                    }
                    obj.geometry.vertices = ch;
                }
                obj.geometry.vertices = [...obj.geometry.vertices.map((c, idx) => {
                    if (idx % 2 === 0 && rx != 1) {
                        return (c - anchorX) * rx + anchorX;
                    } else if (idx % 2 === 1 && ry != 1) {
                       return (c - anchorY) * ry + anchorY;
                    } else {
                        return c;
                    }
                })];
            });

        }
    }

    public onControlUp() {
        if (this.initialControlIdx != -1) {
            const obj = this.getFirstTargetObject();
            if (obj) {
                obj.controls[this.initialControlIdx].removeAllListeners('pointermove');
                obj.controls[this.initialControlIdx].removeAllListeners('pointerupoutside');
                this.isScaling = false;
                this.activeControlIdx = -1;
                this.initialControlIdx = -1;
                if (this.updated) {
                    this.updated = false;
                    this.emit('update', [...this.targetShapes].map((t) => t.id));
                }
            }
        }
    }

    /**
     * Get global bounds of multiple shapes.
     */
    private globalBounds() {
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
}
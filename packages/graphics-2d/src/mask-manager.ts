/**
 * Implementation of segmentation mask handler.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Renderer } from './renderer';
import { GMask, PolygonShape } from './shapes-2d';
import { unfuseId, fuseId, getPolygonExtrema,
         extremaUnion, convertIndexToDict, DensePolygon,
         getDensePolysExtrema } from './mask-utils';
import { Graphics as PIXIGraphics, Point} from 'pixi.js'
import { observable } from '@pixano/core';
import { Controller } from './base-controller';

export enum EditionMode {
    ADD_TO_INSTANCE = 'add_to_instance',
    REMOVE_FROM_INSTANCE = 'remove_from_instance'
}

export class EditionController extends Controller {

    protected renderer: Renderer;

    protected gmask: GMask;

    public contours = new PIXIGraphics();

    // temporary polygon
    public tempPolygon: PolygonShape | null = null;

    private densePolygons: DensePolygon[] = new Array();

    protected selectedId: {
        value: [number, number, number] | null
    };

    public send: (event: Event) => boolean;

    public mode: EditionMode = EditionMode.ADD_TO_INSTANCE;

    constructor(renderer: Renderer, gmask: GMask, selectedId: {value: [number, number, number] | null},
                send: (event: Event) => boolean, contours: PIXIGraphics) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.selectedId = selectedId;
        this.send = send;
        this.pointerHandlers = {
            CREATE_POLYGON: this.onPointerDownSelectionPolygon.bind(this),
            TEMP_POLYGON: this.onPointerMoveTempPolygon.bind(this)
        };
        this.keyHandlers = {
            KEY_POLYGON: this.onKeyDown.bind(this)
        };
        this.contours = contours;
    }

    activate() {
        this.renderer.stage.on('mousedown', this.pointerHandlers.CREATE_POLYGON);
        this.renderer.stage.on('pointermove', this.pointerHandlers.TEMP_POLYGON);
        this.contours.visible = true;
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.pointerHandlers.CREATE_POLYGON);
        this.renderer.stage.removeListener('pointermove', this.pointerHandlers.TEMP_POLYGON);
        this.contours.visible = false;
    }

    protected onKeyDown(evt: KeyboardEvent) {
        if (!this.selectedId.value) {
            // nothing to edit
            return;
        }
        if (evt.key === 'Enter') {
            if (this.tempPolygon) {
                this.tempPolygon.popNode();
                const vertices: any[] = new Array(0.5 * this.tempPolygon.data.geometry.vertices.length)
                    .fill(0)
                    .map(() => ({x: 0, y: 0}));
                this.tempPolygon.data.geometry.vertices.forEach((v, idx) => {
                    if (idx % 2 === 0) vertices[Math.floor(idx/2)].x = Math.round(v * this.renderer.imageWidth);
                    else vertices[Math.floor(idx/2)].y = Math.round(v * this.renderer.imageHeight);
                });
                this.renderer.stage.removeChild(this.tempPolygon);
                this.tempPolygon.destroy();
                this.tempPolygon = null;
                if (vertices.length > 2) {
                    const fillType = (this.mode === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
                    let extrema = getPolygonExtrema(vertices);
                    extrema = extremaUnion(extrema, getDensePolysExtrema(this.densePolygons));
                    this.gmask.updateByPolygon(vertices, this.selectedId.value, fillType);
                    this.densePolygons = getPolygons(this.gmask, this.selectedId.value, extrema);
                    updateDisplayedSelection(this.contours, this.densePolygons);
                    this.send(new Event('update'));
                }
            }
        } else if (evt.key === 'Escape'){
            this.densePolygons = [];
            if (this.tempPolygon) {
                this.tempPolygon.destroy();
                this.renderer.stage.removeChild(this.tempPolygon);
                updateDisplayedSelection(this.contours, this.densePolygons);
                this.tempPolygon = null;
            }
        }
    }

    onPointerDownSelectionPolygon(evt: PIXI.interaction.InteractionEvent) {
        if (!this.selectedId.value) {
            // nothing to edit
            return;
        }
        const newPos = this.renderer.getPosition(evt.data);
        const {x, y} = this.renderer.normalize(newPos);

        if (this.tempPolygon) {
            // add pts
            this.tempPolygon.popNode();
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
        } else {
            window.removeEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            window.addEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            this.tempPolygon = new PolygonShape(observable({id: '', color: 'red', geometry: {type: 'polygon', vertices: []}}));
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.scaleX = this.renderer.imageWidth;
            this.tempPolygon.scaleY = this.renderer.imageHeight;
            this.renderer.stage.addChild(this.tempPolygon);
        }
    }

    onPointerMoveTempPolygon(evt: PIXI.interaction.InteractionEvent) {
        if (this.tempPolygon) {
            const newPos = this.renderer.getPosition(evt.data);
            const {x, y} = this.renderer.normalize(newPos);
            this.tempPolygon.popNode()
            this.tempPolygon.pushNode(x, y)
        }
    }
}

export class EditionAddController extends EditionController {
    constructor(renderer: Renderer, gmask: GMask, selectedId: {value: [number, number, number] | null},
                send: (event: Event) => boolean, contours: PIXIGraphics) {
        super(renderer, gmask, selectedId, send, contours);
        this.mode = EditionMode.ADD_TO_INSTANCE;
    }
}

export class EditionRemoveController extends EditionController {
    constructor(renderer: Renderer, gmask: GMask, selectedId: {value: [number, number, number] | null},
                send: (event: Event) => boolean, contours: PIXIGraphics) {
        super(renderer, gmask, selectedId, send, contours);
        this.mode = EditionMode.REMOVE_FROM_INSTANCE;
    }
}

export class SelectController extends Controller {
    protected renderer: Renderer;

    protected gmask: GMask;

    public contours = new PIXIGraphics();

    private densePolygons: DensePolygon[] = new Array();

    protected selectedId: {
        value: [number, number, number] | null
    };

    public send: (event: Event) => boolean;

    constructor(renderer: Renderer, gmask: GMask, selectedId: {value: [number, number, number] | null},
                send: (event: Event) => boolean, contours: PIXIGraphics) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.selectedId = selectedId;
        this.contours = contours;
        this.pointerHandlers = {
            SELECTION_PICKER: this.onPointerDownSelectInstance.bind(this)
        };
        this.keyHandlers = {
            KEY_SELECTION: this.onKeySelectionDown.bind(this)
        }
        this.send = send;
    }

    activate() {
        this.renderer.stage.on('mousedown', this.pointerHandlers.SELECTION_PICKER);
        window.addEventListener('keydown', this.keyHandlers.KEY_SELECTION, false);
        this.contours.visible = true;
    }

    deactivate() {
        window.removeEventListener('keydown', this.keyHandlers.KEY_SELECTION, false);
        this.renderer.stage.removeListener('mousedown', this.pointerHandlers.SELECTION_PICKER);
        this.contours.visible = false;
    }

    protected onPointerDownSelectInstance(evt: PIXI.interaction.InteractionEvent) {
        const {x, y} = this.renderer.getPosition(evt.data);
        const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
        if (id[0] === 0 && id[1] === 0 && id[2] === 0) {
            this.deselect();
            return;
        }
        this.selectedId.value = id;
        this.densePolygons = getPolygons(this.gmask, this.selectedId.value);
        updateDisplayedSelection(this.contours, this.densePolygons);
        this.send(new CustomEvent('selection', { detail: this.selectedId.value }));
    }

    /**
     * Draw dashed polygons to contour graphics
     * @param polygon
     */
    protected drawDashedPolygon(polygon: Point[]) {
        const dashed = false;
        if (dashed) {
            for(let i = 0; i< polygon.length; i++){
                const p1 = polygon[i];
                let p2;
                if(i === polygon.length-1) {
                    p2 = polygon[0];
                }
                else {
                    p2 = polygon[i+1];
                }
                if (dashed) {
                    this.contours.moveTo(0.5 * (p2.x + p1.x), 0.5 * (p2.y + p1.y));
                } else {
                    this.contours.moveTo(p1.x, p1.y);
                }
                this.contours.lineTo(p2.x, p2.y);
            }
        } else {
            this.contours.drawPolygon(polygon);
        }
    }

    public deselect() {
        if (this.selectedId.value) {
            this.densePolygons = [];
            updateDisplayedSelection(this.contours, this.densePolygons);
            this.selectedId.value = null;
            this.send(new CustomEvent('selection', {detail: null}));
        }
    }

    protected onKeySelectionDown(evt: KeyboardEvent) {
        if (evt.key === 'Escape') {
            this.deselect();
        }
    }
}

export class LockController extends Controller {
    protected renderer: Renderer;

    protected gmask: GMask;

    constructor(renderer: Renderer, gmask: GMask) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.pointerHandlers = {
            LOCK_DOWN: this.onPointerDownLock.bind(this)
        };
    }

    activate() {
        this.renderer.stage.on('mousedown', this.pointerHandlers.LOCK_DOWN);
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.pointerHandlers.LOCK_DOWN);
    }

    protected onPointerDownLock(evt: PIXI.interaction.InteractionEvent) {
        const {x, y} = this.renderer.getPosition(evt.data);
        const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
        const fId = fuseId(id);
        if (this.gmask.lockedInstances.has(fId)) {
            this.gmask.lockedInstances.delete(fId);
        } else {
            this.gmask.lockedInstances.add(fId);
        }
        this.gmask.recomputeColor();
    }
}

export class CreateController extends Controller {

    protected renderer: Renderer;

    protected gmask: GMask;

    public targetClass: { value: number };

    // temporary polygon
    public tempPolygon: PolygonShape | null = null;

    private roi = new PIXIGraphics();

    // show roi rectangle around cursor
    // as indicator of minimal annotation size.
    public showRoi: boolean = false;

    // roi ratio size w.r.t smaller side of image
    public roiRatio: { height: number, width: number } = { height: 0.15, width: 0.05 };

    private send: (event: Event) => boolean;

    constructor(renderer: Renderer, gmask: GMask, targetClass: { value: number } = { value: 1},
                send: (event: Event) => boolean ) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.targetClass = targetClass;
        this.send = send;
        this.renderer.stage.addChild(this.roi);
        this.pointerHandlers = {
            CREATE_POLYGON: this.onPointerDownSelectionPolygon.bind(this),
            TEMP_POLYGON: this.onPointerMoveTempPolygon.bind(this)
        };
        this.keyHandlers = {
            KEY_POLYGON: this.onKeyDown.bind(this)
        };
    }

    activate() {
        this.renderer.stage.on('mousedown', this.pointerHandlers.CREATE_POLYGON);
        this.renderer.stage.on('pointermove', this.pointerHandlers.TEMP_POLYGON);
        this.initRoi();
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.pointerHandlers.CREATE_POLYGON);
        this.renderer.stage.removeListener('pointermove', this.pointerHandlers.TEMP_POLYGON);
        this.roi.clear();
    }

    initRoi() {
        const minSize = Math.min(this.renderer.imageHeight, this.renderer.imageWidth);
        this.roi.lineStyle(1,0xFFFFFF, 1, 0.5, true);
        this.roi.drawRect(-minSize * this.roiRatio.width / 2,
            -minSize * this.roiRatio.height / 2,
            minSize * this.roiRatio.width,
            minSize * this.roiRatio.height);
        this.roi.endFill();
        this.roi.x = this.renderer.mouse.x;
        this.roi.y = this.renderer.mouse.y;
        this.roi.visible = this.showRoi;
    }

    onPointerDownSelectionPolygon(evt: PIXI.interaction.InteractionEvent) {
        const newPos = this.renderer.getPosition(evt.data);
        const {x, y} = this.renderer.normalize(newPos);
        if (this.tempPolygon) {
            this.tempPolygon.popNode();
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
        } else {
            window.removeEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            window.addEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            this.tempPolygon = new PolygonShape(observable({id: '', color: 'red', geometry: {type: 'polygon', vertices: []}}));
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.scaleX = this.renderer.imageWidth;
            this.tempPolygon.scaleY = this.renderer.imageHeight;
            this.renderer.stage.addChild(this.tempPolygon);
            this.roi.clear();
        }
    }

    onPointerMoveTempPolygon(evt: PIXI.interaction.InteractionEvent) {
        const newPos = this.renderer.getPosition(evt.data);
        if (this.tempPolygon) {
            const {x, y} = this.renderer.normalize(newPos);
            this.tempPolygon.popNode();
            this.tempPolygon.pushNode(x, y);
        } else {
            this.roi.x = newPos.x;
            this.roi.y = newPos.y;
        }
    }

    protected onKeyDown(evt: KeyboardEvent) {
        if (evt.key === 'Enter') {
            // End polygon creation
            if (this.tempPolygon) {
                this.tempPolygon.popNode();
                const vertices: any[] = new Array(0.5 * this.tempPolygon.data.geometry.vertices.length)
                    .fill(0)
                    .map(() => ({x: 0, y: 0}));
                this.tempPolygon.data.geometry.vertices.forEach((v, idx) => {
                    if (idx % 2 === 0) vertices[Math.floor(idx/2)].x = Math.round(v * this.renderer.imageWidth);
                    else vertices[Math.floor(idx/2)].y = Math.round(v * this.renderer.imageHeight);
                });
                this.tempPolygon.destroy();
                this.renderer.stage.removeChild(this.tempPolygon);
                this.tempPolygon = null;
                if (vertices.length > 2) {
                    const cls = this.gmask.clsMap.get(this.targetClass.value);
                    const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0];
                    const newValue: [number, number, number] = [newId[0], newId[1], this.targetClass.value];
                    this.gmask.fusedIds.add(fuseId(newValue));
                    this.gmask.updateByPolygon(vertices, newValue, 'add');
                    this.send(new Event('update'));
                    this.initRoi();
                }
            }
        }
        else if (evt.key === 'Escape'){
            if (this.tempPolygon) {
                this.tempPolygon.destroy();
                this.renderer.stage.removeChild(this.tempPolygon);
                this.tempPolygon = null;
                this.initRoi();
            }
        }
    }
}

/**
 * Manage set of interactive shapes
 */
export class MaskManager extends EventTarget {
    protected renderer: Renderer;

    public mode: string = 'select';

    public selectedId: {
        value: [number, number, number] | null
    };

    protected gmask: GMask;

    // contour of selected instance
    public contour = new PIXIGraphics();

    public modes: {
        [key: string]: Controller;
    };

    public targetClass: { value: number } = { value: 1 };

    constructor(renderer: Renderer = new Renderer(),
                gmask: GMask = new GMask(), selectedId: [number, number, number] = [0, 0, 0]) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.selectedId = { value: selectedId };
        this.renderer.stage.addChild(this.contour);
        this.modes = {
            'create': new CreateController(this.renderer, this.gmask, this.targetClass, this.dispatchEvent.bind(this)),
            'select': new SelectController(this.renderer, this.gmask, this.selectedId, this.dispatchEvent.bind(this), this.contour),
            'edit-add': new EditionAddController(this.renderer, this.gmask, this.selectedId, this.dispatchEvent.bind(this), this.contour),
            'edit-remove': new EditionRemoveController(this.renderer, this.gmask, this.selectedId, this.dispatchEvent.bind(this), this.contour),
            'lock': new LockController(this.renderer, this.gmask)
        };
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
     * 1. Reset canvas to "mode-free" (no interaction)
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

    /**
     * Remove all blobs with total number of pixels below 'blobMinSize'
     * @param blobMinSize
     */
    public filterAll(blobMinSize: number) {
        this.gmask.fusedIds.forEach((id) => {
            this.filterId(unfuseId(id), blobMinSize)
        });
        this.dispatchEvent(new Event('update'));
    }

    /**
     * Remove all blobs of selected id with number of pixels below 'blobMinSize'
     * TODO: multiple ids in a single loop
     * @param targetId the id of the blobs to be found
     * @param blobMinSize
     */
    protected filterId(targetId: [number, number, number], blobMinSize: number){
        const blobs = this.gmask.getBlobs(targetId)
        for (const [,blob] of blobs){
            if (blob.nbPixels < blobMinSize) {
                blob.contours.forEach(contour => {
                    const arr = convertIndexToDict(contour.points, this.gmask.canvas.width + 1);
                    if (contour.type === 'external') {
                        this.gmask.updateByPolygon(arr, targetId, 'remove')
                    }
                    else {
                        this.gmask.updateByPolygon(arr, targetId, 'add')
                    }
                });
            }
        }
    }

    /**
     * Fill current selection polygons
     * with provided target id
     * @param id target id
     */
    public fillSelection(id: [number, number, number], fillType='unite') {
        // to do: replace image data values
        // image data
        if (this.selectedId.value) {
            const polygons = getPolygons(this.gmask, this.selectedId.value);
            const newData = this.createMaskFromPolygons(polygons);
            this.gmask.updateValue(newData, id, fillType);
        }
    }

    /**
     * Fill mask from polygons
     * 1: pixel contained in one of polygons
     * 0: pixel not contained
     * @param polygons
     */
    protected createMaskFromPolygons(polygons: DensePolygon[]): ImageData {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = this.renderer.imageWidth;
        canvas.height = this.renderer.imageHeight;
        const ctx = canvas.getContext('2d')!;
        polygons.forEach((poly) => {
            if (poly.type === 'external')
                ctx.fillStyle = `rgb(1, 0, 0)`; // Foreground
            else
                ctx.fillStyle = 'rgb(0, 0, 0)'; // Background
            const data = poly.data;

            ctx.beginPath();
            ctx.moveTo(data[0].x, data[0].y);
            for(let i = 1; i < data.length; i++){
                const p = data[i];
                ctx.lineTo(p.x, p.y);
            }
            ctx.lineTo(data[0].x, data[0].y);
            ctx.closePath();
            ctx.fill();
        });
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

//// utils //////
/////////////////

/**
 * Returns all blobs contours of gmask whose id is equal to targetId. Basically
 * the same function a BlobExtraction but for fixed mask (gmask's one)
 * @param targetId the id of the blobs to be found
 * @param extrema (optional) the box research zone [xMin, yMin, xMax, yMax]
 */
export function getPolygons(mask: GMask, targetId: [number, number, number], extrema?: number[]): DensePolygon[] {
    const blobs = mask.getBlobs(targetId, extrema);
    const newPolys: DensePolygon[] = [];
    for (const [, blob] of blobs) {
        blob.contours.forEach((contour) => {
            const arr = convertIndexToDict(contour.points, mask.canvas.width + 1);
            newPolys.push({type: contour.type, data: arr});
        });
    }
    return newPolys;
}


export function updateDisplayedSelection(contours: PIXIGraphics, densePolygons: DensePolygon[]) {
    contours.clear();
    contours.lineStyle(1, 0X426eff, 1, 0.5, true);
    densePolygons.forEach((poly) => {
        drawDashedPolygon(poly.data, contours);
    });
}

/**
 * Draw dashed polygons to contour graphics
 * @param polygon
 */
export function drawDashedPolygon(polygon: Point[], contours: PIXIGraphics) {
    const dashed = false;
    if (dashed) {
        for(let i = 0; i< polygon.length; i++){
            const p1 = polygon[i];
            let p2;
            if(i === polygon.length-1) {
                p2 = polygon[0];
            }
            else {
                p2 = polygon[i+1];
            }
            if (dashed) {
                contours.moveTo(0.5 * (p2.x + p1.x), 0.5 * (p2.y + p1.y));
            } else {
                contours.moveTo(p1.x, p1.y);
            }
            contours.lineTo(p2.x, p2.y);
        }
    } else {
        contours.drawPolygon(polygon);
    }
}


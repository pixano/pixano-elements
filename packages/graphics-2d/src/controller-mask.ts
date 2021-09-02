/**
 * Implementation of segmentation mask interaction manager.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
import { observable } from '@pixano/core';
import { rgbToHex } from '@pixano/core/lib/utils';
import { Renderer } from './renderer';
import { GraphicMask, GraphicPolygon } from './graphics';
import { unfuseId, fuseId, getPolygonExtrema,
        extremaUnion, convertIndexToDict, DensePolygon,
        getDensePolysExtrema, arraysMatch } from './utils-mask';
import { Graphics as PIXIGraphics, Point} from 'pixi.js'
import { Controller } from './controller-base';


export enum EditionMode {
    ADD_TO_INSTANCE = 'add_to_instance',
    REMOVE_FROM_INSTANCE = 'remove_from_instance',
    NEW_INSTANCE = 'new_instance'
}

/**
 * Basic interaction that selects region when clicked on it.
 * Construction arguments are partially the public class properties (renderer, gmask, ...).
 */
export class SelectController extends Controller {
    public renderer: Renderer;

    public gmask: GraphicMask;

    public selectedId: {
        value: [number, number, number] | null
    };

    protected contours = new PIXIGraphics();

    protected densePolygons: DensePolygon[] = new Array();

    constructor(props: Partial<SelectController> = {}) {
        super();
        this.renderer = props.renderer || new Renderer();
        this.gmask = props.gmask || new GraphicMask();
        this.selectedId = props.selectedId || { value: null };
        this.renderer.stage.addChild(this.contours);
        this.onPointerDownSelectInstance = this.onPointerDownSelectInstance.bind(this);
        this.onKeySelectionDown = this.onKeySelectionDown.bind(this);
    }

    activate() {
        this.renderer.stage.on('mousedown', this.onPointerDownSelectInstance);
        window.addEventListener('keydown', this.onKeySelectionDown, false);
        this.contours.visible = true;
        if (this.selectedId.value && !arraysMatch(this.selectedId.value, [0,0,0])) {
            this.densePolygons = getPolygons(this.gmask, this.selectedId.value);
            updateDisplayedSelection(this.contours, this.densePolygons);
        } else {
            this.densePolygons = [];
            this.contours.clear();
        }
    }

    deactivate() {
        window.removeEventListener('keydown', this.onKeySelectionDown, false);
        this.renderer.stage.removeListener('mousedown', this.onPointerDownSelectInstance);
        this.contours.visible = false;
    }

    protected onPointerDownSelectInstance(evt: PIXIInteractionEvent) {
        const {x, y} = this.renderer.getPosition(evt.data);
        const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
        if (id[0] === 0 && id[1] === 0 && id[2] === 0) {
            this.deselect();
            return;
        }
        this.selectedId.value = id;
        this.densePolygons = getPolygons(this.gmask, this.selectedId.value);
        updateDisplayedSelection(this.contours, this.densePolygons);
        this.dispatchEvent(new CustomEvent('selection', { detail: this.selectedId.value }));
    }

    public deselect() {
        if (this.selectedId.value) {
            this.densePolygons = [];
            updateDisplayedSelection(this.contours, this.densePolygons);
            this.selectedId.value = null;
            this.dispatchEvent(new CustomEvent('selection', {detail: null}));
        }
    }

    protected onKeySelectionDown(evt: KeyboardEvent) {
        if (evt.key === 'Escape') {
            this.deselect();
        }
    }
}

export class LockController extends SelectController {

    public lockType: "instance" | "class";

    constructor(props: Partial<LockController> = {}) {
        super(props);
        this.lockType = props.lockType || "class";
        this.onPointerDownLock = this.onPointerDownLock.bind(this);
    }

    activate() {
        this.renderer.stage.on('mousedown', this.onPointerDownLock);
        this.contours.visible = true;
        if (this.selectedId.value) {
            this.densePolygons = getPolygons(this.gmask, this.selectedId.value);
            updateDisplayedSelection(this.contours, this.densePolygons);
        }
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.onPointerDownLock);
        this.contours.visible = false;
    }

    protected onPointerDownLock(evt: PIXIInteractionEvent) {
        const {x, y} = this.renderer.getPosition(evt.data);
        const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
        if (this.lockType === "instance") {
            const fId = fuseId(id);
            if (this.gmask.lockedInstances.has(fId)) {
                this.gmask.lockedInstances.delete(fId);
            } else {
                this.gmask.lockedInstances.add(fId);
            }
        } else if (this.lockType === "class") {
            const cls = id[2];
            const currentLockedClasses = [...this.gmask.lockedInstances].map((id) => unfuseId(id)[2]);
            if (currentLockedClasses.includes(cls)) {
                // remove all instances of class from the locked instances
                this.gmask.fusedIds.forEach((fId) => {
                    if (unfuseId(fId)[2] == cls) {
                        this.gmask.lockedInstances.delete(fId);
                    }
                });
            } else {
                // add all instances of class to locked instances
                this.gmask.fusedIds.forEach((fId) => {
                    if (unfuseId(fId)[2] == cls) {
                        this.gmask.lockedInstances.add(fId);
                    }
                });
            }
        }
        this.gmask.recomputeColor();
    }
}

/**
 * Add/edit instance to mask using polygon interaction.
 * Note: contrary to CreateController, you do not need to use EditionAddController or
 * EditionRemoveController to edit this new instance. Keyboard shortcuts specify which edition type you use.
 */
export class CreateBrushController extends Controller {

    public renderer: Renderer;

    public gmask: GraphicMask;

    public targetClass: { value: number };

    // temporary polygon
    protected tempPolygon: GraphicPolygon | null = null;

    private roi = new PIXIGraphics();

    private roiMatrix = new Float32Array();

    public contours = new PIXIGraphics();

    // roi ratio radius in pixels
    public roiRadius: number = 5;

    public selectedId: {
        value: [number, number, number] | null
    };

    public editionMode: EditionMode = EditionMode.NEW_INSTANCE;

    protected densePolygons: DensePolygon[] = new Array();

    private isActive: boolean = false;

    constructor(props: Partial<CreateBrushController> = {}) {
        super(props);
        this.renderer = props.renderer || new Renderer();
        this.gmask = props.gmask || new GraphicMask();
        this.targetClass = props.targetClass || { value: 0 };
        this.selectedId = props.selectedId || { value: null };
        this.renderer.stage.addChild(this.roi);
        this.renderer.stage.addChild(this.contours);
        this.onPointerMoveBrush = this.onPointerMoveBrush.bind(this);
        this.onPointerDownBrush = this.onPointerDownBrush.bind(this);
        this.onPointerUpBrush = this.onPointerUpBrush.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    activate() {
        this.renderer.stage.on('mousedown', this.onPointerDownBrush);
        this.renderer.stage.on('pointermove', this.onPointerMoveBrush);
        this.renderer.stage.on('pointerupoutside', this.onPointerUpBrush);
        window.addEventListener('keydown', this.onKeyDown, false);
        this.initRoi();
        this.contours.visible = true;
        if (this.selectedId.value) {
            this.densePolygons = getPolygons(this.gmask, this.selectedId.value!);
            updateDisplayedSelection(this.contours, this.densePolygons);
        } else {
            this.densePolygons = [];
            this.contours.clear();
        }
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.onPointerDownBrush);
        this.renderer.stage.removeListener('pointermove', this.onPointerMoveBrush);
        this.renderer.stage.removeListener('pointerupoutside', this.onPointerUpBrush);
        window.removeEventListener('keydown', this.onKeyDown, false);
        this.roi.clear();
        this.contours.visible = false;
    }

    /**
     * Display temporary filled circle around cursor to indicate
     * the brush pixels.
     */
    initRoi() {

        // get target color
        const color = this.gmask.pixelToColor(0,0,this.targetClass.value);
        const hex = rgbToHex(...color);
        this.roi.cacheAsBitmap = false;
        this.roi.clear();
        this.roi.beginFill(parseInt(hex, 16));
        this.roi.drawCircle(0, 0, this.roiRadius);
        this.roi.endFill();
        this.roi.x = this.renderer.mouse.x;
        this.roi.y = this.renderer.mouse.y;
        this.roi.cacheAsBitmap = true;

        // compute binary array
        this.roiMatrix = new Float32Array((2*this.roiRadius)*(2*this.roiRadius));
        this.roiMatrix.fill(0);
        const r2 = this.roiRadius * this.roiRadius;
        for (let x = 0; x < this.roiRadius * 2; x++) {
            for (let y = 0; y < this.roiRadius * 2; y++) {
                let dx = Math.abs(this.roiRadius - x - 0.5);
                let dy = Math.abs(this.roiRadius - y - 0.5);
                dx *= dx;
                dy *= dy;
                this.roiMatrix[x+this.roiRadius*2*y] = (dx + dy <= r2) ? 1 : 0;
            }
        }        
    }

    /**
     * Utility function to retrieve the mask value to next be created
     * depending on the edition mode (new, add, remove).
     */
    getTargetValue(): [number, number, number] {
        if (this.editionMode == EditionMode.NEW_INSTANCE) {
            const cls = this.gmask.clsMap.get(this.targetClass.value);
            const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0] as [number, number];
            const value = [newId[0], newId[1], this.targetClass.value] as [number, number, number];
            this.selectedId.value = value;
            return value;
        } else if ((this.editionMode == EditionMode.ADD_TO_INSTANCE || this.editionMode == EditionMode.REMOVE_FROM_INSTANCE)
                && this.selectedId.value) {
            return this.selectedId.value;
        }
        return [0,0,0];
    }

    /**
     * Mouse press to start brushing
     * @param evt PIXIInteractionEvent
     */
    onPointerDownBrush(evt: PIXIInteractionEvent) {
        this.isActive = true;
        this.roi.x = this.renderer.mouse.x;
        this.roi.y = this.renderer.mouse.y;

        if (evt.data.button === 0 && !evt.data.originalEvent.ctrlKey && !evt.data.originalEvent.shiftKey) {
            // create
            this.editionMode = EditionMode.NEW_INSTANCE;
        } else if (evt.data.button === 0 && evt.data.originalEvent.shiftKey && this.selectedId.value != null) {
            // union
            this.editionMode = EditionMode.ADD_TO_INSTANCE;
        } else if (evt.data.button === 0 && evt.data.originalEvent.ctrlKey && this.selectedId.value != null) {
            // remove
            this.editionMode = EditionMode.REMOVE_FROM_INSTANCE;
        }
        const fillType = (this.editionMode === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
        this.gmask.updateByMaskInRoi(this.roiMatrix,
            [this.roi.x - this.roiRadius, this.roi.y - this.roiRadius, this.roi.x + this.roiRadius, this.roi.y + this.roiRadius],
            this.getTargetValue(), fillType
        );
    }

    /**
     * Mouse move when brushing
     * @param evt PIXIInteractionEvent
     */
    onPointerMoveBrush(evt: PIXIInteractionEvent) {
        const newPos = this.renderer.getPosition(evt.data);
        this.roi.x = newPos.x;
        this.roi.y = newPos.y;
        if (this.isActive) {
            const fillType = (this.editionMode === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
            this.gmask.updateByMaskInRoi(this.roiMatrix,
                [this.roi.x - this.roiRadius, this.roi.y - this.roiRadius, this.roi.x + this.roiRadius, this.roi.y + this.roiRadius],
                this.getTargetValue(), fillType
            );
        }
    }

    /**
     * Mouse release after brushing
     */
    onPointerUpBrush() {
        if (this.isActive) {
            this.densePolygons = getPolygons(this.gmask, this.selectedId.value!);
            updateDisplayedSelection(this.contours, this.densePolygons);
            this.gmask.fusedIds.add(fuseId(this.selectedId.value!));
            this.dispatchEvent(new Event('update'));
        }
        this.isActive = false;
    }

    /**
     * On keyboard press
     * @param evt KeyboardEvent
     */
    protected onKeyDown(evt: KeyboardEvent) {
        if (evt.code == "NumpadAdd" || evt.key == "z") { //"+") {
            this.roiRadius += 1;
            this.initRoi();   
        }  else if (evt.code == "NumpadSubtract" || evt.key == "a") { //"-") {
            this.roiRadius = Math.max(this.roiRadius - 1, 1);
            this.initRoi();    
        }
    }
}


/**
 * Add new instance to mask using polygon interaction.
 * Note: use EditionAddController or EditionRemoveController to edit this new instance.
 */
export class CreatePolygonController extends Controller {

    public renderer: Renderer;

    public gmask: GraphicMask;

    public targetClass: { value: number };

    public selectedId: {
        value: [number, number, number] | null
    };

    // show roi rectangle around cursor
    // as indicator of minimal annotation size.
    public showRoi: boolean = false;

    // roi ratio size w.r.t smaller side of image
    public roiRatio: { height: number, width: number } = { height: 0.15, width: 0.05 };

    ///// Internal properties

    // coordinates of contour polygons
    private densePolygons: DensePolygon[] = new Array();

    // graphic contour of selected instance
    private contours = new PIXIGraphics();

    private roi = new PIXIGraphics();

    // temporary polygon
    protected tempPolygon: GraphicPolygon | null = null;

    protected editionMode: EditionMode = EditionMode.NEW_INSTANCE;

    constructor(props: Partial<CreatePolygonController> = {}) {
        super();
        this.renderer = props.renderer || new Renderer();
        this.gmask = props.gmask || new GraphicMask();
        this.targetClass = props.targetClass || { value: 0 };
        this.selectedId = props.selectedId || { value: null };
        this.renderer.stage.addChild(this.roi);
        this.renderer.stage.addChild(this.contours);
        this.onPointerMoveTempPolygon = this.onPointerMoveTempPolygon.bind(this);
        this.onPointerDownSelectionPolygon = this.onPointerDownSelectionPolygon.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    activate() {
        this.renderer.stage.on('mousedown', this.onPointerDownSelectionPolygon);
        this.renderer.stage.on('pointermove', this.onPointerMoveTempPolygon);
        this.initRoi();
        this.contours.visible = true;
        if (this.selectedId.value) {
            this.densePolygons = getPolygons(this.gmask, this.selectedId.value);
            updateDisplayedSelection(this.contours, this.densePolygons);
        } else {
            this.densePolygons = [];
            this.contours.clear();
        }
    }

    deactivate() {
        this.renderer.stage.removeListener('mousedown', this.onPointerDownSelectionPolygon);
        this.renderer.stage.removeListener('pointermove', this.onPointerMoveTempPolygon);
        this.roi.clear();
        this.contours.visible = false;
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

    /**
     * Mouse down to add node to polygon
     * @param evt PIXIInteractionEvent
     */
    onPointerDownSelectionPolygon(evt: PIXIInteractionEvent) {
        const newPos = this.renderer.getPosition(evt.data);
        const {x, y} = this.renderer.normalize(newPos);
        if (this.tempPolygon) {
            this.tempPolygon.popNode();
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
        } else {
            window.removeEventListener('keydown', this.onKeyDown, false);
            window.addEventListener('keydown', this.onKeyDown, false);
            this.tempPolygon = new GraphicPolygon(observable({id: '', color: 'red', geometry: {type: 'polygon', vertices: []}}));
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.pushNode(x, y);
            this.tempPolygon.scaleX = this.renderer.imageWidth;
            this.tempPolygon.scaleY = this.renderer.imageHeight;
            this.renderer.stage.addChild(this.tempPolygon);
            this.roi.clear();
        }
    }

    /**
     * Mouse move to place next polygon node
     * @param evt PIXIInteractionEvent
     */
    onPointerMoveTempPolygon(evt: PIXIInteractionEvent) {
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

    /**
     * On keyboard press
     * @param evt KeyboardEvent
     */
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
                    const fillType = (this.editionMode === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
                    const newValue: [number, number, number] = this.getTargetValue();
                    this.gmask.fusedIds.add(fuseId(newValue));
                    let extrema = undefined;
                    if (fillType != 'remove') {
                        extrema = getPolygonExtrema(vertices);
                        extrema = extremaUnion(extrema, getDensePolysExtrema(this.densePolygons));
                    }
                    this.gmask.updateByPolygon(vertices, newValue, fillType);
                    this.densePolygons = getPolygons(this.gmask, newValue, extrema);
                    updateDisplayedSelection(this.contours, this.densePolygons);
                    this.dispatchEvent(new Event('update'));
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

    /**
     * Utility function to retrieve the mask value to next be created
     * depending on the edition mode (new, add, remove).
     */
    getTargetValue(): [number, number, number] {
        if (this.editionMode == EditionMode.NEW_INSTANCE) {
            const cls = this.gmask.clsMap.get(this.targetClass.value);
            const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0] as [number, number];
            const value = [newId[0], newId[1], this.targetClass.value] as [number, number, number];
            this.selectedId.value = value;
            return value;
        } else if ((this.editionMode == EditionMode.ADD_TO_INSTANCE || this.editionMode == EditionMode.REMOVE_FROM_INSTANCE)
                    && this.selectedId.value) {
            return this.selectedId.value;
        }
        return [0,0,0];
    }
}


export class EditionAddController extends CreatePolygonController {
    constructor(props: Partial<CreatePolygonController> = {}) {
        super(props);
        this.editionMode = EditionMode.ADD_TO_INSTANCE;
    }
}


export class EditionRemoveController extends CreatePolygonController {
    constructor(props: Partial<CreatePolygonController> = {}) {
        super(props);
        this.editionMode = EditionMode.REMOVE_FROM_INSTANCE;
    }
}


export class CreateController extends CreatePolygonController {
    constructor(props: any) {
        super(props);
        // For deprecated notice
        console.warn("This class is obsolete. Please use CreatePolygonController instead.")
    }
};


/**
 * Manage set of interactive shapes
 */
export class MaskManager extends EventTarget {
    protected renderer: Renderer;

    public mode: string = 'select';

    public selectedId: {
        value: [number, number, number] | null
    };

    protected gmask: GraphicMask;

    // contour of selected instance
    public contour = new PIXIGraphics();

    public modes: {
        [key: string]: Controller;
    };

    public targetClass: { value: number } = { value: 1 };

    constructor(renderer: Renderer = new Renderer(),
                gmask: GraphicMask = new GraphicMask(), selectedId: [number, number, number] = [0, 0, 0]) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.selectedId = { value: selectedId };
        this.renderer.stage.addChild(this.contour);
        this.modes = {
            'create': new CreatePolygonController({...this} as any),
            'create-brush': new CreateBrushController({...this} as any),
            'select': new SelectController({...this} as any),
            'edit-add': new EditionAddController({...this} as any),
            'edit-remove': new EditionRemoveController({...this} as any),
            'lock': new LockController({...this} as any)
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
    public fillSelection(id: [number, number, number]) {
        // to do: replace image data values
        // image data
        if (this.selectedId.value) {
            this.gmask.replaceValue(this.selectedId.value, id);
            this.selectedId.value = id;
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
export function getPolygons(mask: GraphicMask, targetId: [number, number, number], extrema?: number[]): DensePolygon[] {
    if (arraysMatch(targetId, [0,0,0])) {
        return [];
    }
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

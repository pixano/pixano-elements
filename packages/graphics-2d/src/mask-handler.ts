/**
 * Implementation of segmentation mask handler.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { PxnRenderer } from './renderer-2d';
import { GMask, PolygonShape, Brush} from './shapes-2d';
import { fuseId, unfuseId, getPolygonExtrema,
         extremaUnion} from './mask';
import { BlobExtractor } from './blob-extractor';
import { Container as PIXIContainer, Graphics as PIXIGraphics, Point, Filter as PIXIFilter} from 'pixi.js'
import { rectifyFisheyeFromPolyline } from './rectify-border'
import {rgbToHex} from './adapter'
import { observable } from '@pixano/core';

export enum Mode {
    SELECT_INSTANCE = 'select_instance',
    BRUSH = 'brush',
    RECTIFY_BORDER  = "rectify_border",
    LOCK_CLASS = 'lock_class',
    CREATE_INSTANCE = 'create_instance',
    ADD_TO_INSTANCE = 'add_to_instance',
    REMOVE_FROM_INSTANCE = 'remove_from_instance'
}

interface ObjectLiteral {
    [key: string]: (evt: any) => void;
}

interface DensePolygon {
    type: string; // external or internal
    data: any[]; // list of {x, y} dict
}

export class MaskHandler extends PIXIContainer {
    protected renderer: PxnRenderer;

    protected mode: Mode = Mode.SELECT_INSTANCE;

    protected gmask: GMask;

    protected brush = new Brush();

    protected tempBrushGraphics = new PIXIGraphics();

    public brushMoveContainer = new PIXIContainer();

    public brushFilter = new AlphaFilter();


    public contours = new PIXIGraphics();

    public rectifyBorderContainer = new PIXIContainer();

    // temporary polygon
    public tempContours = new PIXIContainer();

    private densePolygons: DensePolygon[] = new Array();

    private keyHandlers: ObjectLiteral;

    private pointerHandlers: ObjectLiteral;

    public selectedId: [number, number, number];

    public targetClass: number = 1;

    // border line nodes in [y, x] order.
    private rectifyBorderPolyline: [number, number][]= new Array();

    private autoContours: boolean = true;

    constructor(renderer: PxnRenderer = new PxnRenderer(),
                gmask: GMask = new GMask(), selectedId: [number, number, number] = [0, 0, 0]) {
        super();
        this.renderer = renderer;
        this.gmask = gmask;
        this.selectedId = selectedId;
        // this.brushMoveContainer.filters = [this.brushFilter]
        this.updateTempBrushGraphic()


        this.keyHandlers = {
            KEY_POLYGON: this.onKeyDown.bind(this),
            KEY_SELECTION: this.onKeySelectionDown.bind(this),
            BRUSH_KEY: this.onBrushKey.bind(this),
            RECTIFYBORDER_CONFIRMSELECT: this.onRectifyBorderKey.bind(this)
        };
        this.pointerHandlers = {
            SELECTION_PICKER: this.onPointerDownSelectInstance.bind(this),
            LOCK_CLASS: this.onPointerDownLockClass.bind(this),
            CREATE_POLYGON: this.onPointerDownSelectionPolygon.bind(this),

            TEMP_POLYGON: this.onPointerMoveTempPolygon.bind(this),
	        BRUSH_MOVE: this.onPointerMoveBrush.bind(this),
            BRUSH_CLICK: this.onPointerDownBrush.bind(this),
            BRUSH_RELEASE: this.onPointerUpBrush.bind(this),
            RECTIFYBORDER_CLICK: this.onRectifyBorderClick.bind(this),
            RECTIFYBORDER_MOVE: this.onRectifyBorderMove.bind(this)
        }

        this.setMode(this.mode);
        this.addChild(this.contours);
        this.addChild(this.tempContours);
        this.addChild(this.brush);
        this.addChild(this.rectifyBorderContainer);
        this.addChild(this.brushMoveContainer)
    }

    public updateTempBrushGraphic(){
        this.brushFilter.alpha = this.renderer.labelLayer.alpha;
        this.brushMoveContainer.filters = [this.brushFilter];
        const [r,g,b] = this.gmask.pixelToColor(this.selectedId[0], this.selectedId[1], this.selectedId[2]);

        const color = rgbToHex(r,g,b)
        this.tempBrushGraphics.clear();
        this.tempBrushGraphics.beginFill(color);
        this.tempBrushGraphics.drawRect(0,0, this.brush.brushSize, this.brush.brushSize);
        this.tempBrushGraphics.endFill();
    }

    public update() {
        this.emit('update');
    }

    public setMode(mode: Mode) {
        this.mode = mode;
        Object.keys(this.pointerHandlers).forEach((key) => {
            const v = this.pointerHandlers[key];
            this.renderer.stage.removeListener('mousedown', v);
            this.renderer.stage.removeListener('mouseupoutside', v);
            this.renderer.stage.removeListener('pointermove', v);
        });

        Object.keys(this.keyHandlers).forEach((key) => {
            const v = this.keyHandlers[key];
            window.removeEventListener('keydown', v);
        });

        this.brush.removeChildren();
        this.tempContours.removeChildren();
        this.rectifyBorderContainer.removeChildren();
        switch(mode) {
            case Mode.CREATE_INSTANCE: {
                this.deselect();
                this.setPolygonHandler();
                break;
            }
            case Mode.SELECT_INSTANCE: {
                this.setSelectHandler();
                break;
            }
            case Mode.BRUSH: {
                this.setBrushHandler();
                break;
            }
            case Mode.ADD_TO_INSTANCE: {
                this.setPolygonHandler();
                break;
            }
            case Mode.REMOVE_FROM_INSTANCE: {
                this.setPolygonHandler();
                break;
            }
            case Mode.LOCK_CLASS: {
                this.lockClassHandler();
                break;
            }
            case Mode.RECTIFY_BORDER: {
                this.setRectifyBorderHandler();
                break;
            }
        }
    }

    protected onBrushKey(event: KeyboardEvent) {
        if (event.code === "NumpadAdd") {
            this.brush.brushSize += 1;
            this.brush.brushCursor.width += 1;
            this.brush.brushCursor.height += 1;
        }  else if (event.code === "NumpadSubtract") {
            if (this.brush.brushSize > 1) {
                this.brush.brushSize -= 1;
                this.brush.brushCursor.width -= 1;
                this.brush.brushCursor.height -= 1;
            }
        } else if (event.key === 'Escape') {
            this.deselect();
        }
        this.updateTempBrushGraphic()
    }

    protected onPointerMoveBrush(event: PIXI.interaction.InteractionEvent) {
        const pos = event.data.getLocalPosition(this.renderer.stage)

        let x =  Math.round(pos.x - 0.5 * this.brush.brushCursor.width);
        let y =  Math.round(pos.y - 0.5 * this.brush.brushCursor.height);
        x = Math.max(0, Math.min(this.renderer.imageWidth - this.brush.brushCursor.width, x));
        y = Math.max(0, Math.min(this.renderer.imageHeight - this.brush.brushCursor.height, y));
        this.brush.brushCursor.x = x;
        this.brush.brushCursor.y = y;

        if (this.brush.isActive) {
            this.brush.updateMoveExtrema(x, y, this.renderer.imageWidth, this.renderer.imageHeight)
            this.applyBrush();
            const tempBrush = this.tempBrushGraphics.clone();
            tempBrush.x = x;
            tempBrush.y = y;
            this.brushMoveContainer.addChild(tempBrush);
        }
    }

    protected applyBrush() {
        this.gmask.updateByPolygonTemp(this.brush.getPolygon(), this.selectedId);
    }

    protected onPointerUpBrush() {
        this.gmask.endBrushing();
        if (this.autoContours) {
            const extrema = extremaUnion(this.brush.getMoveExtrema(), this.getDensePolysExtrema());
            const newPolys = this.getPolygons(this.selectedId, extrema);
            this.densePolygons = [...newPolys];
            this.updateDisplayedSelection();
        }
        this.brush.resetMoveExtrema();
        this.brush.isActive = false;
        this.brushMoveContainer.removeChildren();
        this.update();
    }

    protected onPointerDownBrush(event: PIXI.interaction.InteractionEvent) {
        this.brush.isActive = true;

        const pos = event.data.getLocalPosition(this.renderer.stage)
        let x =  Math.round(pos.x - 0.5 * this.brush.brushCursor.width);
        let y =  Math.round(pos.y - 0.5 * this.brush.brushCursor.height);
        x = Math.max(0, Math.min(this.renderer.imageWidth - this.brush.brushCursor.width, x));
        y = Math.max(0, Math.min(this.renderer.imageHeight - this.brush.brushCursor.height, y));
        this.brush.brushCursor.x = x;
        this.brush.brushCursor.y = y;

        this.brush.updateMoveExtrema(x, y, this.renderer.imageWidth, this.renderer.imageHeight)
        this.gmask.startBrushing();

        const tempBrush = this.tempBrushGraphics.clone();
        tempBrush.x = x;
        tempBrush.y = y;
        this.brushMoveContainer.addChild(tempBrush);
        this.applyBrush();
    }

    protected setBrushHandler() {
        this.brush.addChild(this.brush.brushCursor)
        this.updateTempBrushGraphic()
        this.renderer.stage.on("pointermove", this.pointerHandlers.BRUSH_MOVE);
        this.renderer.stage.on("mousedown", this.pointerHandlers.BRUSH_CLICK);
        this.renderer.stage.on("mouseupoutside", this.pointerHandlers.BRUSH_RELEASE);
        window.addEventListener('keydown', this.keyHandlers.BRUSH_KEY, false);
        this.renderer.stage.interactive = true;
    }

    protected setRectifyBorderHandler() {
        this.deselect();
        window.addEventListener('keydown', this.keyHandlers.RECTIFYBORDER_CONFIRMSELECT, false);
        this.renderer.stage.on("pointerdown", this.pointerHandlers.RECTIFYBORDER_CLICK);
        this.renderer.stage.on("pointermove", this.pointerHandlers.RECTIFYBORDER_MOVE);
        this.rectifyBorderPolyline = new Array();
    }

    protected onRectifyBorderKey(event: KeyboardEvent) {
        if (event.key === "Enter") {
            if (this.rectifyBorderPolyline.length >= 2) {
                this.rectifyBorder(this.rectifyBorderPolyline);
                this.rectifyBorderPolyline = new Array();
                this.rectifyBorderContainer.removeChildren();
                this.update();
            }
        } else if (event.key === 'Escape') {
            this.rectifyBorderPolyline = new Array();
            this.rectifyBorderContainer.removeChildren();
        }
    }

    protected onRectifyBorderClick(event: PIXI.interaction.InteractionEvent) {
        const pos = event.data.getLocalPosition(this.renderer.stage);
        this.rectifyBorderPolyline.push([pos.y, pos.x]);
        const verticeVisu = new PIXIGraphics();
        verticeVisu.cacheAsBitmap = true;
        verticeVisu.beginFill(0xFFFF00);
        verticeVisu.drawRect(0, 0, 1, 1);
        verticeVisu.x = Math.floor(pos.x);
        verticeVisu.y = Math.floor(pos.y);
        verticeVisu.endFill();
        const line = new PIXIGraphics();
        if (!this.rectifyBorderContainer.children.length) {
            this.rectifyBorderContainer.addChildAt(line, 0);
        }
        this.rectifyBorderContainer.addChild(verticeVisu);
    }

    protected onRectifyBorderMove(event: PIXI.interaction.InteractionEvent) {
        if (!this.rectifyBorderContainer.children.length) {
            return;
        }
        const pos = event.data.getLocalPosition(this.renderer.stage);
        const line = this.rectifyBorderContainer.children[0] as PIXIGraphics;
        line.clear();
        const nodes = [...this.rectifyBorderPolyline, [pos.y, pos.x]];
        line.lineStyle(1, 0X000, 1, 0.5, true);
        line.moveTo(nodes[0][1], nodes[0][0]);
        for (let i = 0; i < nodes.length - 1; i++) {
            line.lineTo(nodes[i+1][1], nodes[i+1][0]);
        }
    }

    protected rectifyBorder(polyline: any[]) {
        const res = rectifyFisheyeFromPolyline(this.gmask.getValue()!, polyline);
        const newMask = res.correctedMask;
        this.gmask.setValue(newMask);

        if (this.autoContours){
            const newPolys = this.getPolygons(this.selectedId);
            this.densePolygons = [...newPolys];
            this.updateDisplayedSelection();
        }
    }

    protected setPolygonHandler() {
        this.renderer.stage.interactive = true;
        this.renderer.stage.on('mousedown', this.pointerHandlers.CREATE_POLYGON);
        this.renderer.stage.on('pointermove', this.pointerHandlers.TEMP_POLYGON);
    }

    protected setSelectHandler() {
        this.renderer.stage.interactive = true;
        this.renderer.stage.on('mousedown', this.pointerHandlers.SELECTION_PICKER);
        window.addEventListener('keydown', this.keyHandlers.KEY_SELECTION, false);
    }

    protected lockClassHandler() {
        this.deselect();
        this.renderer.stage.interactive = true;
        this.renderer.stage.on('mousedown', this.pointerHandlers.LOCK_CLASS);
    }

    protected updateDisplayedSelection() {
        this.contours.clear();
        this.contours.lineStyle(1, 0X426eff, 1, 0.5, true);
        this.densePolygons.forEach((poly) => {
            this.drawDashedPolygon(poly.data);
        });
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

    protected onKeySelectionDown(evt: KeyboardEvent) {
        if (evt.key === 'Escape') {
            this.deselect();
        }
    }

    public deselect() {
        this.densePolygons = [];
        this.updateDisplayedSelection();
    }

    protected onKeyDown(evt: KeyboardEvent) {
        if (evt.key === 'Enter') {
            const polygon = this.tempContours.children[0] as PolygonShape;
            polygon.popNode();
            const vertices: any[] = new Array(0.5 * polygon.data.geometry.vertices.length)
                .fill(0)
                .map(() => {return {x: 0, y: 0}});
            polygon.data.geometry.vertices.forEach((v, idx) => {
                if (idx % 2 === 0) vertices[Math.floor(idx/2)].x = Math.round(v * this.renderer.imageWidth);
                else vertices[Math.floor(idx/2)].y = Math.round(v * this.renderer.imageHeight);
            });
            polygon.destroy();
            this.tempContours.removeChildren();

            if (this.mode === Mode.CREATE_INSTANCE || this.mode === Mode.ADD_TO_INSTANCE || this.mode === Mode.REMOVE_FROM_INSTANCE) {
                let fillType = 'add';
                let extrema = getPolygonExtrema(vertices);

                if (this.mode === Mode.CREATE_INSTANCE) {
                    const cls = this.gmask.clsMap.get(this.targetClass);
                    if (cls && cls[3]) {
                        const newIds = this.gmask.getNextId();
                        this.selectedId = [newIds[0], newIds[1], this.targetClass];
                    } else if (cls) {
                        // semantic class
                        this.selectedId = [0, 0, this.targetClass];
                    }
                } else {
                    extrema = extremaUnion(extrema, this.getDensePolysExtrema());
                    if (this.mode === Mode.REMOVE_FROM_INSTANCE)
                        fillType = 'remove';
                }
                this.gmask.updateByPolygon(vertices, this.selectedId, fillType);
                const newPolys = this.getPolygons(this.selectedId, extrema);
                this.densePolygons = [...newPolys];
            }
            this.updateDisplayedSelection();
            this.update();
        }
        else if (evt.key === 'Escape'){
            this.densePolygons = [];
            const polygon = this.tempContours.children[0] as PolygonShape;
            if (polygon) {
                polygon.destroy();
            }
            this.deselect();
            this.tempContours.removeChildren();
            this.updateDisplayedSelection();
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
        const newData = this.createMaskFromPolygons(this.densePolygons);
        this.gmask.updateValue(newData, id, fillType);
    }

    protected onPointerDownSelectionPolygon(evt: PIXI.interaction.InteractionEvent) {
        const newPos = evt.data.getLocalPosition(this.renderer.stage);
        const polygon = this.tempContours.children[0] as PolygonShape;
        const x = Math.max(Math.min(newPos.x, this.renderer.imageWidth), 0) / this.renderer.imageWidth;
        const y = Math.max(Math.min(newPos.y, this.renderer.imageHeight), 0) / this.renderer.imageHeight;

        if (polygon) {
            // add pts
            polygon.popNode();
            polygon.pushNode(x, y);
            polygon.pushNode(x, y);

        } else {
            window.removeEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            window.addEventListener('keydown', this.keyHandlers.KEY_POLYGON, false);
            const newPolygon = new PolygonShape(observable({id: '', color: 'red', geometry: {type: 'polygon', vertices: []}}));
            newPolygon.pushNode(x, y);
            newPolygon.pushNode(x, y);
            newPolygon.scaleX = this.renderer.imageWidth;
            newPolygon.scaleY = this.renderer.imageHeight;
            this.tempContours.addChild(newPolygon);
        }
    }

    protected onPointerMoveTempPolygon(evt: PIXI.interaction.InteractionEvent) {
        const newPos = evt.data.getLocalPosition(this.renderer.stage);
        const polygon = this.tempContours.children[0] as PolygonShape;
        const x = Math.max(Math.min(newPos.x, this.renderer.imageWidth), 0) / this.renderer.imageWidth;
        const y = Math.max(Math.min(newPos.y, this.renderer.imageHeight), 0) / this.renderer.imageHeight;

        if (polygon){
            polygon.popNode()
            polygon.pushNode(x, y)
        }
    }

    protected onPointerDownSelectInstance(evt: PIXI.interaction.InteractionEvent) {
        const newPos = evt.data.getLocalPosition(this.renderer.stage);
        const x = Math.floor(newPos.x);
        const y = Math.floor(newPos.y);
        const id = this.gmask.pixelId(x + y * this.gmask.canvas.width);
        if (Math.max(...id) === 0) {
            this.deselect();
            return;
        }
        this.selectedId = id;
        const newPolys = this.getPolygons(this.selectedId);
        this.densePolygons = [...newPolys];
        this.updateDisplayedSelection();
        this.emit('selection', this.selectedId);
    }

    protected onPointerDownLockClass(evt: PIXI.interaction.InteractionEvent){
        const newPos = evt.data.getLocalPosition(this.renderer.stage);
        const x = Math.floor(newPos.x);
        const y = Math.floor(newPos.y);
        const cls = this.gmask.pixelId(x + y * this.gmask.canvas.width)[2]
        this.gmask.lockClass(cls);
    }

    protected getDensePolysExtrema(): number[]{
        let xMin = 1000000;
        let xMax = 0;
        let yMin = 1000000;
        let yMax = 0;

        this.densePolygons.forEach((poly) => {
            poly.data.forEach((pt) => {
                if (pt.x < xMin) xMin = pt.x
                if (pt.x > xMax) xMax = pt.x
                if (pt.y < yMin) yMin = pt.y
                if (pt.y > yMax) yMax = pt.y
            });
        });
        return [xMin, yMin, xMax, yMax];
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

    /**
     * Returns all blobs contours of a mask whose id is equal to targetId
     * @param imageData a mask stored in an ImageData object, a pixel has 4 channels [id1, id2, cls, 'not used']
     * where 'id1' and 'id2' represent the instance id and 'cls' the class id.
     * @param targetId the id of the blobs to be found
     * @param extrema (optional) the box research zone [xMin, yMin, xMax, yMax]
     * @returns an array of contours (a contour is a dict {type:contour_type, data:contour_points} where contour_type is
     * the type of the contour ('external' or 'internal') and contour_points are the contour pixels (a pixel is a dict {x:x_value, y:y_value}))
     */
    protected blobExtraction(imageData: ImageData, targetId: [number, number, number], extrema?: number[]) {
        const data = new Array(imageData.width * imageData.width);

        if (!extrema) {
            for (let i = 0; i < imageData.width * imageData.width; i++){
                data[i] = fuseId(getPixelId(imageData, i))
            }
        }
        else {
            const [xMin, yMin, xMax, yMax] = extrema;
            for (let x = xMin; x < xMax; x++){
                for (let y = yMin; y < yMax; y++ ){
                    const i = x + y * imageData.width;
                    data[i] = fuseId(getPixelId(imageData, i))
                }
            }
        }
        const blobExtractor = new BlobExtractor(imageData.width, imageData.height, data, undefined, extrema);
        blobExtractor.extract(fuseId(targetId));

        const newPolys: DensePolygon[] = [];
        for (const [, blob] of blobExtractor.blobs) {
            blob.contours.forEach((contour: any) => {
                const arr = convertIndexToDict(contour.points, this.gmask.canvas.width + 1);
                newPolys.push({type: contour.type, data: arr});
            });
        }
        return newPolys;
    }

    /**
     * Returns all blobs contours of gmask whose id is equal to targetId. Basically
     * the same function a BlobExtraction but for fixed mask (gmask's one)
     * @param targetId the id of the blobs to be found
     * @param extrema (optional) the box research zone [xMin, yMin, xMax, yMax]
     */
    protected getPolygons(targetId: [number, number, number], extrema?: number[]): DensePolygon[] {
        const blobs = this.gmask.getBlobs(targetId, extrema);
        const newPolys: DensePolygon[] = [];
        for (const [, blob] of blobs) {
            blob.contours.forEach((contour) => {
                const arr = convertIndexToDict(contour.points, this.gmask.canvas.width + 1);
                newPolys.push({type: contour.type, data: arr});
            });
        }
        return newPolys;
    }


    /**
     * Remove all blobs with number of pixels below 'blobMinSize'
     * @param blobMinSize
     */
    public filterAll(blobMinSize: number) {
        const allfusedIds = this.gmask.getAllFusedIds();
        allfusedIds.forEach((id) => {
            this.filterId(unfuseId(id), blobMinSize)
        });
        if (this.mode === Mode.SELECT_INSTANCE) {
            const newPolys = this.getPolygons(this.selectedId);
            this.densePolygons = [...newPolys];
        }
        this.updateDisplayedSelection();
        this.update();
    }

    /**
     * Remove all blobs of selected id with number of pixels below 'blobMinSize'
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
}

/**
 * Convert an array of points stored using row order into an array of pixels (pixel format : {x:x_value, y:y_value})
 * @param indexes an array of points stored row order, indexes[0] => x=0,y=0, indexes[1] => x=1,y=0, ...
 * @param width the width of the image
 */
export function convertIndexToDict(indexes: number[], width: number): Point[] {
    return indexes.map((idx) => {
        const y = idx /  width | 0;
        const x = idx % width;
        return new Point(x, y);
    });
}
/**
 * Returns all pixels of the straight line between p1 and p2
 * @param p1 pixel format : {x:x_value, y:y_value}
 * @param p2 pixel format : {x:x_value, y:y_value}
 */
export function calcStraightLine (p1: Point, p2: Point): Point[] {
    const coordinatesArray: Point[] = [];
    // Translate coordinates
    let x1 = p1.x;
    let y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    // Define differences and error check
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    // Set first coordinates
    coordinatesArray.push(new Point(x1,y1));

    // Main loop
    while (!((x1 === x2) && (y1 === y2))) {
        const e2 = err << 1;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
        // Set coordinates
        coordinatesArray.push(new Point(x1,y1));
    }
    // Return the result
    return coordinatesArray;
}

/**
 * Returns all border pixels from a polygon defined from some vertices (3 vertices for a triangle for example)
 * @param polygon an array of vertices with vertex format {x:x_value, y:y_value}
 * @param ctType a string, whether 'external' or 'internal' to indicated the contour type
 */
export function densifyPolygon(polygon: Point[], ctType='external'): DensePolygon{
    const densePoly: Point[] = [];
    for(let i = 0; i < polygon.length; i++){
        const p1 = polygon[i];
        const p2 = i === polygon.length - 1 ? polygon[0] : polygon[i+1];
        const linePixels = calcStraightLine(p1, p2);
        densePoly.push(...linePixels.slice(0, -1));
    }
    return {type: ctType, data: densePoly};
}

/**
 * Check whether an array of vertices (defining a polygon) is ordered clockwise
 * @param polygon an array of vertices with vertex format {x:x_value, y:y_value}
 * @returns true if the array is ordered clockwise, false otherwise
 */
export function isClockwise(polygon: Point[]): boolean{
    let sum = 0;
    for(let i = 0; i < polygon.length; i++){
        const p1 = polygon[i];
        const p2 = i === polygon.length - 1 ? polygon[0] : polygon[i+1];
        sum += (p2.x - p1.x)*(p2.y + p1.y);
    }
    return sum < 0;
}


export function getPixelId(data: ImageData, idx: number) : [number, number, number] {
    const id1 = data.data[idx * 4];
    const id2 = data.data[idx * 4 + 1];
    const cls = data.data[idx * 4 + 2];
    return [id1, id2, cls];
}

const frag = `
    varying vec2 vTextureCoord;

    uniform sampler2D uSampler;
    uniform float uAlpha;

    void main(void)
    {
        gl_FragColor = texture2D(uSampler, vTextureCoord) * uAlpha;
}
`;

const vert = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat3 projectionMatrix;

    varying vec2 vTextureCoord;

    void main(void)
    {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
}
`;

class AlphaFilter extends PIXIFilter {
    constructor() { super(vert,frag); this.alpha = 1.0; }
    get alpha() { return this.uniforms.uAlpha; }
    set alpha(value) { this.uniforms.uAlpha = value; }
}

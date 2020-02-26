/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Container as PIXIContainer,
    Sprite as PIXISprite, Texture as PIXITexture,
    Point} from 'pixi.js';
import { BlobExtractor, RegBlob } from './blob-extractor';

const LOCKED_CLASS_COLOR = [200, 200, 200, 255];
const MASK_ALPHA_VALUE = 255;

const DISTINCT_COLORS: [number, number, number][] = [[230, 25, 75], [60, 180, 75], [255, 225, 25], [0, 130, 200],
  [245, 130, 48], [145, 30, 180], [70, 240, 240], [240, 50, 230], [210, 245, 60],
  [250, 190, 190], [0, 128, 128], [230, 190, 255], [170, 110, 40], [255, 250, 200],
  [128, 0, 0], [170, 255, 195], [128, 128, 0], [255, 215, 180], [0, 0, 128], [128, 128, 128]];

export enum MaskVisuMode {
    SEMANTIC = 'SEMANTIC',
    INSTANCE = 'INSTANCE',
}

export function fuseId(id: [number, number, number]): number{
    return 256 * 256 * id[0] + 256 * id[1] + id[2];
}

export function isInside(pt: Point, vs: Point[]): boolean {
    const x = pt.x;
    const y = pt.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const intersect = ((vs[i].y > y) !== (vs[j].y > y))
            && (x < (vs[j].x - vs[i].x) * (y - vs[i].y) / (vs[j].y - vs[i].y) + vs[i].x);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function  unfuseId(fId: number): [number, number, number] {
    let left = fId;
    const id1 = Math.floor(left / (256 * 256));
    left = left - 256 * 256 * id1;
    const id2 = Math.floor(left / 256)
    left = left - 256 * id2;
    return [id1, id2, left];
}

export function getPolygonExtrema(polygon: Point[]): number[] {
    let xMin = 100000;
    let xMax = 0;
    let yMin = 10000;
    let yMax = 0;

    polygon.forEach((pt) => {
      if (pt.x < xMin) xMin = pt.x
      if (pt.x > xMax) xMax = pt.x
      if (pt.y < yMin) yMin = pt.y
      if (pt.y > yMax) yMax = pt.y
    });
    return [xMin, yMin, xMax, yMax];
};

export function extremaUnion(extrema: number[], extrema2: number[]): number[]{
    let [xMin, yMin, xMax, yMax] = extrema;
    const [xMin2, yMin2, xMax2, yMax2] = extrema2;
    if (xMin2 < xMin) xMin = xMin2;
    if (yMin2 < yMin) yMin = yMin2;
    if (xMax2 > xMax) xMax = xMax2;
    if (yMax2 > yMax) yMax = yMax2;
    return [xMin, yMin, xMax, yMax];
}

export class GMask extends PIXIContainer {

    public colorMask: PIXISprite = new PIXISprite();

    private lockedClasses: Set<number> = new Set();

    private maxId = 0;

    // contains colored mask
    public canvas: HTMLCanvasElement;

    public pixels: ImageData;

    public ctx: CanvasRenderingContext2D;

    private origCanvas: HTMLCanvasElement;

    // original mask
    public orig: ImageData | null = null;

    // original mask with list form
    private augFusedMask: number[] = [];

    private tempPixels: ImageData | null = null;

    public maskVisuMode: MaskVisuMode = MaskVisuMode.INSTANCE;

    // [id1, id2, clsIdx, isInstance (instance = 1, semantic = 0)]
    public clsMap: Map<number, [number, number, number, number]> = new Map([
      [0, [0,0,0,0]],
      [1, [255,0,0,0]],
      [2, [0,255,0,1]]
    ]);

    constructor() {
        super();
        this.canvas = document.createElement('canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.pixels = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.origCanvas = document.createElement('canvas') as HTMLCanvasElement;
    }

    /**
     * Create and replace current PIXI Mask
     * @param maskArray
     * @returns maximum mask id
     */
    public initialize(maskArray: ImageData): [number, number] {
        this.canvas.width = maskArray.width;
        this.canvas.height = maskArray.height;
        this.colorMask.destroy();
        this.colorMask = new PIXISprite(PIXITexture.from(this.canvas));
        this.augFusedMask = new Array((this.canvas.width + 1) * (this.canvas.height + 1));
        this.removeChildren();
        this.addChild(this.colorMask);
        return this.setValue(maskArray);
    }

    setBase64(buffer: string) {
      if (typeof buffer !== 'string') {
        return;
      }
      const img = new Image();
      const self = this;
      img.onload = () => {
        self.canvas.width = img.width;
        self.canvas.height = img.height;
        self.colorMask.destroy();
        self.colorMask = new PIXISprite(PIXITexture.from(self.canvas));
        self.augFusedMask = new Array((self.canvas.width + 1) * (self.canvas.height + 1));
        self.removeChildren();
        self.addChild(self.colorMask);
        self.canvas.getContext('2d')!.drawImage(img, 0, 0, img.width, img.height);
        const maskArray = self.canvas.getContext('2d')!.getImageData(0, 0, self.canvas.width, self.canvas.height);
        self.setValue(maskArray);
      };
      img.src = `data:image/png;base64,${buffer.replace('data:image/png;base64,', '')}`;
    }

    public empty(w: number, h: number) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.colorMask.destroy();
        this.colorMask = new PIXISprite(PIXITexture.from(this.canvas));
        this.augFusedMask = new Array((this.canvas.width + 1) * (this.canvas.height + 1));
        this.removeChildren();
        this.addChild(this.colorMask);
        const maskArray = new ImageData(w, h);
        return this.setValue(maskArray);
    }

    public getNextId(): [number, number]{
        this.maxId++;
        return [Math.floor(this.maxId / 256), this.maxId % 256];
    }

    public getValue(): ImageData | null {
        return this.orig;
    }

    public getAllFusedIds(): Set<number> {
        const allfusedIds = new Set<number>()
        this.augFusedMask.forEach((fId) => {
            if (!allfusedIds.has(fId))
            allfusedIds.add(fId)
        });
        return allfusedIds;
    }

    public pixelToColor(id1: number, id2: number, cls: number): [number, number, number] {
        if (cls === 0)
            return [0, 0, 0];
        if (this.maskVisuMode === MaskVisuMode.INSTANCE) {
            const id = 65536 * cls + 256 * id1 + id2;
            return DISTINCT_COLORS[id % DISTINCT_COLORS.length];
        }
        if (this.maskVisuMode === MaskVisuMode.SEMANTIC) {
            const c = this.clsMap.get(cls);
            if (c) {
                return [c[0], c[1], c[2]];
            }
        }
        return [0, 0, 0];
    }

    /**
     * Update context of the mask canvas
     * Called when mask pixels should be set
     * @param maskArray imageData containing mask ids and classes
     * @returns maximum mask id
     * [0,1] => id
     * [2] => class
     * [3] => not used
     */
    public setValue(maskArray: ImageData): [number, number] {
        this.orig = maskArray;
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.maxId = 0;

        for (let x = 0; x < this.canvas.width; x++) {
            for (let y = 0; y < this.canvas.height; y++) {
                const i = x + y * this.canvas.width
                const [id1, id2, cls] = this.pixelId(i);
                this.augFusedMask[i + this.canvas.width + 3 + 2*y] = fuseId([id1, id2, cls]);
                const id = id1 * 256 + id2;
                if (id > this.maxId){
                    this.maxId = id
                }
                const color = this.pixelToColor(id1, id2, cls);
                const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
                pixels.data[i * 4] = color[0];
                pixels.data[i * 4 + 1] = color[1];
                pixels.data[i * 4 + 2] = color[2];
                pixels.data[i * 4 + 3] = alpha;
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update()
        return [Math.floor(this.maxId / 256), this.maxId % 256];
    }

    public pixelId(pos: number): [number, number, number]{
      const id1 = this.orig!.data[pos * 4];
      const id2 = this.orig!.data[pos * 4 + 1];
      const cls = this.orig!.data[pos * 4 + 2];
      return [id1, id2, cls]
    }

    public getMajorId(vertices: Point[], extrema: number[], id: [number, number, number]) {
        const [xMin, xMax, yMin, yMax] = extrema;
        const fusedId = fuseId(id);
        const foundIds = new Map<number, number>();
        const insideIndexes = new Array();
        const aroundIds = new Map<number, number>();
        for (let x = xMin - 1; x <= xMax; x++){
            for (let y = yMin - 1; y <= yMax; y++) {
                if (isInside(new Point(x,y), vertices)){
                    const idx = x + y * this.canvas.width;
                    const pixId = this.pixelId(idx);
                    if (fuseId(pixId) !== fusedId) {
                    const pixFusedId = fuseId(pixId);
                    const prev = foundIds.get(pixFusedId);
                    if (prev)
                        foundIds.set(pixFusedId, prev + 1);
                    else
                        foundIds.set(pixFusedId, 1);
                    }
                    else {
                        insideIndexes.push(idx)
                    }
                }
                else if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
                    const idx = x + y * this.canvas.width;
                    const pixId = this.pixelId(idx);
                    if (fuseId(pixId) !== fusedId){
                    const pixFusedId = fuseId(pixId);
                    const prev = aroundIds.get(pixFusedId);
                    if (prev)
                        aroundIds.set(pixFusedId, prev + 1);
                    else
                        aroundIds.set(pixFusedId, 1);
                    }
                }
            }
        }
        if (foundIds.size === 0) {
            if (aroundIds.size !== 0){
                return [unfuseId([...aroundIds.keys()].reduce((a, b) => {return aroundIds.get(a)! > aroundIds.get(b)! ? a : b })), insideIndexes]
            }
            else
                return [[0, 0, 0], insideIndexes];
        }
        else
            return [unfuseId([...foundIds.keys()].reduce((a, b) => {return foundIds.get(a)! > foundIds.get(b)! ? a : b })), insideIndexes];
    }

    public startBrushing(){
      this.tempPixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
    }

    public endBrushing(){
      this.ctx.putImageData(this.tempPixels!, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
      this.colorMask.texture.update();
    }

    public updateByPolygonTemp(polygon: Point[], id: [number, number, number], fillType='add'){
        const [xMin, yMin, xMax, yMax] = getPolygonExtrema(polygon);
        if (fillType === 'add') {
            const [id1, id2, cls] = id;
            const color = this.pixelToColor(id1, id2, cls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];
            for (let x = xMin; x <= xMax; x++){
                for (let y = yMin; y <= yMax; y++) {
                    if (isInside(new Point(x,y), polygon)){
                        const idx = (x + y * this.canvas.width) * 4;
                        if (!this.lockedClasses.has(this.orig!.data[idx + 2])) {
                            this.orig!.data[idx] = id1;
                            this.orig!.data[idx + 1] = id2;
                            this.orig!.data[idx + 2] = cls;
                            this.orig!.data[idx + 3] = 255;
                            this.augFusedMask[idx / 4 + this.canvas.width + 3 + 2 * y] = fuseId(id);
                        }
                        this.tempPixels!.data[idx] = displ[0];
                        this.tempPixels!.data[idx + 1] = displ[1];
                        this.tempPixels!.data[idx + 2] = displ[2];
                        this.tempPixels!.data[idx + 3] = displ[3];
                    }
                }
            }
        }
        else if (fillType === 'remove'){
            const [[rId1, rId2, rCls], insidePoints] = this.getMajorId(polygon, [xMin, xMax, yMin, yMax], id);
            const color = this.pixelToColor(rId1, rId2, rCls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            const displ = this.lockedClasses.has(rCls) ? LOCKED_CLASS_COLOR : [...color, alpha];
            insidePoints.forEach((idx) => {
                if (!this.lockedClasses.has(this.orig!.data[idx * 4 + 2])) {
                    const y = Math.floor(idx / this.canvas.width);
                    this.orig!.data[idx * 4] = rId1;
                    this.orig!.data[idx * 4 + 1] = rId2;
                    this.orig!.data[idx * 4 + 2] = rCls;
                    this.orig!.data[idx * 4 + 3] = 255;
                    const fId = fuseId([rId1, rId2, rCls]);
                    this.augFusedMask[idx + this.canvas.width + 3 + 2 * y] = fId;
                }
                this.tempPixels!.data[idx * 4] = displ[0];
                this.tempPixels!.data[idx * 4 + 1] = displ[1];
                this.tempPixels!.data[idx * 4 + 2] = displ[2];
                this.tempPixels!.data[idx * 4 + 3] = displ[3];
            });
        }
    }

    public updateByPolygon(polygon: Point[], id: [number, number, number], fillType='add') {
        const pixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
        const [xMin, yMin, xMax, yMax] = getPolygonExtrema(polygon);
        if (fillType === 'add') {
            const [id1, id2, cls] = id;
            const color = this.pixelToColor(id1, id2, cls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];
            for (let x = xMin; x <= xMax; x++) {
                for (let y = yMin; y <= yMax; y++) {
                    if (isInside(new Point(x,y), polygon)){
                        const idx = (x + y * this.canvas.width) * 4;
                        if (!this.lockedClasses.has(this.orig!.data[idx + 2])) {
                            this.orig!.data[idx] = id1;
                            this.orig!.data[idx + 1] = id2;
                            this.orig!.data[idx + 2] = cls;
                            this.orig!.data[idx + 3] = 255;
                            this.augFusedMask[idx / 4 + this.canvas.width + 3 + 2 * y] = fuseId(id);
                        }
                        pixels.data[idx] = displ[0];
                        pixels.data[idx + 1] = displ[1];
                        pixels.data[idx + 2] = displ[2];
                        pixels.data[idx + 3] = displ[3];
                    }
                }
            }
        }
        else if (fillType === 'remove'){
            const [[rId1, rId2, rCls], insidePoints] = this.getMajorId(polygon, [xMin, xMax, yMin, yMax], id);
            const color = this.pixelToColor(rId1, rId2, rCls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            const displ = this.lockedClasses.has(rCls) ? LOCKED_CLASS_COLOR : [...color, alpha];
            insidePoints.forEach((idx) => {
                if (!this.lockedClasses.has(this.orig!.data[idx * 4 + 2])) {
                    const y = Math.floor(idx / this.canvas.width);
                    this.orig!.data[idx * 4] = rId1;
                    this.orig!.data[idx * 4 + 1] = rId2;
                    this.orig!.data[idx * 4 + 2] = rCls;
                    this.orig!.data[idx * 4 + 3] = 255;
                    const fId = fuseId([rId1, rId2, rCls]);
                    this.augFusedMask[idx + this.canvas.width + 3 + 2 * y] = fId;
                }
                pixels.data[idx * 4] = displ[0];
                pixels.data[idx * 4 + 1] = displ[1];
                pixels.data[idx * 4 + 2] = displ[2];
                pixels.data[idx * 4 + 3] = displ[3];
            })
        }
        this.ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public getBlobs(id: [number, number, number], extrema? : number[]): Map<number, RegBlob> {
        const blobExtractor = new BlobExtractor(this.canvas.width, this.canvas.height, undefined, this.augFusedMask, extrema);
        blobExtractor.extract(fuseId(id));
        return blobExtractor.blobs;
    }

    public getBase64() {
        if (this.orig) {
            this.origCanvas.width = this.canvas.width;
            this.origCanvas.height = this.canvas.height;
            const c = this.origCanvas.getContext('2d')!;
            c.putImageData(this.orig!, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
            const base64 = c.canvas.toDataURL('image/png');
            return base64;
        } else {
            return '';
        }
    }

    public updateValue(maskArray: ImageData, id: [number, number, number], fillType='unite'){
        const [id1, id2, cls] = id;
        const fusedId = fuseId(id)
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const color = this.pixelToColor(id1, id2, cls);
        const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
        const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];

        for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
            if (!this.lockedClasses.has(this.orig!.data[i * 4 + 2]) && maskArray.data[i * 4] === 1) {
                const idx = i * 4;
                if ((fillType === 'replace' || fillType === 'unite')
                    || fillType === 'subtract' && fuseId(this.pixelId(i)) === fusedId) {
                    this.orig!.data[idx] = id1;
                    this.orig!.data[idx + 1] = id2;
                    this.orig!.data[idx + 2] = cls;
                    this.orig!.data[idx + 3] = 255;
                }
                pixels.data[idx] = displ[0];
                pixels.data[idx + 1] = displ[1];
                pixels.data[idx + 2] = displ[2];
                pixels.data[idx + 3] = displ[3];
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    /**
     * Lock a class (or unlock if already locked)
     * @param cls class id
     */
    public lockClass(cls: number){
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (this.lockedClasses.has(cls)) {
            this.lockedClasses.delete(cls);
            for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
                const idx = i * 4;
                const pixId1 = this.orig!.data[idx];
                const pixId2 = this.orig!.data[idx + 1];
                const pixCls = this.orig!.data[idx + 2];
                if (pixCls === cls) {
                    const color = this.pixelToColor(pixId1, pixId2, pixCls);
                    const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
                    pixels.data[idx] = color[0];
                    pixels.data[idx + 1] = color[1];
                    pixels.data[idx + 2] = color[2];
                    pixels.data[idx + 3] = alpha;
                }
            }
        } else {
            this.lockedClasses.add(cls);
            for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
                const idx = i * 4;
                const pixCls = this.orig!.data[idx + 2];
                if (pixCls === cls){
                    pixels.data[idx] = LOCKED_CLASS_COLOR[0];
                    pixels.data[idx + 1] = LOCKED_CLASS_COLOR[1];
                    pixels.data[idx + 2] = LOCKED_CLASS_COLOR[2];
                    pixels.data[idx + 3] = LOCKED_CLASS_COLOR[3];
                }
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }
}
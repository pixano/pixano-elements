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
import { fuseId, unfuseId, isInside, getPolygonExtrema, distinctColors } from './utils-mask';

const LOCKED_CLASS_COLOR: [number, number, number] = [200, 200, 200];
const MASK_ALPHA_VALUE = 255;

export enum MaskVisuMode {
    SEMANTIC = 'SEMANTIC',
    INSTANCE = 'INSTANCE',
}

/**
 * Segmentation mask containing class and id of each pixel.
 * Two colorization modes: semantic (1 class = 1 color) and instance (1 instance = 1 color)
 */
export class GMask extends PIXIContainer {

    public colorMask: PIXISprite = new PIXISprite();

    // fused ids that cannot be edited
    public lockedInstances: Set<number> = new Set();

    // contains colored mask
    public canvas: HTMLCanvasElement;

    public pixels: ImageData;

    public ctx: CanvasRenderingContext2D;

    private origCanvas: HTMLCanvasElement;

    // original mask
    public orig: ImageData | null = null;

    private tempPixels: ImageData | null = null;

    public maskVisuMode: MaskVisuMode = MaskVisuMode.INSTANCE;

    // set of all instance ids
    // [id1, id2, cls] => id = id1 + 256 * id2 + 256 * 256 * cls
    public fusedIds: Set<number> = new Set();

    // [r, g, b, isInstance (instance = 1, semantic = 0)]
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
    public initialize(maskArray: ImageData) {
        this.canvas.width = maskArray.width;
        this.canvas.height = maskArray.height;
        this.colorMask.destroy();
        this.colorMask = new PIXISprite(PIXITexture.from(this.canvas));
        this.removeChildren();
        this.addChild(this.colorMask);
        this.setValue(maskArray);
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
        this.removeChildren();
        this.addChild(this.colorMask);
        this.orig = new ImageData(w, h);
        this.fusedIds.clear();
        // empty color
        const ctx = this.canvas.getContext('2d')!;
        ctx.putImageData(new ImageData(w, h), 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public getNextId(): [number, number] {
        // remove class notion from ids
        const instanceIds = new Set([...this.fusedIds].map((i) => Math.floor(i % (256 * 256))));
        const newId = new Array(256*256 - 1).findIndex((_,v) => !instanceIds.has(v + 1)) + 1;
        return [newId % 256, Math.floor(newId / 256)];
    }

    public getValue(): ImageData | null {
        return this.orig;
    }

    public pixelToColor(id1: number, id2: number, cls: number): [number, number, number] {
        if (cls === 0)
            return [0, 0, 0];
        if (this.maskVisuMode === MaskVisuMode.INSTANCE) {
            const id = fuseId([id1, id2, cls]);
            return distinctColors[id % distinctColors.length];
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
    public setValue(maskArray: ImageData) {
        this.orig = maskArray;
        this.fusedIds.clear();
        for (let x = 0; x < this.canvas.width; x++) {
            for (let y = 0; y < this.canvas.height; y++) {
                const [id1, id2, cls] = this.pixelId(x + y * this.canvas.width);
                this.fusedIds.add(fuseId([id1, id2, cls]));
            }
        }
        this.recomputeColor();
    }

    public recomputeColor() {
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        for (let x = 0; x < this.canvas.width; x++) {
            for (let y = 0; y < this.canvas.height; y++) {
                const i = x + y * this.canvas.width
                const [id1, id2, cls] = this.pixelId(i);
                const fId = fuseId([id1, id2, cls]);
                this.fusedIds.add(fId);
                let color = this.pixelToColor(id1, id2, cls);
                color = this.lockedInstances.has(fId) ? LOCKED_CLASS_COLOR : color;
                const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
                pixels.data[i * 4] = color[0];
                pixels.data[i * 4 + 1] = color[1];
                pixels.data[i * 4 + 2] = color[2];
                pixels.data[i * 4 + 3] = alpha;
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
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
                    if (fuseId(pixId) !== fusedId) {
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

    public updateByMaskInRoi(mask: Float32Array, box: [number, number, number, number], newVal: [number, number, number]) {
        const pixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
        const width = box[2]-box[0];
        const height = box[3]-box[1];
        const color = this.pixelToColor(...newVal);
        const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
        const [id1, id2, cls] = newVal;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const idx = (x + box[0] + (y + box[1]) * this.canvas.width);
                if (mask[y * width + x] == 1) {
                    this.orig!.data[4 * idx] = id1;
                    this.orig!.data[4 * idx + 1] = id2;
                    this.orig!.data[4 * idx + 2] = cls;
                    this.orig!.data[4 * idx + 3] = 255;
                    pixels.data[4 * idx] = color[0];
                    pixels.data[4 * idx + 1] = color[1];
                    pixels.data[4 * idx + 2] = color[2];
                    pixels.data[4 * idx + 3] = alpha;
                }
            }
        }
        this.ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public updateByMask(mask: Float32Array, pos: {x: number, y: number}, newVal: [number, number, number]) {
        const pixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
        let size = Math.sqrt(mask.length);
        const color = this.pixelToColor(...newVal);
        const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
        pos.x -= 0.5 * size;
        pos.y -= 0.5 * size;
        const [id1, id2, cls] = newVal;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const idx = (x + pos.x + (y + pos.y) * this.canvas.width);
                if (mask[y * size + x] == 1) {
                    this.orig!.data[4 * idx] = id1;
                    this.orig!.data[4 * idx + 1] = id2;
                    this.orig!.data[4 * idx + 2] = cls;
                    this.orig!.data[4 * idx + 3] = 255;
                    pixels.data[4 * idx] = color[0];
                    pixels.data[4 * idx + 1] = color[1];
                    pixels.data[4 * idx + 2] = color[2];
                    pixels.data[4 * idx + 3] = alpha;
                }
            }
        }
        this.ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public updateByPolygon(polygon: Point[], id: [number, number, number], fillType='add') {
        const pixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
        const [xMin, yMin, xMax, yMax] = getPolygonExtrema(polygon);
        if (this.lockedInstances.has(fuseId(id))) {
            // do not update locked instances
            return;
        }
        if (fillType === 'add') {
            const [id1, id2, cls] = id;
            const color = this.pixelToColor(id1, id2, cls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            for (let x = xMin; x <= xMax; x++) {
                for (let y = yMin; y <= yMax; y++) {
                    if (isInside(new Point(x,y), polygon)){
                        const idx = (x + y * this.canvas.width);
                        const pixId = this.pixelId(idx);
                        if (!this.lockedInstances.has(fuseId(pixId))) {
                            this.orig!.data[4 * idx] = id1;
                            this.orig!.data[4 * idx + 1] = id2;
                            this.orig!.data[4 * idx + 2] = cls;
                            this.orig!.data[4 * idx + 3] = 255;
                            pixels.data[4 * idx] = color[0];
                            pixels.data[4 * idx + 1] = color[1];
                            pixels.data[4 * idx + 2] = color[2];
                            pixels.data[4 * idx + 3] = alpha;
                        }
                    }
                }
            }
        } else if (fillType === 'remove') {
            const [[rId1, rId2, rCls], insidePoints] = this.getMajorId(polygon, [xMin, xMax, yMin, yMax], id);
            const color = this.pixelToColor(rId1, rId2, rCls);
            const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
            insidePoints.forEach((idx) => {
                const pixId = this.pixelId(idx);
                if (!this.lockedInstances.has(fuseId(pixId))) {
                    this.orig!.data[idx * 4] = rId1;
                    this.orig!.data[idx * 4 + 1] = rId2;
                    this.orig!.data[idx * 4 + 2] = rCls;
                    this.orig!.data[idx * 4 + 3] = 255;
                    pixels.data[idx * 4] = color[0];
                    pixels.data[idx * 4 + 1] = color[1];
                    pixels.data[idx * 4 + 2] = color[2];
                    pixels.data[idx * 4 + 3] = alpha;
                }
            })
        }
        this.ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public getBlobs(id: [number, number, number], extrema? : number[]): Map<number, RegBlob> {
        const blobExtractor = new BlobExtractor(this.orig!, extrema);
        blobExtractor.extract(id);
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

    public replaceValue(prev: [number, number, number], curr: [number, number, number]) {
        const [id1, id2, cls] = curr;
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const color = this.pixelToColor(id1, id2, cls);
        const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
        for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
            const pixId = this.pixelId(i);
            if (pixId[0] === prev[0] && pixId[1] === prev[1] && pixId[2] === prev[2]) {
                const idx = i * 4;
                this.orig!.data[idx] = id1;
                this.orig!.data[idx + 1] = id2;
                this.orig!.data[idx + 2] = cls;
                this.orig!.data[idx + 3] = 255;
                pixels.data[idx] = color[0];
                pixels.data[idx + 1] = color[1];
                pixels.data[idx + 2] = color[2];
                pixels.data[idx + 3] = alpha;
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }

    public updateValue(maskArray: ImageData, id: [number, number, number], fillType='unite') {
        if (this.lockedInstances.has(fuseId(id))) {
            // do not update locked instances
            return;
        }
        const [id1, id2, cls] = id;
        const fusedId = fuseId(id)
        const ctx = this.canvas.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const color = this.pixelToColor(id1, id2, cls);
        const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
        for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
            const pixId = this.pixelId(i);
            if (!this.lockedInstances.has(fuseId(pixId)) && maskArray.data[i * 4] === 1) {
                const idx = i * 4;
                if ((fillType === 'replace' || fillType === 'unite')
                    || fillType === 'subtract' && fuseId(this.pixelId(i)) === fusedId) {
                    this.orig!.data[idx] = id1;
                    this.orig!.data[idx + 1] = id2;
                    this.orig!.data[idx + 2] = cls;
                    this.orig!.data[idx + 3] = 255;
                    pixels.data[idx] = color[0];
                    pixels.data[idx + 1] = color[1];
                    pixels.data[idx + 2] = color[2];
                    pixels.data[idx + 3] = alpha;
                }
            }
        }
        ctx.putImageData(pixels, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
        this.colorMask.texture.update();
    }
}

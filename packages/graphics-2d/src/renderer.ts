/**
 * Custom implementation of renderer.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as PIXI from 'pixi.js';

import { colorToHex, hexToRgb255 } from './utils';

// Pixi.js Warning: gl.getProgramInfoLog() Programs with more than
// 16 samplers are disallowed on Mesa drivers to avoid crashing.
PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES , 16);

interface RendererOptions {
    color?: string;
    container?: HTMLDivElement
}

/**
 * PxnRenderer is an class used to draw object annotation on the
 * screen.
 */
export class Renderer extends PIXI.Application {

    // canvas renderable area
    public rw: number = 800;

    public rh: number = 800;

    // canvas renderable offset
    public rx: number = 0;

    public ry: number = 0;

    public s: number = 0.95;

    public smin: number = 0.95;

    public smax: number = 40;

    // offset due to zoom scale
    public sx: number = 0;

    public sy: number = 0;

    public htmlImageElement = new Image();

    public backgroundSprite: PIXI.Sprite = new PIXI.Sprite();

    public labelLayer = new PIXI.Container();

    public enableOutsideDrawing: boolean = false;

    public domElement: HTMLElement = document.createElement('div');

    public bubbles: HTMLElement[] = [];

    private mouseCoordinates: HTMLElement = document.createElement('span');

    private _brightness: number = 1;

    private filter: any = new PIXI.filters.ColorMatrixFilter();

    /**
     * Getter of the canvas width
     */
    get canvasWidth() {
        return (this.domElement.parentNode as HTMLElement)?.offsetWidth || this.domElement.offsetWidth || 800;
    }

    /**
     * Getter of the canvas height
     */
    get canvasHeight() {
        return (this.domElement.parentNode as HTMLElement)?.offsetHeight || this.domElement.offsetHeight || 800;
    }

    get imageWidth() {
        return Math.round(this.htmlImageElement.width);
    }

    get imageHeight() {
        return Math.round(this.htmlImageElement.height);
    }

    get imageBase64() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.height = this.htmlImageElement.height;
        canvas.width = this.htmlImageElement.width;
        ctx.drawImage(this.htmlImageElement, 0, 0);
        return canvas.toDataURL('image/jpg');
    }

    /**
     * Set background image and computes its dimensions
     * to fit renderer HTML view.
     */
    set image(img: HTMLImageElement) {
        if (img === this.htmlImageElement || img === null) {
            return;
        }
        let notifyNewImageSize = false;
        const base = new PIXI.BaseTexture(img);
        const texture = new PIXI.Texture(base);
        // prevent memory leak
        this.backgroundSprite.texture.destroy(true);
        this.backgroundSprite = new PIXI.Sprite(texture);
        this.computeDrawableArea(this.canvasWidth, this.canvasHeight, img.width, img.height);
        if (img.width !== this.htmlImageElement.width ||
            img.height !== this.htmlImageElement.height) {
            // reset pan offset if the image has new dimensions
            this.sx = 0.5 * (1 - this.s) * this.rw;
            this.sy = 0.5 * (1 - this.s) * this.rh;
            notifyNewImageSize = true;
        }
        this.htmlImageElement = img;
        if (this.stage.children.length > 0) {
            this.stage.removeChildAt(0);
        }
        // stage size is determined by its background size
        this.stage.addChildAt(this.backgroundSprite, 0);
        this.stage.scale.set(this.s * this.rw / this.image.width, this.s * this.rh / this.image.height);
        this.stage.position.set(this.rx * this.s + this.sx, this.ry * this.s + this.sy);
        this.stage.hitArea = new PIXI.Rectangle(-this.stage.position.x / this.stage.scale.x,
            -this.stage.position.y / this.stage.scale.y,
            this.canvasWidth / this.stage.scale.x,
            this.canvasHeight / this.stage.scale.y);
        this.backgroundSprite.filters = [this.filter];
        if (notifyNewImageSize) {
            this.onImageSizeChange();
        }
    }

    get image() {
        return this.htmlImageElement;
    }

    get brightness() {
        return this._brightness;
    }

    set brightness(brightness: number) {
        this._brightness = brightness;
        this.filter.brightness(this._brightness, false);
        this.backgroundSprite.filters = [this.filter];
    }

    get mouse() {
        const mouse = this.stage.toLocal(this.renderer.plugins.interaction.mouse.global);
        const pt = {x: Math.round(mouse.x), y: Math.round(mouse.y)};
        pt.x = Math.min(Math.max(0, pt.x), this.imageWidth);
        pt.y = Math.min(Math.max(0, pt.y), this.imageHeight);
        return pt;
    }

    constructor(options?: RendererOptions) {
        super({backgroundColor: (options && options.color) ? parseInt(colorToHex(options.color).replace(/^#/, ''), 16) : 0Xe5e5e5});
        if (options && options.container) {
            this.setContainer(options.container);
        }
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        // PIXI.settings.ROUND_PIXELS = true;
        this.stage.addChildAt(this.backgroundSprite, 0);
        this.stage.addChild(this.labelLayer);
        this.stage.interactive = true;
        this.filter.matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0,
        ];
        this.domElement.appendChild(this.view);
        this.initMouseCoordinates();
        window.addEventListener('resize', this.resizeWindow.bind(this));
    }

    public onImageSizeChange() {}

    public setContainer(container: HTMLDivElement = document.createElement('div')) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        container.appendChild(this.domElement);
        const rgb = hexToRgb255(this.renderer.backgroundColor);
        container.style.backgroundColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        this.resizeTo = container;
        this.resize();
        // this.addBubble();
    }

    public setBackgroundColor(color: string) {
        this.renderer.backgroundColor = parseInt(colorToHex(color).replace(/^#/, ''), 16);
    }

    /**
     * Return normalized coordinate in the image system
     * @param x absolute x coordinate in the html canvas system
     */
    public normalizeX(x: number) {
        return x / this.image.width;
    }

    /**
     * Return normalized coordinate in the image system
     * @param y absolute y coordinate in the html canvas system
     */
    public normalizeY(y: number) {
        return y / this.image.height;
    }

    /**
     * Return normalized coordinate in the image system
     * @param pt absolute coordinate in the html canvas system
     */
    public normalize(pt: {x: number, y: number}) {
        return {x: pt.x / this.image.width, y: pt.y / this.image.height};
    }

    /**
     * Return normalized coordinate in the image system
     * @param x absolute x coordinate in the html canvas system
     */
    public denormalizeX(x: number) {
        return x * this.image.width;
    }

    /**
     * Return normalized coordinate in the image system
     * @param y absolute y coordinate in the html canvas system
     */
    public denormalizeY(y: number) {
        return y * this.image.height;
    }

    /**
     * Get position from interaction event
     * @param data
     */
    public getPosition(data: PIXI.InteractionData): {x: number, y: number} {
        const mouseData = data.getLocalPosition(this.stage);
        const pt = {x: Math.round(mouseData.x), y: Math.round(mouseData.y)};
        if (!this.enableOutsideDrawing) {
            pt.x = Math.min(Math.max(0, pt.x), this.imageWidth);
            pt.y = Math.min(Math.max(0, pt.y), this.imageHeight);
        }
        return pt;
    }

    /**
     * Position relative to stage to absolution canvas position
     * @param x 
     * @param y 
     */
    public toAbsolutePosition(x: number, y: number): {x: number, y: number} {
        return this.stage.toGlobal({x, y});
    }

    /**
     * Compute drawable area based on canvas dimensions and image size.
     * Change rh, rw, rw, ry
     * @param canvasWidth width of html canvas
     * @param canvasHeight height of html canvas
     * @param imageWidth width of background image
     * @param imageHeight height of background image
     */
    public computeDrawableArea(canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number, forceCompute: boolean = false) {
        if (imageWidth === this.imageWidth && imageHeight === this.imageHeight && !forceCompute) {
            // if image dimension is the same as previously
            // do not recompute canvas position
            return;
        }
        const imageAspectRatio = imageWidth / imageHeight;
        // canvas full dimensions
        const canvasAspectRatio = canvasWidth / canvasHeight;

        // If image's aspect ratio is less than canvas's we fit on height
        // and place the image centrally along width
        if (imageAspectRatio < canvasAspectRatio) {
            this.rh = canvasHeight;
            this.rw = imageWidth * (this.rh / imageHeight);
            this.rx = (canvasWidth - this.rw) / 2;
            this.ry = 0;
        } else if (imageAspectRatio > canvasAspectRatio) {
            // If image's aspect ratio is greater than canvas's we fit on width
            // and place the image centrally along height
            this.rw = canvasWidth;
            this.rh = imageHeight * (this.rw / imageWidth);
            this.rx = 0;
            this.ry = (canvasHeight - this.rh) / 2;
        } else {
            // Happy path - keep aspect ratio
            this.rh = canvasHeight;
            this.rw = canvasWidth;
            this.rx = 0;
            this.ry = 0;
        }
        this.sx = 0.5 * (1 - this.s) * this.rw;
        this.sy = 0.5 * (1 - this.s) * this.rh;
    }


    /**
     * Compute dimensions based on the HTML renderer view
     */
    public resizeWindow() {
        if (this.htmlImageElement && this.htmlImageElement.width) {
            this.s = this.smin;
            this.sx = 0.5 * (1 - this.s) * this.rw;
            this.sy = 0.5 * (1 - this.s) * this.rh;
            this.computeDrawableArea(this.canvasWidth, this.canvasHeight,
                                    this.htmlImageElement.width, this.htmlImageElement.height, true);
            this.stage.scale.set(this.s * this.rw / this.image.width, this.s * this.rh / this.image.height);
            this.stage.position.set(this.rx * this.s + this.sx, this.ry * this.s + this.sy);
            this.stage.hitArea = new PIXI.Rectangle(-this.stage.position.x / this.stage.scale.x,
              -this.stage.position.y / this.stage.scale.y,
              this.canvasWidth / this.stage.scale.x,
              this.canvasHeight / this.stage.scale.y);
        }
        this.renderer.resize(this.view.offsetWidth, this.view.offsetHeight);
    }

    set showLabels(isVisible: boolean) {
        this.labelLayer.visible = isVisible;
    }

    public clearLabels() {
        this.labelLayer.removeChildren();
    }

    /**
     * Reorder children for z-index
     * @param el PIXI.Container
     */
    public bringToFront(el: PIXI.Container) {
        const arr = this.labelLayer.children;
        arr.splice( arr.indexOf(el), 1);
        arr.push(el);
    }

    public delete(s: PIXI.Container) {
        s.destroy();
    }

    public initMouseCoordinates() {
        this.mouseCoordinates.appendChild(document.createTextNode('oy'));
        this.mouseCoordinates.style.position = 'absolute';
        this.mouseCoordinates.style.padding = '5px';
        this.mouseCoordinates.style.bottom = '0px';
        this.mouseCoordinates.style.right = '0px';
        this.mouseCoordinates.style.background = '#f3f3f58f';
        this.mouseCoordinates.style[('pointer-events' as any)] = 'none';
        this.domElement.appendChild(this.mouseCoordinates);
    }

    public updateMouseCoordinates() {
        const mouse = this.stage.toLocal(this.renderer.plugins.interaction.mouse.global);
        const x = Math.floor(Math.max(Math.min(mouse.x, this.imageWidth),0));
        const y = Math.floor(Math.max(Math.min(mouse.y, this.imageHeight),0));
        this.mouseCoordinates.firstChild!.textContent = `(${x}px,${y}px)`;
    }

    public addBubble() {
        const span = document.createElement('span');
        span.appendChild(document.createTextNode(''));
        span.style.position = 'absolute';
        span.style[('pointer-events' as any)] = 'none';
        this.domElement.appendChild(span);
        this.bubbles.push(span);
    }

    public moveBubble(x: number, y: number, text?: string) {
        if (this.bubbles.length) {
            this.bubbles[0].style.left = `${Math.floor(x)}px`;
            this.bubbles[0].style.top = `${Math.floor(y)}px`;
            if (text) {
                this.bubbles[0].firstChild!.textContent = text;
            }
        }
    }

    public removeBubbles() {
        this.bubbles.forEach((b) => this.domElement.removeChild(b));
        this.bubbles = [];
    }

    public destroy() {
        super.destroy(true, {children: true, texture: true, baseTexture: true})
    }
}

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

import { Shape } from './shapes-2d';

interface RendererOptions {
    color?: string;
    container?: HTMLDivElement
}

/**
 * PxnRenderer is an class used to draw object annotation on the
 * screen.
 */
export class PxnRenderer extends PIXI.Application {

    public objects: Shape[] = [];

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

    get imageWidth() {
        return Math.round(this.htmlImageElement.width);
    }

    get imageHeight() {
        return Math.round(this.htmlImageElement.height);
    }

    get mouse() {
        return this.stage.toLocal(this.renderer.plugins.interaction.mouse.global);
    }

    constructor(options?: RendererOptions) {
        super({backgroundColor: (options && options.color) ? parseInt(colorToHex(options.color).replace(/^#/, ''), 16) : 0Xe5e5e5});
        if (options && options.container) {
            this.setContainer(options.container);
        }
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        this.stage.addChildAt(this.backgroundSprite, 0);
        this.stage.addChild(this.labelLayer);
        this.stage.interactive = true;
        window.addEventListener('resize', this.resizeWindow.bind(this));
    }

    public setContainer(container: HTMLDivElement = document.createElement('div')) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        container.appendChild(this.view);
        const rgb = hexToRgb255(this.renderer.backgroundColor);
        container.style.backgroundColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        this.resizeTo = container;
        this.resize();
    }

    /**
     * Set background image and computes its dimensions
     * to fit renderer HTML view.
     */
    set image(img: HTMLImageElement) {
      const base = new PIXI.BaseTexture(img);
      const texture = new PIXI.Texture(base);
      // prevent memory leak
      this.backgroundSprite.texture.destroy(true);
      this.backgroundSprite = new PIXI.Sprite(texture);
      // this.backgroundSprite.visible = false; // DEBUG
      this.computeDrawableArea(this.canvasWidth, this.canvasHeight, img.width, img.height);
      if (img.width !== this.htmlImageElement.width ||
          img.height !== this.htmlImageElement.height) {
          // reset pan offset if the image has new dimensions
          this.sx = 0.5 * (1 - this.s) * this.rw;
          this.sy = 0.5 * (1 - this.s) * this.rh;
      }
      this.htmlImageElement = img;
      this.objects.forEach((o) => {
          o.scaleX = img.width;
          o.scaleY = img.height;
          o.draw();
      })
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
      this.objects.forEach((o: Shape) => {
          o.scaleX = this.image.width;
          o.scaleY = this.image.height;
      });
    }

    get image() {
        return this.htmlImageElement;
    }

    /**
     * Compute drawable area based on canvas dimensions and image size.
     * Change rh, rw, rw, ry
     * @param canvasWidth width of html canvas
     * @param canvasHeight height of html canvas
     * @param imageWidth width of background image
     * @param imageHeight height of background image
     */
    public computeDrawableArea(canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) {
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
        // remember pan (?)
        // if sx and sy are set to 0
        // use existing value
        if (!this.sx && !this.sy) {
            this.sx = 0.5 * (1 - this.s) * this.rw;
            this.sy = 0.5 * (1 - this.s) * this.rh;
        }
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
     * Getter of the canvas width
     */
    get canvasWidth() {
        try {
            return (this.view.parentNode as HTMLDivElement).offsetWidth
        } catch {
            return 800;
        }
    }

    /**
     * Getter of the canvas height
     */
    get canvasHeight() {
        try {
            return (this.view.parentNode as HTMLDivElement).offsetHeight
        } catch {
            return 800;
        }
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
                                    this.htmlImageElement.width, this.htmlImageElement.height);
            this.stage.scale.set(this.s * this.rw / this.image.width, this.s * this.rh / this.image.height);
            this.stage.position.set(this.rx * this.s + this.sx, this.ry * this.s + this.sy);
            this.stage.hitArea = new PIXI.Rectangle(-this.stage.position.x / this.stage.scale.x,
              -this.stage.position.y / this.stage.scale.y,
              this.canvasWidth / this.stage.scale.x,
              this.canvasHeight / this.stage.scale.y);
        }
        this.renderer.resize(this.view.offsetWidth, this.view.offsetHeight);
    }

    set showObjects(isVisible: boolean) {
        this.labelLayer.visible = isVisible;
    }

    add(s: Shape) {
        this.objects.push(s);
        s.scaleX = this.image.width || 100;
        s.scaleY = this.image.height || 100;
        this.labelLayer.addChild(s);
        s.draw();
        return s;
    }

    remove(id: string) {
        const s = this.objects.find((o) => o.data.id === id);
        if (s) {
          this.labelLayer.removeChild(s);
        }
    }

    clearObjects() {
        this.labelLayer.removeChildren();
        this.objects = [];
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

    public delete(s: Shape) {
        s.destroy();
    }

    public destroy() {
        super.destroy(true, {children: true, texture: true, baseTexture: true})
    }
}


/**
 * Implementation of 2d canvas view controls.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Renderer } from './renderer';
import { Rectangle as PIXIRectangle } from 'pixi.js';

export class ViewControls extends EventTarget {

    private init: {x: number, y: number} = {x: 0, y: 0};

    private isPanning: boolean = false;

    protected viewer: Renderer;

    constructor(viewer?: Renderer) {
        super();
        this.viewer = viewer || new Renderer();
        // necessity to store listener as variable
        // to keep ability to removelistener
        this.onPanInit = this.onPanInit.bind(this);
        this.onPan = this.onPan.bind(this);
        this.onPanUp = this.onPanUp.bind(this);
        this.onEdgeMove = this.onEdgeMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        if (viewer) {
            this.viewer.view.addEventListener('wheel', this.onWheel, {passive: false});
            this.viewer.stage.interactive = true;
            this.viewer.stage.on('pointerdown', this.onPanInit);
        }
    }

    public triggerOnZoom() {
        this.dispatchEvent(new CustomEvent('zoom', { detail: this.viewer.s }))
    }

    /**
     * Return magnitude of wheelevent
     * @param evt
     */
    public wheelDistance(evt: WheelEvent) {
        evt.preventDefault();
        const w = evt.deltaY;
        const d = evt.detail;
        if (d) {
            if (w) {
            return w / d / 40 * d > 0 ? 1 : -1; // Opera
            } else {
            return -d / 3;              // Firefox;         TODO: do not /3 for OS X
            }
        } else {
          // Chrome
          // @ts-ignore
          if (evt.wheelDelta !== undefined) {
            return - w / 70;
          }
          return - w / 3;             // IE/Safari
        }
    }

    /**
     * Handle zoom scales and offset on wheelevent.
     * Change s, sx and sy.
     * @param evt
     */
    public onWheel(evt: WheelEvent) {
        if (evt.ctrlKey) {
          evt.preventDefault();
        }
        // Manipulate the scale based on direction
        const distance = this.wheelDistance(evt) / 5 * this.viewer.s;
        // if (this.s == this.smin && distance <= 0) {
        //   return;
        // }
        const so = this.viewer.s;
        this.viewer.s += distance;
        const x = evt.offsetX;
        const y = evt.offsetY;

        // Check to see that the scale is not outside of the specified bounds
        if (this.viewer.s > this.viewer.smax) {
            this.viewer.s = this.viewer.smax;
        } else if (this.viewer.s < this.viewer.smin) {
            // center placeholder if zoom is minimal
            this.viewer.s = this.viewer.smin;
            this.viewer.computeDrawableArea(this.viewer.canvasWidth, this.viewer.canvasHeight,
                this.viewer.imageWidth, this.viewer.imageHeight, true);
            this.viewer.sx = 0.5 * (1 - this.viewer.s) * this.viewer.rw;
            this.viewer.sy = 0.5 * (1 - this.viewer.s) * this.viewer.rh;
        }
        this.viewer.sx = (this.viewer.sx - x) * (this.viewer.s / so) + x;
        this.viewer.sy = (this.viewer.sy - y) * (this.viewer.s / so) + y;
        this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth,
            this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
        this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
        this.triggerOnZoom();
    }

    public zoomIn() {
        this.viewer.s *= 1.1;
        this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth,
            this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
        this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
        this.triggerOnZoom();
    }

    public zoomOut() {
        this.viewer.s *= 0.9;
        if (this.viewer.s < this.viewer.smin) {
            // center placeholder if zoom is minimal
            this.viewer.s = this.viewer.smin;
            this.viewer.sx = 0.5 * (1 - this.viewer.s) * this.viewer.rw;
            this.viewer.sy = 0.5 * (1 - this.viewer.s) * this.viewer.rh;
        }
        this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth,
            this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
        this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
        this.triggerOnZoom();
    }

    /**
     * Pan initialization
     * @param x normalized x
     * @param y noramlized y
     */
    public onPanInit(evt: any) {
        if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
            const mouseData = evt.data.getLocalPosition(this.viewer.stage);
            const {x, y} = this.viewer.normalize(mouseData);
            this.init.x = x;
            this.init.y = y;
            this.isPanning = true;
            this.viewer.stage.on('pointermove', this.onPan);
            this.viewer.stage.on('pointerupoutside', this.onPanUp);
            console.info('Start panning.');
        }
    }

    /**
     * Pan renderer. No need to call render() as objects scaled are scaled along with the root.
     * @param x normalized x
     * @param y normalized y
     */
    public onPan(evt: PIXI.interaction.InteractionEvent) {
        if (this.isPanning) {
            const imgX = (evt.data.global.x - this.viewer.rx * this.viewer.s - this.viewer.sx) / this.viewer.stage.width * this.viewer.imageWidth;
            const imgY = (evt.data.global.y - this.viewer.ry * this.viewer.s - this.viewer.sy) / this.viewer.stage.height * this.viewer.imageHeight;
            evt.stopPropagation();
            const {x, y} = this.viewer.normalize({x: imgX , y: imgY});
            const deltaX = 0.5 * (x - this.init.x) * this.viewer.rw;
            const deltaY = 0.5 * (y - this.init.y) * this.viewer.rh;
            this.viewer.rx += deltaX;
            this.viewer.ry += deltaY;
            this.viewer.stage.position.x = this.viewer.rx * this.viewer.s + this.viewer.sx;
            this.viewer.stage.position.y = this.viewer.ry * this.viewer.s + this.viewer.sy;
        }
    }

    /**
     * Check root is positioned within view
     */
    public onPanUp() {
        this.isPanning = false;
        this.viewer.stage.removeListener('pointermove', this.onPan);
        this.viewer.stage.removeListener('pointerupoutside', this.onPanUp);
        this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
        this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
                -this.viewer.stage.position.y / this.viewer.stage.scale.y,
                this.viewer.canvasWidth / this.viewer.stage.scale.x,
                this.viewer.canvasHeight / this.viewer.stage.scale.y);

    }

    public onEdgeMove(evt: PIXI.interaction.InteractionEvent) {
        if (this.viewer.s <= 1) {
            return;
        }
        const {x, y} = evt.data.global;
        let transX = 0;
        let transY = 0;
        const threshX = 0.05 * this.viewer.canvasWidth;
        const threshY = 0.05 * this.viewer.canvasHeight;
        const speed = 0.05;
        if (this.viewer.canvasWidth - x < threshX && x < this.viewer.canvasWidth) {
            // panning to the right
            const paddRight = (this.viewer.rx * this.viewer.s + this.viewer.sx) + this.viewer.stage.width;
            if (paddRight > this.viewer.canvasWidth) {
                transX = -speed;
            }
        } else if (x < threshX && x > 0
            && this.viewer.rx * this.viewer.s + this.viewer.sx < 0) {
            transX = speed;
        }
        if (this.viewer.canvasHeight - y < threshY && y < this.viewer.canvasHeight) {
            const paddTop = (this.viewer.ry * this.viewer.s + this.viewer.sy) + this.viewer.stage.height;
            if (paddTop > this.viewer.canvasHeight) {
                transY = -speed;
            }
        } else if (y < threshY && y > 0
            && this.viewer.ry * this.viewer.s + this.viewer.sy < 0) {
            transY = speed;
        }
        this.viewer.rx += transX;
        this.viewer.ry += transY;
        const stageX = this.viewer.rx * this.viewer.s + this.viewer.sx;
        const stageY = this.viewer.ry * this.viewer.s + this.viewer.sy;
        // scale-independant minimal pixel distance between image to canvas border
        const thresh = 10;
        if (stageX + this.viewer.stage.width < thresh || stageY + this.viewer.stage.height < thresh
            || this.viewer.canvasWidth - stageX < thresh || this.viewer.canvasHeight - stageY < thresh) {
            return;
        }
        this.viewer.stage.position.set(stageX, stageY);
        this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
            -this.viewer.stage.position.y / this.viewer.stage.scale.y,
            this.viewer.canvasWidth / this.viewer.stage.scale.x,
            this.viewer.canvasHeight / this.viewer.stage.scale.y);
    }
}

/**
 * Implementation of 2d canvas view controls.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Renderer } from './renderer';

export class ViewControls {

    private initX: number = -1;

    private initY: number = -1;

    private isPanning: boolean = false;

    protected viewer: Renderer;

    private handlers: {
        [key: string]: (evt: any) => void;
    } = {};

    constructor(viewer?: Renderer) {
        this.viewer = viewer || new Renderer();
        // necessity to store listener as variable
        // to keep ability to removelistener
        this.handlers = {
            PANDOWN: this.onPanInit.bind(this),
            PANMOVE: this.onPan.bind(this),
            PANUP: this.onPanUp.bind(this),
            EDGEMOVE: this.onEdgeMove.bind(this)

        };
        if (viewer) {
            this.viewer.view.addEventListener('wheel', this.onWheel.bind(this), {passive: false});
            this.viewer.stage.interactive = true;
            this.viewer.stage.on('pointerdown', this.handlers.PANDOWN);
            this.viewer.stage.on('pointermove', this.handlers.EDGEMOVE);
        }
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
            this.viewer.sx = 0.5 * (1 - this.viewer.s) * this.viewer.rw;
            this.viewer.sy = 0.5 * (1 - this.viewer.s) * this.viewer.rh;
        }
        this.viewer.sx = (this.viewer.sx - x) * (this.viewer.s / so) + x;
        this.viewer.sy = (this.viewer.sy - y) * (this.viewer.s / so) + y;
        this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth,
            this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
        this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
    }

    public zoomIn() {
        this.viewer.s *= 1.1;
        this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth,
            this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
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
    }

    /**
     * Pan initialization
     * @param x normalized x
     * @param y noramlized y
     */
    public onPanInit(evt: any) {
        if (evt.data.originalEvent.button === 2 || evt.data.originalEvent.button === 1) {
            const mouseData = evt.data.getLocalPosition(this.viewer.stage);
            const x = mouseData.x / this.viewer.imageWidth;
            const y = mouseData.y / this.viewer.imageHeight;
            this.initX = x * (this.viewer.rw * this.viewer.s) + this.viewer.rx * this.viewer.s + this.viewer.sx;
            this.initY = y * (this.viewer.rh * this.viewer.s) + this.viewer.ry * this.viewer.s + this.viewer.sy;
            this.isPanning = true;
            this.viewer.stage.on('pointermove', this.handlers.PANMOVE);
            this.viewer.stage.on('pointerupoutside', this.handlers.PANUP);
        }
    }

    /**
     * Pan renderer. No need to call render() as objects scaled are scaled along with the root.
     * @param x normalized x
     * @param y normalized y
     */
    public onPan(evt: PIXI.interaction.InteractionEvent) {
        if (this.isPanning) {
            const pos = this.viewer.getPosition(evt.data);
            const {x, y} = this.viewer.normalize(pos);
            const deltaX = x * (this.viewer.rw * this.viewer.s) + this.viewer.rx * this.viewer.s + this.viewer.sx - this.initX;
            const deltaY = y * (this.viewer.rh * this.viewer.s) + this.viewer.ry * this.viewer.s + this.viewer.sy - this.initY;
            this.initX = x * (this.viewer.rw * this.viewer.s) + this.viewer.rx * this.viewer.s + this.viewer.sx;
            this.initY = y * (this.viewer.rh * this.viewer.s) + this.viewer.ry * this.viewer.s + this.viewer.sy;
            this.viewer.sx = this.viewer.stage.position.x + deltaX - this.viewer.rx * this.viewer.s;
            this.viewer.sy = this.viewer.stage.position.y + deltaY - this.viewer.ry * this.viewer.s;
            this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
            // fill complete scene
            // this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
            // -this.viewer.stage.position.y / this.viewer.stage.scale.y,
            // this.viewer.canvasWidth / this.viewer.stage.scale.x,
            // this.viewer.canvasHeight / this.viewer.stage.scale.y);
            // this.viewer.render();
        }
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
        const speed = 2;
        if (this.viewer.canvasWidth - x < threshX && x < this.viewer.canvasWidth) {
            transX = -speed;
        } else if (x < threshX && x > 0) {
            transX = speed;
        }
        if (this.viewer.canvasHeight - y < threshY && y < this.viewer.canvasHeight) {
            transY = -speed;
        } else if (y < threshY && y > 0) {
            transY = speed;
        }
        this.viewer.sx = this.viewer.stage.position.x + transX - this.viewer.rx * this.viewer.s;
        this.viewer.sy = this.viewer.stage.position.y + transY - this.viewer.ry * this.viewer.s;
        const stageX = this.viewer.rx * this.viewer.s + this.viewer.sx;
        const stageY = this.viewer.ry * this.viewer.s + this.viewer.sy;
        // scale-independant minimal pixel distance between image to canvas border
        const thresh = 10;
        if (stageX + this.viewer.stage.width < thresh || stageY + this.viewer.stage.height < thresh
            || this.viewer.canvasWidth - stageX < thresh || this.viewer.canvasHeight - stageY < thresh) {
            return;
        }
        this.viewer.stage.position.set(stageX, stageY);
    }

    /**
     * Check root is positioned within view
     */
    public onPanUp() {
        this.isPanning = false;
        this.viewer.stage.removeListener('pointermove', this.handlers.PANMOVE);
        this.viewer.stage.removeListener('pointerupoutside', this.handlers.PANUP);
        // scale-independant minimal pixel distance between image to canvas border
        // const thresh = 10;
        // if (this.viewer.stage.position.x + this.viewer.stage.width < thresh
        //     || this.viewer.canvasWidth - this.viewer.stage.position.x < thresh
        //     || this.viewer.canvasHeight - this.viewer.stage.position.y < thresh
        //     || this.viewer.stage.position.y + this.viewer.stage.height < thresh) {
        //     this.viewer.s = this.viewer.smin;
        //     this.viewer.sx = 0.5 * (1 - this.viewer.s) * this.viewer.rw;
        //     this.viewer.sy = 0.5 * (1 - this.viewer.s) * this.viewer.rh;
        //     this.viewer.stage.scale.set(this.viewer.s * this.viewer.rw / this.viewer.imageWidth, this.viewer.s * this.viewer.rh / this.viewer.imageHeight);
        //     this.viewer.stage.position.set(this.viewer.rx * this.viewer.s + this.viewer.sx, this.viewer.ry * this.viewer.s + this.viewer.sy);
        //     this.viewer.stage.hitArea = new PIXIRectangle(-this.viewer.stage.position.x / this.viewer.stage.scale.x,
        //         -this.viewer.stage.position.y / this.viewer.stage.scale.y,
        //         this.viewer.canvasWidth / this.viewer.stage.scale.x,
        //         this.viewer.canvasHeight / this.viewer.stage.scale.y);
        // }
        // important to re-render stuff even if the root fits the view
        // in order to update hitareas
        // this.viewer.render();
    }
}

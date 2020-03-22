/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Container as PIXIContainer, Graphics as PIXIGraphics,
    Circle as PIXICircle } from 'pixi.js';
import { observe, unobserve } from '@pixano/core';
import { ShapeData } from './types';
import { colorToHex } from './utils';

export const CONTROL_POINTS = [
    { cursor: "ns-resize", x: 0.5, y: 0}, // n
    { cursor: "ns-resize", x: 0.5, y: 1}, // s
    { cursor: "ew-resize", x: 1, y: 0.5}, // e
    { cursor: "ew-resize", x: 0, y: 0.5}, // w
    { cursor: "nwse-resize", x: 0, y: 0}, // nw
    { cursor: "nesw-resize", x: 1, y: 0}, // ne
    { cursor: "nesw-resize", x: 0, y: 1}, // sw
    { cursor: "nwse-resize", x: 1, y: 1} // se
];

export enum Decoration {
    None = 'none',
    Contour = 'contour', // only show contours in multiple selection
    Box = 'box', // encompassing box around the shape with 8 controllers
    Nodes = 'nodes'
}

export abstract class Shape extends PIXIContainer {

    // general area of the object
    // can be: Rectangle, Polygon, Circle
    // using native gl lines
    public area: PIXIGraphics = new PIXIGraphics();

    // scale x for denormalization
    public scaleX: number = 100;

    // scale y for denormalization
    public scaleY: number = 100;

    public box: PIXIGraphics = new PIXIGraphics();

    public controls: PIXIGraphics[] = [];

    // for graphics containing nodes such as polygons
    public nodeContainer: PIXIContainer = new PIXIContainer();

    public showNodes: boolean = false;

    public state: Decoration = Decoration.None;

    public data: ShapeData;

    public hex: number = 0X000000;

    public onChangeBind: (prop: string) => void;

    constructor(data: ShapeData) {
        super();
        this.addChild(this.area);
        this.addChild(this.box);
        this.addChild(this.nodeContainer);
        this.data = data;
        this.onChangeBind = this.onChange.bind(this);
        observe(data, this.onChangeBind);
        this.updateColorHex();
        this.controls = new Array(8).fill(null).map(() => new PIXIGraphics());
        this.controls.forEach((n) => this.nodeContainer.addChild(n));
    }

    getDimension(object?: PIXIContainer): {width: number, height: number} {
      object = object || this; 
      if (object.parent) {
        return this.getDimension(object.parent);
      } else {
        try {
          return {width: Math.floor(object.width / object.scale.x), height: Math.floor(object.height / object.scale.y)};
        } catch(err) {
          return {width: 1, height: 1};
        }
      }
    }

    updateColorHex() {
      const color = colorToHex(this.data.color!);
      this.hex = parseInt(color.replace(/^#/, ''), 16);
    }

    /**
     * Handle data update to graphical update
     * @param prop name of property changed
     */
    onChange(prop: string) {
      if (prop.startsWith('geometry')) {
        this.draw();
      } else if (prop === 'color') {
        this.updateColorHex();
        this.draw();
      }
    }

    /**
     * Get normalized bounding box encompassing the shape.
     * Return [xmin,ymin,xmax,ymax]
     */
    get bounds() {
      let xMin = 1;
      let xMax = 0;
      let yMin = 1;
      let yMax = 0;
      this.data.geometry.vertices.forEach((c, idx) => {
        if (idx % 2 === 0) {
          if (c < xMin) xMin = c;
          if (c > xMax) xMax = c;
        } else {
          if (c < yMin) yMin = c;
          if (c > yMax) yMax = c;
        }
      });
      return [xMin, yMin, xMax, yMax];
    }

    set interactive(isInteractive: boolean) {
      for (const child of this.children) {
        child.interactive = isInteractive;
        child.buttonMode = true;
      }
    }

    /**
     * Translate the shape
     * @param dx normalized x delta
     * @param dy normalized y delta
     */
    public translate(dx: number, dy: number) {
      const bounds = this.bounds;
      dx = Math.min(dx, 1 - bounds[2]);
      dx = Math.max(dx, 0 - bounds[0]);
      dy = Math.min(dy, 1 - bounds[3]);
      dy = Math.max(dy, 0 - bounds[1]);
      this.data.geometry.vertices = this.data.geometry.vertices.map((c, idx) => {
        return (idx % 2 === 0) ? c = Math.min(1, c + dx) : c = Math.min(1, c + dy);
      });
    }

    public on<T extends Shape>(event: string, fn: (evt: any) => void, context?: any): T {
      this.area.on(event, (evt: any) => {
        if (event === 'pointerdown' || event === 'pointermove') {
          evt.stopPropagation();
        }
        evt.shape = this.data;
        fn(evt);
      }, context);
      return this as any;
    }

    public removeAllListeners<T extends Shape>(event: PIXI.interaction.InteractionEventTypes): T {
      this.area.removeAllListeners(event);
      return this as any;
    }

    protected drawBox() {
      const [l, t, r, b] = this.bounds;
      const left = Math.round(l * this.scaleX);
      const right = Math.round(r * this.scaleX);
      const top = Math.round(t * this.scaleY);
      const bottom = Math.round(b * this.scaleY);
      this.box.lineStyle(1, 0XFFFFFF, 1, 0.5, true);
      this.box.drawRect(
          left, top,
          right - left,
          bottom - top);
      this.controls.forEach((c, idx) => {
            c.beginFill(0xa6d8e7, 1);
            c.lineStyle(1, 0X426eff, 1, 0.5, true);
            c.drawRect(-2, -2, 4, 4);
            c.hitArea = new PIXICircle(0, 0, 10);
            const x = left + CONTROL_POINTS[idx].x * (right - left);
            const y = top + CONTROL_POINTS[idx].y * (bottom - top);
            c.x = Math.round(x);
            c.y = Math.round(y);
            if (this.parent) {
              c.scale.x = 1.5 / this.parent.parent.scale.x;
              c.scale.y = 1.5 / this.parent.parent.scale.y;
            }
            c.endFill();
            c.interactive = true;
            c.buttonMode = true;
            c.cursor = CONTROL_POINTS[idx].cursor;
      });
    }

    public abstract draw(): void;

    destroy() {
      super.destroy();
      unobserve(this.data, this.onChangeBind);
    }
}
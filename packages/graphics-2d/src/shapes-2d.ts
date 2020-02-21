/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { Container as PIXIContainer, Graphics as PIXIGraphics, 
        Circle as PIXICircle, Rectangle as PIXIRectangle,  
        Sprite as PIXISprite, Texture as PIXITexture, 
        Point} from 'pixi.js'

import { ShapeData } from './types'
import { colorToHex } from './utils';
import { observe, observable } from '@pixano/core';
import { isValid } from './misc';
import { BlobExtractor, RegBlob } from './blob-extractor';
//import { Point } from './mask-handler'

export enum MaskVisuMode {
  SEMANTIC = 'SEMANTIC',
  INSTANCE = 'INSTANCE',
}
/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @param {number} hex - The number to convert
 * @param  {number[]} [out=[]] If supplied, this array will be used rather than returning a new one
 * @return {number[]} An array representing the [R, G, B] of the color.
 */

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

  constructor(data: ShapeData) {
    super();
    this.addChild(this.area);
    this.addChild(this.box);
    this.addChild(this.nodeContainer);
    this.data = data;
    observe(data, this.onChange.bind(this));
    this.updateColorHex();
    this.controls = new Array(8).fill(null).map(() => new PIXIGraphics());
    this.controls.forEach((n) => this.nodeContainer.addChild(n));
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
    for (let i = 0; i < this.children.length; i++) {
      let child = this.children[i];
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

  public on<T extends Shape>(event: string, fn: Function, context?: any): T {
    this.area.on(event, (evt: any) => {
      if (event === 'pointerdown' || event === 'pointermove') {
        evt.stopPropagation();
      }
      evt.shape = this.data;
      fn(evt);
    }, context);
    return <any>this;
  }

  public removeAllListeners<T extends Shape>(event: PIXI.interaction.InteractionEventTypes): T {
    this.area.removeAllListeners(event);
    return <any>this;
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

}

export class DrawingCross extends PIXIGraphics{

  public cx: number = 0;
  public cy: number = 0;
  public scaleX: number = 100;
  public scaleY: number = 100;

  constructor() {
    super();
  }

  draw() {
    if (this.parent) {
      this.clear();
      this.lineStyle(0.75, 0xF44336, 1, 0.5, true);
      this.moveTo(this.cx, 0);
      this.lineTo(this.cx, this.scaleY);
      this.moveTo(0, this.cy);
      this.lineTo(this.scaleX, this.cy);
    }
  }
}

export class RectangleShape extends Shape {

  constructor(args: any) {
    super(args);
  }

  draw() {
    this.area.clear();
    this.area.beginFill(this.hex, 0.15);
    this.area.lineStyle(1, this.hex, 1, 0.5, true);
    const left = Math.round(this.data.geometry.vertices[0] * this.scaleX);
    const right = Math.round(this.data.geometry.vertices[2] * this.scaleX);
    const top = Math.round(this.data.geometry.vertices[1] * this.scaleY);
    const bottom = Math.round(this.data.geometry.vertices[3] * this.scaleY);
    this.area.drawRect(
        0, 0,
        right - left,
        bottom - top);
    this.area.x = left;
    this.area.y = top;
    this.area.endFill();
    this.box.clear();
    this.controls.forEach((n) => n.clear());
    if (this.state === Decoration.Box ||
        this.state === Decoration.Nodes ||
        this.state === Decoration.Contour) {
      this.box.lineStyle(1, 0XFFFFFF, 1, 0.5, true);
      this.box.drawRect(
          left, top,
          right - left,
          bottom - top);
    }
    if (this.state === Decoration.Box ||
      this.state === Decoration.Nodes) {
        this.drawBox();
    } else {
      this.nodeContainer.interactive = false;
      this.controls.forEach((c) => {
        c.buttonMode = false;
        c.interactive = false;
      })
    }
  }
}

export class PolygonShape extends Shape {

  public midnodes: PIXIGraphics[] = [];

  public nodes: PIXIGraphics[] = [];

  protected nodeListeners: Map<string, (evt: any) => void> = new Map();

  protected midnodeListeners: Map<string, (evt: any) => void> = new Map();

  constructor(args: any) {
    super(args);
    this.createNodes();
  }

  get lastXn() {
    return this.data.geometry.vertices[this.data.geometry.vertices.length - 2];
  }

  get lastYn() {
    return this.data.geometry.vertices[this.data.geometry.vertices.length - 1];
  }

  get lastX() {
    return this.data.geometry.vertices[this.data.geometry.vertices.length - 2] * this.scaleX;
  }

  get lastY() {
    return this.data.geometry.vertices[this.data.geometry.vertices.length - 1] * this.scaleY;
  }

  addNodeListener(type: string, fn: (arg: any) => void) {
    this.nodeListeners.set(type, fn);
    this.applyNodeListeners();
  }

  addMidnodeListener(type: string, fn: (arg: any) => void) {
    this.midnodeListeners.set(type, fn);
    this.applyMidnodeListeners();
  }

  applyMidnodeListeners() {
    this.midnodes.forEach((n, idx) => {
      n.removeAllListeners();
      n.interactive = false;
      n.buttonMode = false;
      this.midnodeListeners.forEach((v, type) => {
        n.interactive = true;
        n.buttonMode = true;
        n.on(type, (evt: any) => {
          evt.nodeIdx = idx;
          n.interactive = true;
          n.buttonMode = true;
          n.cursor = 'cell';
          v(evt);
        });
      })
    });
  }

  applyNodeListeners() {
    this.nodes.forEach((n, idx) => {
      n.removeAllListeners();
      n.interactive = false;
      n.buttonMode = false;
      this.nodeListeners.forEach((v, type) => {
        n.interactive = true;
        n.buttonMode = true;
        n.on(type, (evt: any) => {
          evt.nodeIdx = idx;
          n.interactive = true;
          n.buttonMode = true;
          n.cursor = 'grab';
          v(evt);
        });
      })
    });
  }

  createNodes() {
    this.nodes = new Array(0.5 * this.data.geometry.vertices.length).fill(null).map(() => {
      const n = new PIXIGraphics();
      this.nodeContainer.addChild(n);
      return n;
    });
    this.midnodes =
        new Array(0.5 * this.data.geometry.vertices.length).fill(null).map(() => {
          const n = new PIXIGraphics();
          this.nodeContainer.addChild(n);
          return n;
        });
    this.applyNodeListeners();
    this.applyMidnodeListeners();
  }

  deleteNodes() {
    this.nodes.forEach((n) => { n.destroy(); this.nodeContainer.removeChild(n)});
    this.midnodes.forEach((n) => { n.destroy(); this.nodeContainer.removeChild(n)});
  }

  draw() {
    let points = this.data.geometry.vertices.map((c, idx) => {
      if (idx % 2 === 0)
        return Math.round(c * this.scaleX);
      else
        return Math.round(c * this.scaleY);
    });
    points = points.concat([points[0], points[1]]);
    this.area.clear();
    this.area.lineStyle(1, this.hex, 1, 0.5, true);
    if (this.data.geometry.vertices.length > 4) {
      this.area.beginFill(this.hex, 0.15);
      this.area.drawPolygon(points);
      this.area.endFill();
    } else if (this.data.geometry.vertices.length === 4) {
      this.area.moveTo(points[0], points[1]);
      this.area.lineTo(points[2], points[3]);
    }
    this.box.clear();
    this.controls.forEach((n) => n.clear());
    if (this.nodes.length !== this.data.geometry.vertices.length * 0.5) {
      this.deleteNodes();
      this.createNodes();
    } else {
      this.nodes.forEach((n) => n.clear());
      this.midnodes.forEach((n) => n.clear());
    }

    if (this.state === Decoration.Box) {
      this.drawBox();
    } else if (this.state === Decoration.Contour || this.state === Decoration.Nodes) {
        this.box.lineStyle(1, 0XFFFFFF, 1, 0.5, true);
        if (this.data.geometry.vertices.length > 4) {
          this.box.drawPolygon(points);
        } else if (this.data.geometry.vertices.length === 4) {
          this.box.moveTo(points[0], points[1]);
          this.box.lineTo(points[2], points[3]);
        }
        if (this.state === Decoration.Nodes) {
          // NB: setting/unsetting interactive does not
          // remove event listeners
          for (let i = 0; i < 0.5 * this.data.geometry.vertices.length; i++) {
              const x = this.data.geometry.vertices[i * 2];
              const y = this.data.geometry.vertices[i * 2 + 1];
              this.nodes[i].clear();
              this.nodes[i].beginFill(0xa6d8e7, 1);
              this.nodes[i].lineStyle(1, 0X426eff, 1, 0.5, true);
              this.nodes[i].drawCircle(0,0,4);
              this.nodes[i].x = Math.round(x * this.scaleX);
              this.nodes[i].y = Math.round(y * this.scaleY);
              this.nodes[i].endFill();
              this.nodes[i].scale.x = 1.5 / this.parent.parent.scale.x;
              this.nodes[i].scale.y = 1.5 / this.parent.parent.scale.y;
              this.midnodes[i].interactive = true;
              this.midnodes[i].buttonMode = true;
              this.midnodes[i].beginFill(0x000000, 1);
              this.midnodes[i].lineStyle(1, this.hex, 1, 0.5, true);
              const xm = (0.5 * (points[2 * i] + points[2 * i + 2]));
              const ym = (0.5 * (points[2 * i + 1] + points[2 * i + 3]));
              this.midnodes[i].drawCircle(0, 0, 3);
              this.midnodes[i].hitArea = new PIXICircle(0, 0, 4);
              this.midnodes[i].x = xm;
              this.midnodes[i].y = ym;
              this.midnodes[i].visible = true;
              this.midnodes[i].endFill();
              this.midnodes[i].cursor = 'cell';
              this.midnodes[i].scale.x = 1.5 / this.parent.parent.scale.x;
              this.midnodes[i].scale.y = 1.5 / this.parent.parent.scale.y;
          }
        }
    } else {
      this.nodes.forEach((c) => { c.interactive = false; });
      this.controls.forEach((c) => { c.interactive = false; });
    }
  }

  public isValid(): boolean {
    if (this.data.geometry.vertices.length < 6)  return false;
    if (!isValid(this.data.geometry.vertices)) {
      console.log('Polygon invalid.');
      return false;
    } else {
      const bounds = this.bounds;
      if ((bounds[3] - bounds[1]) * this.scaleY < 1
          || (bounds[2] - bounds[0]) * this.scaleX < 1) {
          return false;
      }
    }
    return true;
  }

  public insertMidNode(idx: number) {
    const midIdx = (idx + 1 + this.data.geometry.vertices.length) % this.data.geometry.vertices.length;
    this.data.geometry.vertices = [
      ...this.data.geometry.vertices.slice(0, midIdx * 2),
      (0.5 * (this.data.geometry.vertices[2 * idx] + this.data.geometry.vertices[2 * midIdx])),
      (0.5 * (this.data.geometry.vertices[2 * idx + 1] + this.data.geometry.vertices[2 * midIdx + 1])),
      ...this.data.geometry.vertices.slice(midIdx * 2)
    ];
  }

  public pushNode(x: number, y: number) {
    // check no duplicate
    for (let [idx, c] of this.data.geometry.vertices.slice(0, this.data.geometry.vertices.length - 2)
             .entries()) {
      if (idx % 2 === 0 &&
          Math.round(c * this.scaleX) === Math.round(x * this.scaleX)) {
        if (Math.round(this.data.geometry.vertices[idx + 1] * this.scaleY) ===
            Math.round(y * this.scaleY)) {
          console.log('Same location. Abort.');
          return;
        }
      }
    }
    this.data.geometry.vertices = [...this.data.geometry.vertices, x, y];
  }

  /**
   * Remove ultimate or penultimate node
   * @param isLast is ultimate
   */
  public popNode(isLast: boolean = true) {
    if (isLast) {
      this.data.geometry.vertices = this.data.geometry.vertices.slice(0, -2);
    } else {
      this.data.geometry.vertices = [
        ...this.data.geometry.vertices.slice(0, -4),
        ...this.data.geometry.vertices.slice(-2)
      ]
    }
  }

  public removeNode(idx: number) {
    this.data.geometry.vertices = [
      ...this.data.geometry.vertices.slice(0, idx * 2),
      ...this.data.geometry.vertices.slice(idx * 2 + 2)
    ]
  }
}

export class MultiPolygonShape extends Shape {
  private subShapes: PolygonShape[] = [];
  constructor(data: ShapeData) {
    super(data);
    data.geometry.mvertices!.forEach((sub, _) => {
      const newSub = {...data, geometry: {vertices: sub, type: 'polygon'}, id: data.id};
      const shape = new PolygonShape(observable(newSub));
      this.subShapes.push(shape);
      this.area.addChild(shape);
    });
  }
  onChange(prop: string) {
    if (prop === 'color') {
      this.updateColorHex();
      this.draw();
    }
  }
  draw() {
    this.subShapes.forEach((s) => {
      s.state = this.state === Decoration.None ? Decoration.None : Decoration.Contour;
      s.scaleX = this.scaleX;
      s.scaleY = this.scaleY;
      s.data.color = this.data.color;
      s.draw();
    });
  }
}

export class GraphShape extends Shape {

  public nodes: PIXIGraphics[] = [];

  public colors: number[]= [
    0xF44336, 0xffff00, 0xFFFFFF,
    0X426eff, 0xFFFFFF, 0xFFFFFF
  ];

  constructor(data: ShapeData) {
    super(data);
    this.nodes = new Array(0.5 * this.data.geometry.vertices.length).fill(null).map(() => {
      const n = new PIXIGraphics();
      this.nodeContainer.addChild(n);
      return n;
    });
    if (!this.data.geometry.visibles ||
         this.data.geometry.visibles.length !== this.nodes.length) {
      this.data.geometry.visibles = new Array(this.nodes.length).fill(true);
    }
  }

  draw() {
    this.area.clear();
    this.data.geometry.edges!.forEach((edge, idx) => {
      this.area.lineStyle(3, this.colors[idx] || 0xFFFFFF, 1, 0.5, true);
      const sX = Math.round(this.data.geometry.vertices[edge[0] * 2] * this.scaleX);
      const sY = Math.round(this.data.geometry.vertices[edge[0] * 2 + 1] * this.scaleY);
      const tX = Math.round(this.data.geometry.vertices[edge[1] * 2] * this.scaleX);
      const tY = Math.round(this.data.geometry.vertices[edge[1] * 2 + 1] * this.scaleY);
      this.area.moveTo(sX, sY);
      this.area.lineTo(tX, tY);
    });
    for (let i=0; i < this.data.geometry.vertices.length / 2; i++) {
      const x = Math.round(this.data.geometry.vertices[i * 2] * this.scaleX);
      const y = Math.round(this.data.geometry.vertices[i * 2 + 1] * this.scaleY);
      const color = this.data.geometry.visibles![i] ? 0x00ff00 : 0xff0000;
      this.area.lineStyle(0);
      this.area.beginFill(color, 1);
      this.area.lineStyle(3, 0xFFFFFF, 1, 0.5, true);
      this.area.drawCircle(x, y, 2);
      this.area.endFill();
    }
    const bb = this.bounds;
    const left = Math.round(bb[0] * this.scaleX);
    const top = Math.round(bb[1] * this.scaleY);
    const right = Math.round(bb[2] * this.scaleX);
    const bottom = Math.round(bb[3] * this.scaleY);
    this.area.hitArea = new PIXIRectangle(left, top, right - left, bottom - top);
    this.box.clear();
    this.controls.forEach((n) => n.clear());
    this.nodes.forEach((n) => n.clear());
    if (this.state === Decoration.Box) {
      this.nodes.forEach((c) => { c.interactive = false; });
      this.drawBox();
    } else if (this.state === Decoration.Contour || this.state === Decoration.Nodes) {
        this.controls.forEach((c) => { c.interactive = false; });
        this.box.lineStyle(1, 0X0F0, 1, 0.5, true);
        this.data.geometry.edges!.forEach((edge) => {
          const sX = Math.round(this.data.geometry.vertices[edge[0] * 2] * this.scaleX);
          const sY = Math.round(this.data.geometry.vertices[edge[0] * 2 + 1] * this.scaleY);
          const tX = Math.round(this.data.geometry.vertices[edge[1] * 2] * this.scaleX);
          const tY = Math.round(this.data.geometry.vertices[edge[1] * 2 + 1] * this.scaleY);
          this.box.moveTo(sX, sY);
          this.box.lineTo(tX, tY);
        });
        if (this.state === Decoration.Nodes) {
          // NB: setting/unsetting interactive does not
          // remove event listeners
          // this.nodes.forEach((c) => { c.interactive = false; });
          for (let i = 0; i < 0.5 * this.data.geometry.vertices.length; i++) {
              const x = this.data.geometry.vertices[i * 2];
              const y = this.data.geometry.vertices[i * 2 + 1];
              this.nodes[i].clear();
              this.nodes[i].beginFill(0xa6d8e7, 0.5);
              this.nodes[i].lineStyle(1, 0X426eff, 1, 0.5, true);
              this.nodes[i].drawCircle(0,0,2);
              // this.nodes[i].scale.x = 3; // / this.parent.parent.scale.x;
              // this.nodes[i].scale.y = 3; // / this.parent.parent.scale.y;
              this.nodes[i].x = Math.round(x * this.scaleX);
              this.nodes[i].y = Math.round(y * this.scaleY);
              this.nodes[i].endFill();
          }
          return;
        }
    } else {
      this.nodes.forEach((c) => { c.interactive = false; });
      this.controls.forEach((c) => { c.interactive = false; });
    }
  }

  public pushNode(x: number, y: number) {
    // check no duplicate
    for (let [idx, c] of this.data.geometry.vertices.slice(0, this.data.geometry.vertices.length - 2)
             .entries()) {
      if (idx % 2 === 0 &&
          Math.round(c * this.scaleX) === Math.round(x * this.scaleX)) {
        if (Math.round(this.data.geometry.vertices[idx + 1] * this.scaleY) ===
            Math.round(y * this.scaleY)) {
          console.log('Same location. Abort.');
          return;
        }
      }
    }
    this.data.geometry.vertices = [...this.data.geometry.vertices, x, y];
  }
}

const DISTINCT_COLORS: [number, number, number][] = [[230, 25, 75], [60, 180, 75], [255, 225, 25], [0, 130, 200], 
  [245, 130, 48], [145, 30, 180], [70, 240, 240], [240, 50, 230], [210, 245, 60], 
  [250, 190, 190], [0, 128, 128], [230, 190, 255], [170, 110, 40], [255, 250, 200], 
  [128, 0, 0], [170, 255, 195], [128, 128, 0], [255, 215, 180], [0, 0, 128], [128, 128, 128]]

  //@ts-ignore
  export function maskToColor(id_1: number, id_2: number, cls: number, maskVisuMode : String) {
  if (cls == 0)
    return [0, 0, 0];
  if (maskVisuMode == MaskVisuMode.INSTANCE) {
    const rand_id = 65536 * cls + 256 * id_1 + id_2;
    return DISTINCT_COLORS[rand_id % DISTINCT_COLORS.length];
  }
  if (maskVisuMode == MaskVisuMode.SEMANTIC) {
    return DISTINCT_COLORS[cls % DISTINCT_COLORS.length];
  }
  return [0, 0, 0];
}


/*
// Autodetect, create and append the renderer to the body element
var renderer = PIXI.autoDetectRenderer(720, 364, { backgroundColor: 0x000000, antialias: true });
document.body.appendChild(renderer.view);

// Create the main stage for your display objects
var stage = new PIXI.Container();

// Initialize the pixi Graphics class
var graphics = new PIXI.Graphics();

// Set the fill color
graphics.beginFill(0xe74c3c); // Red

// Draw a rectangle
graphics.drawRect(240, 150, 75, 75); // drawRect(x, y, width, height)
graphics.endFill();

// Add the graphics to the stage
stage.addChild(graphics);

// Start animating
renderer.render(stage);
*/


export class Brush extends PIXIContainer {
  public brushCursor: PIXIGraphics;

  public brushSize: number = 3;
  public isActive = false;
  private moveExtrema: number[] = [1000000, 1000000, 0, 0]; // [xMin, yMin, xMax, yMax]

  constructor(){
    super();
    this.brushCursor = new PIXIGraphics();
    this.brushCursor.cacheAsBitmap = true;
    this.brushCursor.beginFill(0xF5F);
    this.brushCursor.drawRect(0.0, 0.0, this.brushSize, this.brushSize);
    this.brushCursor.x = 1;
    this.brushCursor.y = 1;
    this.brushCursor.endFill();
  }

  public getPolygon(): Point[] {
    return [new Point(this.brushCursor.x, this.brushCursor.y),
            new Point(this.brushCursor.x + this.brushSize, this.brushCursor.y),
            new Point(this.brushCursor.x + this.brushSize, this.brushCursor.y + this.brushSize),
            new Point(this.brushCursor.x, this.brushCursor.y + this.brushSize)];

  }

  public updateMoveExtrema(x: number,y: number, width: number, height: number){
    let [xMin, yMin, xMax, yMax] = this.moveExtrema;

    const newXMin = Math.max(0, Math.round(x - 0.5 * this.brushSize))
    const newYMin = Math.max(0, Math.round(y - 0.5 * this.brushSize))
    const newXMax = Math.min(width, Math.round(x + 0.5 * this.brushSize))
    const newYMax = Math.min(height, Math.round(y + 0.5 * this.brushSize))

    if (newXMin < xMin)
      xMin = newXMin;
    if (newXMax > xMax)
      xMax = newXMax;

    if (newYMin < yMin)
      yMin = newYMin;
    if (newYMax > yMax)
      yMax = newYMax;
    this.moveExtrema = [xMin, yMin, xMax, yMax];
  }

  public getMoveExtrema(){
    return this.moveExtrema;
  }

  public resetMoveExtrema(){
    this.moveExtrema = [1000000, 1000000, 0, 0];
  }
}

export function fuseId(id: [number, number, number]): number{
  return 256 * 256 * id[0] + 256 * id[1] + id[2];
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
    if (pt.x < xMin)
      xMin = pt.x
    if (pt.x > xMax)
      xMax = pt.x

    if (pt.y < yMin)
      yMin = pt.y
    if (pt.y > yMax)
      yMax = pt.y
  });
  return [xMin, yMin, xMax, yMax];
};

export function extremaUnion(extrema: number[], extrema2: number[]): number[]{
  let [xMin, yMin, xMax, yMax] = extrema;
  const [xMin2, yMin2, xMax2, yMax2] = extrema2;

  if (xMin2 < xMin)
    xMin = xMin2;
  if (yMin2 < yMin)
    yMin = yMin2;
  if (xMax2 > xMax)
    xMax = xMax2;
  if (yMax2 > yMax)
    yMax = yMax2;
    
  return [xMin, yMin, xMax, yMax]; 
}

export function isInside(pt: Point, vs: Point[]): boolean {
  const x = pt.x;
  const y = pt.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const intersect = ((vs[i].y > y) != (vs[j].y > y))
          && (x < (vs[j].x - vs[i].x) * (y - vs[i].y) / (vs[j].y - vs[i].y) + vs[i].x);
      if (intersect) inside = !inside;
  }
  return inside;
};

const LOCKED_CLASS_COLOR = [200, 200, 200, 255];
const MASK_ALPHA_VALUE = 255;

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
  private augFusedMask: Array<number> = [];

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
    // console.log('vbuffer',buffer);
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
    return allfusedIds
  }

  public pixelToColor(id_1: number, id_2: number, cls: number): [number, number, number] {
    if (cls == 0)
      return [0, 0, 0];
    if (this.maskVisuMode == MaskVisuMode.INSTANCE) {
      const rand_id = 65536 * cls + 256 * id_1 + id_2;
      return DISTINCT_COLORS[rand_id % DISTINCT_COLORS.length];
    }
    if (this.maskVisuMode == MaskVisuMode.SEMANTIC) {
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
        const [id_1, id_2, cls] = this.pixelId(i);

        this.augFusedMask[i + this.canvas.width + 3 + 2*y] = fuseId([id_1, id_2, cls]);
  
        const id = id_1 * 256 + id_2
        if (id > this.maxId){
          this.maxId = id
        }
        const color = this.pixelToColor(id_1, id_2, cls);
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

  if (foundIds.size == 0){
    if (aroundIds.size != 0){
      return [unfuseId([...aroundIds.keys()].reduce((a, b) => {return aroundIds.get(a)! > aroundIds.get(b)! ? a : b })), insideIndexes]
    }
    else
      return [[0, 0, 0], insideIndexes];
  }
  else
    return [unfuseId([...foundIds.keys()].reduce((a, b) => {return foundIds.get(a)! > foundIds.get(b)! ? a : b })), insideIndexes]  
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
      const [id_1, id_2, cls] = id;
      const color = this.pixelToColor(id_1, id_2, cls);
      const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
      const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];
      for (let x = xMin; x <= xMax; x++){
        for (let y = yMin; y <= yMax; y++) {
          if (isInside(new Point(x,y), polygon)){
            const idx = (x + y * this.canvas.width) * 4;
            if (!this.lockedClasses.has(this.orig!.data[idx + 2])) {
              this.orig!.data[idx] = id_1;
              this.orig!.data[idx + 1] = id_2;
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
      })
    }
  }

  public updateByPolygon(polygon: Point[], id: [number, number, number], fillType='add'){

    const pixels = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);
    const [xMin, yMin, xMax, yMax] = getPolygonExtrema(polygon);
    
    if (fillType === 'add') {
      const [id_1, id_2, cls] = id;
      const color = this.pixelToColor(id_1, id_2, cls);
      const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
      const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          if (isInside(new Point(x,y), polygon)){
            const idx = (x + y * this.canvas.width) * 4;
            if (!this.lockedClasses.has(this.orig!.data[idx + 2])) {
              this.orig!.data[idx] = id_1;
              this.orig!.data[idx + 1] = id_2;
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

    const [id_1, id_2, cls] = id;
    const fusedId = fuseId(id)
    const ctx = this.canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const color = this.pixelToColor(id_1, id_2, cls);
    const alpha = (Math.max(...color) === 0) ? 0 : MASK_ALPHA_VALUE;
    const displ = this.lockedClasses.has(cls) ? LOCKED_CLASS_COLOR : [...color, alpha];

    for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
      if (!this.lockedClasses.has(this.orig!.data[i * 4 + 2]) && maskArray.data[i * 4] === 1) {
        const idx = i * 4;
        if ((fillType === 'replace' || fillType === 'unite')
            || fillType === 'subtract' && fuseId(this.pixelId(i)) === fusedId) {
          this.orig!.data[idx] = id_1;
          this.orig!.data[idx + 1] = id_2;
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
    let pixels = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    if (this.lockedClasses.has(cls)){
      this.lockedClasses.delete(cls)
      for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
        const idx = i * 4;
        const pix_id1 = this.orig!.data[idx];
        const pix_id2 = this.orig!.data[idx + 1];
        const pix_cls = this.orig!.data[idx + 2];

        if (pix_cls === cls) {
          const color = this.pixelToColor(pix_id1, pix_id2, pix_cls);
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
        const pix_cls = this.orig!.data[idx + 2];
        if (pix_cls === cls){
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
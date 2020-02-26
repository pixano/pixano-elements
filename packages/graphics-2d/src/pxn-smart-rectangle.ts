/**
 * Implementations of smart rectangle canvas.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { PixelToBoundingBox } from "@pixano/ai/lib/pixel-to-bounding-box";
import { Point as AIPoint } from "@pixano/ai/lib/structures";
import { observable, ObservableSet } from '@pixano/core';
import { customElement, property } from "lit-element";
import { RectanglesManager } from "./pxn-rectangle";
import { Rectangle } from "./pxn-rectangle";
import { Graphics as PIXIGraphics } from "pixi.js";

import { PxnRenderer } from "./renderer-2d";
import { ShapeData } from "./types";

const IOU_THRESHOLD = 0.5;

@customElement("pxn-smart-rectangle" as any)
export class SmartRectangle extends Rectangle {
  @property({ type: Number }) scale = 1;

  public roiUp() {
    (this.shManager as SmartRectanglesManager).roiUp();
  }

  public roiDown() {
    (this.shManager as SmartRectanglesManager).roiDown();
  }

  protected createShapeManager() {
    const shManager = new SmartRectanglesManager(this.renderer, this.shapes);
    return shManager;
  }

  async firstUpdated() {
    super.firstUpdated();
    await (this.shManager as SmartRectanglesManager).load();
    console.info("Model loaded.");
    this.dispatchEvent(new Event("ready"));
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (name === "scale") {
      (this.shManager as SmartRectanglesManager).setScale(newValue);
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }
}

interface ObjectLiteral {
  [key: string]: (evt: any) => void;
}

/**
 * Inherit RectanglesManager to handle smart rectangle creation.
 */
class SmartRectanglesManager extends RectanglesManager {
  private boundingBoxCreator: PixelToBoundingBox;

  private roi: PIXIGraphics = new PIXIGraphics();

  private keyHandlers: ObjectLiteral;

  constructor(
    renderer: PxnRenderer = new PxnRenderer(),
    shapes: ObservableSet<ShapeData> = new ObservableSet()
  ) {
    super(renderer, shapes);
    this.boundingBoxCreator = new PixelToBoundingBox();
    this.addChild(this.roi);
    this.keyHandlers = { SMART_KEYDOWN: this.onSmartKeydown.bind(this) };
  }

  load() {
    return this.boundingBoxCreator.load();
  }

  setScale(value: number) {
    this.boundingBoxCreator.setScale(value);
  }

  public setMode(mode: string) {
    super.setMode(mode);
    if (this.keyHandlers) {
      Object.keys(this.keyHandlers).forEach(key => {
        const v = this.keyHandlers[key];
        window.removeEventListener("keydown", v);
      });
    }
    if (mode === "smart-create") {
      this.cross.visible = false;
      this.roi.visible = true;
      this.updateRoi();
      window.addEventListener("keydown", this.keyHandlers.SMART_KEYDOWN, false);
    } else {
      if (this.roi) {
        this.roi.visible = false;
      }
    }
  }

  public roiUp() {
    this.boundingBoxCreator.scaleRoiUp();
    this.updateRoi();
  }

  public roiDown() {
    this.boundingBoxCreator.scaleRoiDown();
    this.updateRoi();
  }

  protected updateRoi() {
    const roiSize =
      this.boundingBoxCreator.baseRoiSize *
        this.boundingBoxCreator.getScale() || 256;
    const pos = this.renderer.mouse;
    this.roi.clear();
    this.roi.lineStyle(1, 0xffffff, 1, 0.5, true);
    this.roi.drawRect(
      pos.x - 0.5 * roiSize,
      pos.y - 0.5 * roiSize,
      roiSize,
      roiSize
    );
  }

  protected async onRootDown(evt: any) {
    super.onRootDown(evt);
    if (this.mode === "smart-create") {
      this.isCreating = true;
      const mouseData = evt.data.getLocalPosition(this.renderer.stage);
      const click: AIPoint = { x: mouseData.x, y: mouseData.y };
      const detection = await this.boundingBoxCreator.predict(
        click,
        this.renderer.htmlImageElement
      );

      if (detection !== null) {
        const l = detection.boundingBox.x / this.renderer.imageWidth;
        const t = detection.boundingBox.y / this.renderer.imageHeight;
        const r =
          (detection.boundingBox.x + detection.boundingBox.width) /
          this.renderer.imageWidth;
        const b =
          (detection.boundingBox.y + detection.boundingBox.height) /
          this.renderer.imageHeight;

        // discard the detection if it overlaps with existing boxes
        let overlap = false;
        this.shapes.forEach(s => {
          // compute the IOU of s and d = (l, t, r, b)
          const iou = intersectionOverUnion([l, t, r, b], s.geometry.vertices);
          if (iou > IOU_THRESHOLD && detection.category === s.category) {
            overlap = true;
          }
        });

        if (!overlap) {
          const shape = observable({
            id: Math.random()
              .toString(36)
              .substring(7),
            geometry: { type: "rectangle", vertices: [l, t, r, b] },
            category: detection.category
          });
          this.shapes.add(shape);
        }
      } else {
        console.info("No detection");
      }
    }
  }

  protected onRootMove(evt: PIXI.interaction.InteractionEvent) {
    super.onRootMove(evt);
    const roiSize =
      this.boundingBoxCreator.baseRoiSize *
        this.boundingBoxCreator.getScale() || 256;
    if (this.mode === "smart-create" && this.roi && this.roi.visible) {
      const mouseData = evt.data.getLocalPosition(this.renderer.stage);
      this.roi.clear();
      this.roi.lineStyle(1, 0xffffff, 1, 0.5, true);
      this.roi.drawRect(
        mouseData.x - 0.5 * roiSize,
        mouseData.y - 0.5 * roiSize,
        roiSize,
        roiSize
      );
    }
  }

  protected onSmartKeydown(evt: KeyboardEvent) {
    if (evt.key === "+") {
      this.roiUp();
    } else if (evt.key === "-") {
      this.boundingBoxCreator.scaleRoiUp();
      this.roiDown();
    }
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "pxn-smart-rectangle": SmartRectangle;
  }
}

// TODO move to core/utils
/**
 * Compute IOU between two boxes sorted as [l, t, r, b]
 * @param box1 Coordinates of the first box
 * @param box2 Coordinates of the second boxe
 */
function intersectionOverUnion(box1: number[], box2: number[]) {
  const xmin1 = Math.min(box1[0], box1[2]);
  const ymin1 = Math.min(box1[1], box1[3]);
  const xmax1 = Math.max(box1[0], box1[2]);
  const ymax1 = Math.max(box1[1], box1[3]);

  const xmin2 = Math.min(box2[0], box2[2]);
  const ymin2 = Math.min(box2[1], box2[3]);
  const xmax2 = Math.max(box2[0], box2[2]);
  const ymax2 = Math.max(box2[1], box2[3]);

  const area1 = (ymax1 - ymin1) * (xmax1 - xmin1);
  const area2 = (ymax2 - ymin2) * (xmax2 - xmin2);
  if (area1 <= 0 || area2 <= 0) {
    return 0.0;
  }
  const intersectionYmin = Math.max(ymin1, ymin2);
  const intersectionXmin = Math.max(xmin1, xmin2);
  const intersectionYmax = Math.min(ymax1, ymax2);
  const intersectionXmax = Math.min(xmax1, xmax2);

  const intersectionArea =
    Math.max(intersectionYmax - intersectionYmin, 0.0) *
    Math.max(intersectionXmax - intersectionXmin, 0.0);

  return intersectionArea / (area1 + area2 - intersectionArea);
}

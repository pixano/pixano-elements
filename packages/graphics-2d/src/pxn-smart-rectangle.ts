/**
 * Implementations of smart rectangle canvas.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { PixelToBoundingBox } from "@pixano/ai/lib/pixel-to-bounding-box";
import { Point as AIPoint } from "@pixano/ai/lib/structures";
import { observable, ObservableSet, utils } from '@pixano/core';
import { customElement, property } from "lit-element";
import { ShapeCreateController } from "./shapes-manager";
import { Rectangle } from "./pxn-rectangle";
import { Graphics as PIXIGraphics } from "pixi.js";

import { Renderer } from "./renderer";
import { ShapeData } from "./types";

const IOU_THRESHOLD = 0.5;

@customElement("pxn-smart-rectangle" as any)
export class SmartRectangle extends Rectangle {

  @property({ type: Number }) scale = 1;

  constructor() {
    super();
    this.shManager.setController('smart-create', new SmartRectangleCreateController(this.renderer, this.shapes));
  }

  get smartController() {
    return (this.shManager.modes['smart-create'] as SmartRectangleCreateController);
  }

  public roiUp() {
    const mode = this.shManager.mode;
    if (mode === 'smart-create') {
      this.smartController.roiUp();
    }
  }

  public roiDown() {
    const mode = this.shManager.mode;
    if (mode === 'smart-create') {
      this.smartController.roiDown();
    }
  }

  async firstUpdated() {
    super.firstUpdated();
    await this.smartController.load();
    console.info("Model loaded.");
    this.dispatchEvent(new Event("ready"));
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    const mode = this.shManager.mode;
    if (mode === 'smart-create' && name === "scale") {
      this.smartController.setScale(newValue);
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }
}

/**
 * Inherit RectanglesManager to handle smart rectangle creation.
 */
class SmartRectangleCreateController extends ShapeCreateController {

  private boundingBoxCreator: PixelToBoundingBox;

  private roi: PIXIGraphics = new PIXIGraphics();

  private keyHandlers: {
    [key: string]: (evt: any) => void;
  }

  constructor(
    renderer: Renderer = new Renderer(),
    shapes: ObservableSet<ShapeData> = new ObservableSet()
  ) {
    super(renderer, shapes);
    this.boundingBoxCreator = new PixelToBoundingBox();
    this.renderer.stage.addChild(this.roi);
    this.keyHandlers = {
      SMART_KEYDOWN: this.onSmartKeydown.bind(this) 
    };
  }

  load() {
    return this.boundingBoxCreator.load();
  }

  setScale(value: number) {
    this.boundingBoxCreator.setScale(value);
  }

  activate() {
    super.activate();
    this.cross.visible = false;
    this.roi.visible = true;
    this.updateRoi();
    window.addEventListener("keydown", this.keyHandlers.SMART_KEYDOWN, false);
  }

  deactivate() {
    super.deactivate();
    Object.keys(this.keyHandlers).forEach(key => {
      const v = this.keyHandlers[key];
      window.removeEventListener("keydown", v);
    });
    this.roi.visible = false;
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

  protected async onRootDown(evt: PIXI.interaction.InteractionEvent) {
    this.isCreating = true;
    const mouseData = this.renderer.getPosition(evt.data);
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
        const iou = utils.intersectionOverUnion([l, t, r, b], s.geometry.vertices);
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

  protected onRootMove(evt: PIXI.interaction.InteractionEvent) {
    super.onRootMove(evt);
    const roiSize =
      this.boundingBoxCreator.baseRoiSize *
        this.boundingBoxCreator.getScale() || 256;
    if (this.roi && this.roi.visible) {
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

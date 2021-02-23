import { BoxSegmentation } from '@pixano/ai/lib/box-segmentation';
import { observable } from '@pixano/core';
import { ShapeCreateController } from './controller';
import { Renderer } from './renderer';
import { GMask } from './graphics';
import { fuseId } from './utils-mask';
import { GraphicRectangle } from './graphics';

export class SmartCreateController extends ShapeCreateController {

    public renderer: Renderer;

    public targetClass: { value: number };

    public gmask: GMask;

    private segmentationCreator: BoxSegmentation = new BoxSegmentation();

    public model: string = 'box_model/model.json';

    constructor(props: Partial<SmartCreateController> = {}) {
      super(props);
      this.renderer = props.renderer || new Renderer();
      this.targetClass = props.targetClass || { value: 1};
      this.gmask = props.gmask || new GMask();
      this.segmentationCreator = new BoxSegmentation(this.model);
    }

    load(modelPath?: string) {
      this.model = modelPath || this.model;
      this.segmentationCreator.modelPath = this.model;
      this.cross.visible = false;
      this.renderer.renderer.plugins.interaction.cursorStyles.default = 'wait';
      this.segmentationCreator.load().then(() => {
        this.renderer.renderer.plugins.interaction.cursorStyles.default = 'inherit';
        this.renderer.renderer.plugins.interaction.currentCursorMode = "inherit";
        this.cross.visible = true;
      });
    }

    onRootDown(evt: PIXI.InteractionEvent) {
      // prevent shape creating when using middle or right mouse click
      const pointer = (evt.data.originalEvent as PointerEvent);
      if (pointer.buttons === 2 || pointer.buttons === 4) {
          return;
      }
      this.isCreating = true;
      this.mouse = this.renderer.getPosition(evt.data);
      const pt = this.renderer.normalize(this.mouse);
      const data = observable({
          id: 'tmp',
          color: 'red',
          geometry: {
              vertices: [pt.x, pt.y, pt.x, pt.y],
              type: 'rectangle'
          }
      });
      this.tmpShape = new GraphicRectangle(data) as GraphicRectangle;
      this.renderer.stage.addChild(this.tmpShape);
      this.tmpShape.scaleX = this.renderer.imageWidth;
      this.tmpShape.scaleY = this.renderer.imageHeight;
      this.tmpShape.draw();
    }

    emitUpdate() {
      this.dispatchEvent(new Event('update'));
    }

    onRootMove(evt: PIXI.InteractionEvent) {
      super.onRootMove(evt);
        const mouse = this.renderer.getPosition(evt.data);
        if (mouse.x === this.mouse.x && mouse.y === this.mouse.y) {
            return;
        }
        this.mouse = mouse;
        if (this.isCreating) {
            const shape = this.tmpShape as GraphicRectangle;
            if (shape) {
                const pt = this.renderer.normalize(this.mouse);
                shape.data.geometry.vertices[3] = pt.y;
                shape.data.geometry.vertices[2] = pt.x;
            }
        }
    }

    protected onRootUp() {
      if (this.isCreating) {
          this.isCreating = false;
          // call segmentation model
          const shape = this.tmpShape as GraphicRectangle;
          const v: number[] = shape.data.geometry.vertices;
          const xmin = Math.trunc(Math.min(v[0], v[2]) * this.renderer.imageWidth);
          const xmax = Math.trunc(Math.max(v[0], v[2]) * this.renderer.imageWidth);
          const ymin = Math.trunc(Math.min(v[1], v[3]) * this.renderer.imageHeight);
          const ymax = Math.trunc(Math.max(v[1], v[3]) * this.renderer.imageHeight);
          this.renderer.stage.removeChild(shape);
          shape.destroy();
          this.tmpShape = null;
          this.segmentationCreator.predict([xmin, ymin, xmax, ymax], this.renderer.htmlImageElement).then((res) => {
            const cls = this.gmask.clsMap.get(this.targetClass.value);
            const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0];
            const newValue: [number, number, number] = [newId[0], newId[1], this.targetClass.value];
            this.gmask.fusedIds.add(fuseId(newValue));
            this.gmask.updateByMaskInRoi(res, [xmin, ymin, xmax, ymax], newValue);
            this.emitUpdate();
          });
      }
    }
  }

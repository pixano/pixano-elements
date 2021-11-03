import { InteractionEvent as PIXIInteractionEvent, Graphics as PIXIGraphics } from 'pixi.js';
import { BoxSegmentation } from '@pixano/ai/lib/box-segmentation';
import { observable } from '@pixano/core';
import { ShapeCreateController } from './controller';
import { Renderer } from './renderer';
import { GraphicMask, GraphicRectangle } from './graphics';
import { fuseId, DensePolygon } from './utils-mask';
import { updateDisplayedSelection, getPolygons } from './controller-mask';

export enum EditionMode {
    ADD_TO_INSTANCE = 'add_to_instance',
    REMOVE_FROM_INSTANCE = 'remove_from_instance',
    NEW_INSTANCE = 'new_instance'
}

export class SmartCreateController extends ShapeCreateController {

    public renderer: Renderer;

    public _targetClass: { value: number };

    public gmask: GraphicMask;

    private segmentationCreator: BoxSegmentation = new BoxSegmentation();

    public model: string = 'box_model/model.json';

	public _selectedId: {
        value: [number, number, number] | null
    };
    protected contours = new PIXIGraphics();
    protected densePolygons: DensePolygon[] = new Array();
	public _editionMode: { value: EditionMode };

    constructor(props: Partial<SmartCreateController> = {}) {
      super(props);
      this.renderer = props.renderer || new Renderer();
      this._targetClass = props._targetClass || { value: 0 };
      this.gmask = props.gmask || new GraphicMask();
      this.segmentationCreator = new BoxSegmentation(this.model);
	  this._selectedId = props._selectedId || { value: null };
	  this._editionMode = props._editionMode || { value: EditionMode.NEW_INSTANCE };
	  this.renderer.stage.addChild(this.contours);
    }

    async load(modelPath?: string) {
        this.model = modelPath || this.model;
        this.cross.visible = false;
        this.renderer.renderer.plugins.interaction.cursorStyles.default = 'wait';
        await this.segmentationCreator.loadModel(this.model);
        this.renderer.renderer.plugins.interaction.cursorStyles.default = 'inherit';
        this.renderer.renderer.plugins.interaction.currentCursorMode = "inherit";
        this.cross.visible = true;
    }

	activate() {
        super.activate();
        this.contours.visible = true;
        if (this._selectedId.value) {
            this.densePolygons = getPolygons(this.gmask, this._selectedId.value);
            updateDisplayedSelection(this.contours, this.densePolygons);
        } else {
            this.densePolygons = [];
            this.contours.clear();
        }
    }

    deactivate() {
		super.deactivate();
        this.contours.clear();
        this.contours.visible = false;
    }

    onRootDown(evt: PIXIInteractionEvent) {
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

    onRootMove(evt: PIXIInteractionEvent) {
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
			const fillType = (this._editionMode.value === EditionMode.REMOVE_FROM_INSTANCE) ? 'remove' : 'add';
			const newValue: [number, number, number] = this.getTargetValue();
            this.gmask.updateByMaskInRoi(res, [xmin, ymin, xmax, ymax], newValue, fillType);
			this.densePolygons = getPolygons(this.gmask, newValue);
            updateDisplayedSelection(this.contours, this.densePolygons);
            this.gmask.fusedIds.add(fuseId(newValue));
            this.dispatchEvent(new CustomEvent('update', { detail: newValue }));
          });
      }
    }

	/**
     * Utility function to retrieve the mask value to next be created
     * depending on the edition mode (new, add, remove).
     */
	 getTargetValue(): [number, number, number] {
        if (this._editionMode.value == EditionMode.NEW_INSTANCE) {
            const cls = this.gmask.clsMap.get(this._targetClass.value);
            const newId = cls && cls[3] ? this.gmask.getNextId() : [0, 0] as [number, number];
            const value = [newId[0], newId[1], this._targetClass.value] as [number, number, number];
            this._selectedId.value = value;
            return value;
        } else if ((this._editionMode.value == EditionMode.ADD_TO_INSTANCE || this._editionMode.value == EditionMode.REMOVE_FROM_INSTANCE)
                    && this._selectedId.value) {
            return this._selectedId.value;
        }
        return [0,0,0];
    }
  }

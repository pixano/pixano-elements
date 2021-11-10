import { InteractionEvent as PIXIInteractionEvent } from 'pixi.js';
// uncomment to switch detector
import { PixelToBoundingBox } from "@pixano/ai/lib/pixel-to-bounding-box";
// import { PixelToBoundingBox } from "@pixano/ai/lib/lapnet";
import { Point as AIPoint } from "@pixano/ai/lib/structures";
import { observable, utils } from '@pixano/core';
import { ShapeCreateController } from "./controller";
import { Graphics as PIXIGraphics } from "pixi.js";

const IOU_THRESHOLD = 0.5;

/**
 * Inherit RectanglesManager to handle smart rectangle creation.
 */
export class SmartRectangleCreateController extends ShapeCreateController {

	boundingBoxCreator: PixelToBoundingBox;

	private roi: PIXIGraphics = new PIXIGraphics();

	constructor(props?: Partial<ShapeCreateController>) {
		super(props);
		this.boundingBoxCreator = new PixelToBoundingBox();
		this.renderer.stage.addChild(this.roi);
		this.onRootDown = this.onRootDown.bind(this);
		this.onRootMove = this.onRootMove.bind(this);
		this.onSmartKeydown = this.onSmartKeydown.bind(this);
	}

	async load(modelPath: string) {
		this.roi.visible = false;
		this.renderer.renderer.plugins.interaction.cursorStyles.default = 'wait';
		await this.boundingBoxCreator.loadModel(modelPath);
		this.renderer.renderer.plugins.interaction.cursorStyles.default = 'inherit';
		this.renderer.renderer.plugins.interaction.currentCursorMode = "inherit";
		this.roi.visible = true;
	}

	setScale(value: number) {
		this.boundingBoxCreator.setScale(value);
	}

	activate() {
		super.activate();
		this.cross.visible = false;
		this.roi.visible = true;
		this.updateRoi();
		window.addEventListener("keydown", this.onSmartKeydown, false);
	}

	deactivate() {
		super.deactivate();
		window.removeEventListener("keydown", this.onSmartKeydown);
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

	async onRootDown(evt: PIXIInteractionEvent) {
		this.isCreating = true;
		const mouseData = this.renderer.getPosition(evt.data);
		const click: AIPoint = { x: mouseData.x, y: mouseData.y };
		const detection = await this.boundingBoxCreator.predict(click, this.renderer.htmlImageElement);

		if (detection !== null) {

			const l = detection.boundingBox.l / this.renderer.imageWidth;
			const t = detection.boundingBox.t / this.renderer.imageHeight;
			const r = detection.boundingBox.r / this.renderer.imageWidth;
			const b = detection.boundingBox.b / this.renderer.imageHeight;

			// discard the detection if it overlaps with existing boxes
			let overlap = false;
			this._shapes.forEach(s => {
				// compute the IOU of s and d = (l, t, r, b)
				const iou = utils.intersectionOverUnion([l, t, r, b], s.geometry.vertices);
				if (iou > IOU_THRESHOLD && detection.category === s.category) {
					overlap = true;
				}
			});
			if (!overlap) {
				const shape = observable({
					id: Math.random().toString(36).substring(7),
					geometry: { type: "rectangle", vertices: [l, t, r, b] },
					category: detection.category
				});
				this._shapes.add(shape);
				this.emitCreate();
			}
		} else {
			console.info("No detection :(");
		}
	}

	onRootMove(evt: PIXIInteractionEvent) {
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
		if (evt.key === "z") { //"+") {
			this.roiUp();
		} else if (evt.key === "a") { //"-") {
			this.boundingBoxCreator.scaleRoiUp();
			this.roiDown();
		}
	}
}
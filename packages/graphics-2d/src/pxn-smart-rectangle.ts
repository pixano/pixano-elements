/**
 * Implementations of smart rectangle canvas.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */
import { customElement, property } from "lit-element";
import { Rectangle } from "./pxn-rectangle";
import { SmartRectangleCreateController } from "./controller-smart-rectangle";


@customElement("pxn-smart-rectangle" as any)
export class SmartRectangle extends Rectangle {

	mode: string = "edit";

	@property({ type: Number })
	scale = 1;

	@property({ type: String })
	modelPath = 'lite_mobilenet_v2'; // 'lapnet_model/model.json'; //'lite_mobilenet_v2';

	constructor() {
		super();
		this.isSmartComponent = true;
		this.setController('smart-create', new SmartRectangleCreateController({ ...this }));
	}

	get smartController() {
		return (this.modes['smart-create'] as SmartRectangleCreateController);
	}

	public updated(changeProps: any) {
		super.updated(changeProps);
		if (changeProps.has('modelPath')) {
			// Current behavior: load DL model on modelPath
			// Alternative: only load on mode change to smart-create
			this.smartController.load(this.modelPath).then(() => {
				this.dispatchEvent(new Event("ready"));
				this.pendingModelLoad = false;
			});
		}
	}

	public roiUp() {
		const mode = this.mode;
		if (mode === 'smart-create') {
			this.smartController.roiUp();
		}
	}

	public roiDown() {
		const mode = this.mode;
		if (mode === 'smart-create') {
			this.smartController.roiDown();
		}
	}

	attributeChangedCallback(name: string, oldValue: any, newValue: any) {
		const mode = this.mode;
		if (mode === 'smart-create' && name === "scale") {
			this.smartController.setScale(newValue);
		}
		super.attributeChangedCallback(name, oldValue, newValue);
	}
}

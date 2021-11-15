/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { randomNormal } from '@tensorflow/tfjs-core';
import * as ObjectDetectors from '@tensorflow-models/coco-ssd';
import { Detection, Rectangle, Point } from './structures';
import * as tf from '@tensorflow/tfjs';

tf.setBackend('webgl');
enum modelsEnum {
	v2_Lite = 'lite_mobilenet_v2',
	v1 = 'mobilenet_v1',
	v2 = 'mobilenet_v2'
}

/**
 * Detection from click with a mobilenet ssd.
 */
export class PixelToBoundingBox {
	private detectorModel: ObjectDetectors.ObjectDetection | null = null;

	// Base size of the ROI used by the detector.
	public baseRoiSize = 256;

	// Scale of the ROI.
	private scale = 1;

	async loadModel(url: string = modelsEnum.v2_Lite) {
		this.detectorModel = await ObjectDetectors.load({ base: url as any });
	}

	/**
	 * Predict object bounding box around point `p`.
	 *
	 * @param `p`: Click point location
	 * @param `image`
	 */
	async predict(
		p: Point,
		image: HTMLImageElement | HTMLCanvasElement
	): Promise<Detection | null> {

		const predictions = [] as Detection[];

		const roi = this.getROI(p, image.width, image.height);
		const crop = cropImage(image, roi);
		// [x, y, width, height]
		const cropPredictions: ObjectDetectors.DetectedObject[] = await this.detectorModel!.detect(crop);
		// convert into Detection object and map the bounding box
		// coordinates into the original image frame
		const originalFramePredictions = cropPredictions.map(res => {
			const l = res.bbox[0] + roi.l;
			const t = res.bbox[1] + roi.t;
			const r = l + res.bbox[2];
			const b = t + res.bbox[3];
			const boundingBox = { l, t, r, b };
			return { boundingBox, score: res.score, category: res.class };
		});
		predictions.push(...originalFramePredictions);

		let finalDetection: Detection | null = null;

		if (predictions.length > 0) {
			// Sort by proximity with the click point
			predictions.sort((a, b) => {
				const acx = 0.5 * (a.boundingBox.l + a.boundingBox.r);
				const acy = 0.5 * (a.boundingBox.t + a.boundingBox.b);
				const bcx = 0.5 * (b.boundingBox.l + b.boundingBox.r);
				const bcy = 0.5 * (b.boundingBox.t + b.boundingBox.b);
				const da = (acx - p.x) * (acx - p.x) + (acy - p.y) * (acy - p.y);
				const db = (bcx - p.x) * (bcx - p.x) + (bcy - p.y) * (bcy - p.y);

				return da - db;
			});

			// test the first ranked box
			if (
				isInside(p, predictions[0].boundingBox) &&
				predictions[0].score > 0.5
			) {
				finalDetection = predictions[0];
			}
		}
		return finalDetection;
	}

	private getROI(p: Point, imageWidth: number, imageHeight: number): Rectangle {
		const maxSize = Math.min(imageHeight, imageWidth);
		const size = Math.min(this.baseRoiSize * this.scale, maxSize);
		let l = p.x - size / 2;
		let t = p.y - size / 2;

		if (l < 0) {
			l = 0;
		}
		if (t < 0) {
			t = 0;
		}
		if (l + size > imageWidth) {
			l = imageWidth - size;
		}

		if (t + size > imageHeight) {
			t = imageHeight - size;
		}

		return { l, t, r: l + size, b: t + size } as Rectangle;
	}

	/**
	 * Set the scale of the ROI.
	 * @param value
	 */
	setScale(value: number) {
		this.scale = value;
	}

	getScale() {
		return this.scale;
	}

	public scaleRoiUp() {
		this.scale *= 1.3;
	}

	public scaleRoiDown() {
		this.scale *= 0.7;
	}

	/**
	 * Dispose the tensors allocated by the model.
	 * You should call this when you are done with the model. For example
	 * when the element using this model will be removed from the DOM
	 */
	dispose() {
		if (this.detectorModel) {
			this.detectorModel.dispose();
		}
	}
}

/**
 * Test if a point is inside the given rectangle.
 *
 * @param `p` Point the candidate point.
 * @param `rectangle` Rectangle the target rectangle.
 *
 * Return true if the point `p` is inside the rectangle `rectangle`.
 */
export function isInside(p: Point, rect: Rectangle) {
	return (
		rect.l <= p.x &&
		rect.t <= p.y &&
		rect.r >= p.x &&
		rect.b >= p.y
	);
}

/**
	* Crop an image.
	*
	* @param `image` the image to be cropped
	* @param `roi` Rectangle. The ROI of the crop.
	*/
export function cropImage(
	image: HTMLImageElement | HTMLCanvasElement,
	roi: Rectangle
): HTMLCanvasElement {
	const cropCanvas = document.createElement('canvas');
	cropCanvas.width = roi.r - roi.l;
	cropCanvas.height = roi.b - roi.t;
	const cropContext: CanvasRenderingContext2D = cropCanvas.getContext(
		'2d'
	) as CanvasRenderingContext2D;

	cropContext.drawImage(
		image,
		roi.l,
		roi.t,
		cropCanvas.width,
		cropCanvas.height,
		0,
		0,
		cropCanvas.width,
		cropCanvas.height
	);
	return cropCanvas;
}


/**
 * Generate extra points from the original point `p`
 * @param p
 * @param num
 */
export function generatePoints(p: Point, num = 5): Point[] {
	const xsTensor = randomNormal([num - 1], p.x, 2);
	const ysTensor = randomNormal([num - 1], p.y, 2);
	const xs = xsTensor.array();
	const ys = ysTensor.array();

	const points: Point[] = [p];

	for (let i = 0; i < num - 1; i++) {
		// @ts-ignore
		points.push({ x: xs[i], y: ys[i] });
	}

	xsTensor.dispose();
	ysTensor.dispose();

	return points;
}
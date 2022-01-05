/**
 * INTERNAL, DO NOT PUBLISH
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as tf from '@tensorflow/tfjs';
import { Detection, Rectangle, Point } from './structures';
import { loadGraphModel } from './tf-utils';

/**
 * Detection from click with a mobilenet ssd.
 */
export class PixelToBoundingBox {

	private model: tf.GraphModel | null = null;

	public modelPath = './web_model/model.json';

	// Base size of the ROI used by the detector.
	public baseRoiSize = 256;

	// Scale of the ROI.
	private scale = 1;

	async loadModel(modelPath: string = this.modelPath): Promise<any> {
		this.model = await loadGraphModel(modelPath);
		if (this.model) {
			const empty = tf.zeros([1, 3, this.baseRoiSize, this.baseRoiSize]);
			await this.model.executeAsync({ 'images:0': empty }, ['Identity:0', 'Identity_1:0']);
			empty.dispose();
		}
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

		let predictions = [] as Detection[];

		const roi = this.getROI(p, image.width, image.height);
		const crop = await cropImage(image, roi);
		const newSize = 320;
		const input = tf.tidy(() => tf.expandDims(tf.transpose(tf.browser.fromPixels(crop).resizeBilinear([newSize, newSize]).div(tf.scalar(255)), [2, 0, 1])));
		// console.time('Inference');
		const cropPredictions = await this.model!.executeAsync({ 'images:0': input }, ['Identity:0', 'Identity_1:0']) as [tf.Tensor4D, tf.Tensor4D];
		// console.timeEnd('Inference');
		// convert into Detection object and map the bounding box
		// coordinates into the original image frame
		const boxes = cropPredictions[0].dataSync();
		const scores = cropPredictions[1].dataSync();
		for (let i = 0; i < boxes.length / 4; i++) {
			if (scores[i] > 0.4) {
				predictions.push({
					boundingBox: {
						l: (boxes[i * 4] * crop.width / newSize) + roi.l,
						t: (boxes[i * 4 + 1] * crop.height / newSize) + roi.t,
						r: (boxes[i * 4 + 2] * crop.width / newSize) + roi.l,
						b: (boxes[i * 4 + 3] * crop.height / newSize) + roi.t
					},
					score: scores[i], category: '100'
				})
			}
		}

		let finalDetection: Detection | null = null;
		if (predictions.length > 0) {
			predictions = predictions.filter((pred) => isInside(p, pred.boundingBox as Rectangle))
			predictions.sort((a, b) => b.score - a.score);
			finalDetection = predictions[0];
		}

		input.dispose();
		cropPredictions[0].dispose();
		cropPredictions[1].dispose();
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
		this.scale *= 1.5;
	}

	public scaleRoiDown() {
		this.scale *= 0.5;
	}

	/**
	 * Dispose the tensors allocated by the model.
	 * You should call this when you are done with the model. For example
	 * when the element using this model will be removed from the DOM
	 */
	dispose() {
		if (this.model) {
			this.model.dispose();
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
// @ts-ignore
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


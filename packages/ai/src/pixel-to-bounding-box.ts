/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { randomNormal } from '@tensorflow/tfjs-core';
import * as ObjectDetectors from '@tensorflow-models/coco-ssd';
import { Detection, Rectangle, Point } from './structures';

/**
 * Detection from click with a mobilenet ssd.
 */
export class PixelToBoundingBox {
  private detectorModel: ObjectDetectors.ObjectDetection | null = null;

  // Base size of the ROI used by the detector.
  public baseRoiSize = 256;

  // Scale of the ROI.
  private scale = 1;

  async load() {
    enum modelsEnum {
      v2_Lite = 'lite_mobilenet_v2',
      v1 = 'mobilenet_v1',
      v2 = 'mobilenet_v2'
    }
    this.detectorModel = await ObjectDetectors.load({base: modelsEnum.v2_Lite});
    return;
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

    const numPoints = 1;
    const predictions = [] as Detection[];

    const pts = this.generatePoints(p, numPoints);

    for (let i = 0; i < numPoints; i++) {
      const roi = this.getROI(pts[i], image.width, image.height);
      const crop = this.cropImage(image, roi);
      const cropPredictions = await this.detectorModel!.detect(crop);

      // convert into Detection object and map the bounding box
      // coordinates into the original image frame
      const originalFramePredictions = cropPredictions.map(res => {
        const x = res.bbox[0] + roi.x;
        const y = res.bbox[1] + roi.y;
        const boundingBox = { x, y, width: res.bbox[2], height: res.bbox[3] };
        return { boundingBox, score: res.score, category: res.class };
      });
      predictions.push(...originalFramePredictions);
    }

    let finalDetection: Detection | null = null;

    if (predictions.length > 0) {
      // Sort by proximity with the click point
      predictions.sort((a, b) => {
        const ax0 = a.boundingBox.x;
        const ay0 = a.boundingBox.y;
        const acx = ax0 + a.boundingBox.width / 2;
        const acy = ay0 + a.boundingBox.height / 2;

        const bx0 = b.boundingBox.x;
        const by0 = b.boundingBox.y;
        const bcx = bx0 + b.boundingBox.width / 2;
        const bcy = by0 + b.boundingBox.height / 2;

        const da = (acx - p.x) * (acx - p.x) + (acy - p.y) * (acy - p.y);
        const db = (bcx - p.x) * (bcx - p.x) + (bcy - p.y) * (bcy - p.y);

        return da - db;
      });

      // test the first ranked box
      if (
        this.isInside(p, predictions[0].boundingBox) &&
        predictions[0].score > 0.5
      ) {
        finalDetection = predictions[0];
      }
    }

    return finalDetection;
  }

  /**
   * Generate extra points from the original point `p`
   * @param p
   * @param num
   */
  private generatePoints(p: Point, num = 5): Point[] {
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

  private getROI(p: Point, imageWidth: number, imageHeight: number): Rectangle {
    const maxSize = Math.min(imageHeight, imageWidth);
    const size = Math.min(this.baseRoiSize * this.scale, maxSize);
    let x = p.x - size / 2;
    let y = p.y - size / 2;

    if (x < 0) {
      x = 0;
    }
    if (y < 0) {
      y = 0;
    }
    if (x + size > imageWidth) {
      x = imageWidth - size;
    }

    if (y + size > imageHeight) {
      y = imageHeight - size;
    }

    return { x, y, width: size, height: size } as Rectangle;
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
   * Crop an image.
   *
   * @param `image` the image to be cropped
   * @param `roi` Rectangle. The ROI of the crop.
   */
  private cropImage(
    image: HTMLImageElement | HTMLCanvasElement,
    roi: Rectangle
  ): HTMLCanvasElement {
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = roi.width;
    cropCanvas.height = roi.height;
    const cropContext: CanvasRenderingContext2D = cropCanvas.getContext(
      '2d'
    ) as CanvasRenderingContext2D;

    cropContext.drawImage(
      image,
      roi.x,
      roi.y,
      roi.width,
      roi.height,
      0,
      0,
      roi.width,
      roi.height
    );
    return cropCanvas;
  }

  /**
   * Test if a point is inside the given rectangle.
   *
   * @param `p` Point the candidate point.
   * @param `rectangle` Rectangle the target rectangle.
   *
   * Return true if the point `p` is inside the rectangle `rectangle`.
   */
  isInside(p: Point, rectangle: Rectangle) {
    return (
      rectangle.x <= p.x &&
      p.x <= rectangle.x + rectangle.width &&
      rectangle.y <= p.y &&
      p.y <= rectangle.y + rectangle.height
    );
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

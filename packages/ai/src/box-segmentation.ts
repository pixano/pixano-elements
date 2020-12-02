/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Detection from click with a mobilenet ssd.
 */
export class BoxSegmentation {

  private model: tf.GraphModel | null = null;

  public modelPath = 'box_model/model.json';

  private loadedModelPath = '';

  constructor(path?: string) {
    this.modelPath = path || this.modelPath;
  }

  async load() {
    if (!this.checkPathExists(this.modelPath)) {
      console.warn('Unknown path', this.modelPath);
      return;
    }
    if (this.loadedModelPath == this.modelPath) {
      console.info('Model already loaded');
      return;
    }
    try {
      this.loadedModelPath = this.modelPath;
      this.model = await tf.loadGraphModel(this.modelPath);
      // run idle the model once
      const empty = tf.zeros([1, 256, 256, 3]);
      const prediction = await (this.model as tf.GraphModel).predict(empty) as tf.Tensor4D;
      prediction.dispose();
      empty.dispose();
      console.info('Model loaded', this.modelPath);
    } catch (err) {
      console.warn('Failed to load model at path', this.modelPath, err);
    }
  }

  private checkPathExists(path: string) {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', path, false);
    xhr.send();
     
    if (xhr.status == 404) {
        return false;
    } else {
        return true;
    }
  }

  /**
   * Predict object mask in bounding box.
   *
   * @param `box`: Bounding box
   * @param `image`
   */
  async predict(
    // source crop size
    box: [number, number, number, number],
    // entire source image
    image: HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array> {

    const targetSize = 256;
    const padding = 0.15;
    const threshold = 0.5;
    // pad image
    const cx = 0.5*(box[0] + box[2]);
    const cy = 0.5*(box[1] + box[3]);
    const width = (box[2] - box[0]) * (1 + padding);
    const height = (box[3] - box[1]) * (1 + padding);
    const paddedBox = [cx - 0.5 * width, cy - 0.5 * height, cx + 0.5 * width, cy + 0.5 * height]
        .map(Math.trunc) as [number, number, number, number];
    const crop = this.cropImage(image, paddedBox, targetSize);
    const input = tf.expandDims(tf.browser.fromPixels(crop)).div(tf.scalar(255));
    let prediction = await (this.model as tf.GraphModel).predict(input) as tf.Tensor4D;
    prediction = tf.image.cropAndResize(prediction, [[0.5*padding, 0.5*padding, 1-0.5*padding, 1-0.5*padding]], [0], [box[3]-box[1], box[2]-box[0]])
    prediction = tf.squeeze(prediction);
    prediction = tf.cast(prediction.add(1 - threshold), 'int32') as tf.Tensor<tf.Rank.R4>;
    
    const res = await prediction.data() as Float32Array;
    return res;
  }

  /**
   * Crop an image.
   *
   * @param `image` the image to be cropped
   * @param `roi` Rectangle. The ROI of the crop.
   */
  private cropImage(
    image: HTMLImageElement | HTMLCanvasElement,
    box: [number, number, number, number],
    targetSize?: number
  ): HTMLCanvasElement {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = targetSize || box[2]-box[0];
      cropCanvas.height = targetSize || box[3]-box[1];
      const cropContext: CanvasRenderingContext2D = cropCanvas.getContext(
        '2d'
      ) as CanvasRenderingContext2D;
        // Crop and resize (bi-linear)
      cropContext.drawImage(
        image,
        box[0],
        box[1],
        box[2]-box[0],
        box[3]-box[1],
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );
      return cropCanvas;
  }
}
/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as tf from '@tensorflow/tfjs';
import { BlobExtractor2d, simplify, convertIndexToDict } from '@pixano/core/lib/utils';
import { loadGraphModel } from './tf-utils';

/**
 * Detection from click with a mobilenet ssd.
 */
export class BoxSegmentation {

  private model: tf.GraphModel | null = null;

  public modelPath = 'box_model/model.json';

  constructor(path?: string) {
    this.modelPath = path || this.modelPath;
  }

  async loadModel(url: string = this.modelPath) {
    this.model = await loadGraphModel(url);
    // run idle the model once
    const empty = tf.zeros([1, 256, 256, 3]);
    const prediction = await (this.model as tf.GraphModel).predict(empty) as tf.Tensor4D;
    prediction.dispose();
    empty.dispose();
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

    if (!this.model) {
      return Promise.resolve(new Float32Array((box[3]-box[1])*(box[2]-box[0])));
    }

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

    const res = tf.tidy(() => {
      // encapsulate all tfjs in tidy to automatically
      // dispose all tensors
      const input = tf.expandDims(tf.browser.fromPixels(crop)).div(tf.scalar(255));
      const prediction = (this.model as tf.GraphModel).predict(input) as tf.Tensor4D;
      return  tf.image.cropAndResize(prediction, [[0.5*padding, 0.5*padding, 1-0.5*padding, 1-0.5*padding]], [0], [box[3]-box[1], box[2]-box[0]])
                      .squeeze()
                      .add(1 - threshold)
                      .cast('int32') as tf.Tensor<tf.Rank.R4>
    });
    const mask = res.dataSync() as Float32Array;
    res.dispose();
    return mask;
  }

  /* Predict object mask in bounding box.
  *
  * @param `box`: Bounding box (x1,y1,x2,y2)
  * @param `image`
  */
  async predictPolygon(box: [number, number, number, number], image: HTMLImageElement | HTMLCanvasElement):
      Promise<number[]> {
    // predict segmentation mask
    console.log('predict polygon', this)
    const mask = await this.predict(box, image);
    
    // convert mask to polygon
    let pts: [number, number][] = []
    const blobExtractor = new BlobExtractor2d([...mask], box[2]-box[0], box[3]-box[1]);
    blobExtractor.extract(1);
    if (blobExtractor.blobs.size == 1) {
        blobExtractor.blobs.get(0)!.contours.forEach((ctr: any) => {
            if (ctr.type === 'external') {
                pts = simplify(convertIndexToDict(ctr.points,  box[2]-box[0] + 1), 2);
            }
        })
    }
    const globalX = pts.map(v => (v[0] + box[0]) / image.width);
    const globalY = pts.map(v => (v[1] + box[1]) / image.height);
    const vertices = new Array(globalX.length * 2);
    for(let idx = 0; idx < globalX.length * 2; idx++){
        vertices[idx] = idx % 2 ? globalY[(idx - 1) / 2] : globalX[(idx) / 2];
    }
    return vertices;
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
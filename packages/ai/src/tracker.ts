import * as tf from '@tensorflow/tfjs';
import { GraphModel } from '@tensorflow/tfjs';
// tf.setBackend('cpu');
tf.setBackend('webgl');
// tf.setBackend('wasm');
console.info('Tensorflow Backend :', tf.getBackend());
// console.log('WEBGL_RENDER_FLOAT32_CAPABLE', tf.ENV.getBool('WEBGL_RENDER_FLOAT32_CAPABLE'));
// console.log('WEBGL_RENDER_FLOAT32_ENABLED', tf.ENV.getBool('WEBGL_RENDER_FLOAT32_ENABLED'));


export class Tracker {

    images: HTMLImageElement[] = [];
    box0: { x: number, y: number, w: number, h: number } | null = null;
    model: GraphModel | null = null;
    // Ocean Config
    p: any = {
        penalty_k: 0.021, // penalty_k: 0.062,
        window_influence: 0.321, // window_influence: 0.38,
        lr: 0.730, // lr: 0.765,
        windowing: 'cosine',
        exemplar_size: 127,
        instance_size: 255,
        total_stride: 8,
        score_size: Math.floor((255 - 127) / 8) + 1 + 8, //    Int((instance_size - exemplar_size)/(total_stride)) + 1 + 8  # for ++
        context_amount: 0.5,
        ratio: 0.93, // ratio: 0.94,
        small_sz: 255,
        big_sz: 271
    };
    window: tf.Tensor2D;
    template: tf.Tensor3D | null = null;
    avgChans: tf.Tensor | null = null;
    sX: number = -1;

    // helper variables
    targetPos: [number, number] = [-1, -1];
    targetSz: [number, number] = [-1, -1];
    scaleZ: number = -1;

    _loaded: boolean = false;

    constructor() {
        this.window = tf.tensor([17, 17]) as tf.Tensor2D;
        if (this.p.windowing === 'cosine') {
            const hannWindow = tf.signal.hannWindow(this.p.score_size);
            this.window = tf.outerProduct(hannWindow, hannWindow) as tf.Tensor2D;
            hannWindow.dispose();
        } else if (this.p.windowing === 'uniform') {
            this.window = tf.ones([Math.floor(this.p.score_size), Math.floor(this.p.score_size)]) as tf.Tensor2D;
        }
    }

    loadModel(): Promise<any> {
        if (this._loaded) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            tf.loadGraphModel('oceanBis_tfjs/model.json').then((model) => {
                this.model = model;
                // run idle the model once
                const templateTensor = tf.zeros([1, 3, this.p.exemplar_size, this.p.exemplar_size]);
                const searchTensor = tf.zeros([1, 3, this.p.instance_size, this.p.instance_size]);
                tf.tidy(() => this.model!.execute(
                    { 'template': templateTensor,
                    'search': searchTensor
                    },
                    ['Identity:0', 'Identity_1:0', 'Identity_2:0', 'Identity_3:0', 'Identity_4:0']) as tf.Tensor2D[]);
                templateTensor.dispose();
                searchTensor.dispose();
                this._loaded = true;
                resolve();
            });
        })

    }

	isLoaded() {
		return this._loaded;
	}

    /**
     * Set initial box
     * @param x left
     * @param y top
     * @param w box width
     * @param h box height
     */
    initBox(im: HTMLImageElement, x: number, y: number, w: number, h: number) {
        if (!im) {
            return;
        }
        this.box0 = { x, y, w, h };
        console.info('=======> Preparing Template... <=======');
        const box = get_axis_aligned_bbox(this.box0!);
        this.targetPos = [box.cx, box.cy];
        this.targetSz = [box.w, box.h];

        // Get context = how to crop both images.
        const wcZ = this.targetSz[0] + this.p.context_amount * (this.targetSz.reduce((a, b) => a + b, 0));
        const hcZ = this.targetSz[1] + this.p.context_amount * (this.targetSz.reduce((a, b) => a + b, 0));
        const sZ = Math.round(Math.sqrt(wcZ * hcZ));

        // pytorch model trained with BGR images.
        const frameInit = tf.tidy(() => tf.browser.fromPixels(im).reverse(-1));
        this.avgChans = frameInit.mean([0, 1]);

        this.template = tf.tidy(() => get_subwindow_tracking(frameInit, this.targetPos, this.p.exemplar_size, sZ, this.avgChans!));
        frameInit.dispose();

        this.scaleZ = this.p.exemplar_size / sZ;
        const dSearch = (this.p.instance_size - this.p.exemplar_size) / 2;  // slightly different from rpn++
        const pad = dSearch / this.scaleZ;
        this.sX = python2round(sZ + 2 * pad);
        // console.log('ratio', this.sX, box.w, sZ)
        // sX = 1000;
    }

    run(im: HTMLImageElement) {
        console.time('inference')
        const currentFrame = tf.tidy(() => tf.browser.fromPixels(im).reverse(-1));

        const search = tf.tidy(() => get_subwindow_tracking(currentFrame,
            this.targetPos, this.p.instance_size,
            this.sX, this.avgChans!));
        currentFrame.dispose();

        [this.targetPos, this.targetSz] = tf.tidy(() => update_tracks(this.model!,
            this.template!, search, this.targetPos,
            this.targetSz, this.window, this.scaleZ,
            this.p));
        search.dispose();
        const location = cxy_wh_2_rect(this.targetPos, this.targetSz);
        console.timeEnd('inference')
        return location;
    }

    destroy() {
        this.avgChans!.dispose();
        this.template!.dispose()
    }
}

/**
 * Update track.
 * Return pred_targetPos and pred_targetSz.
 * @param model
 * @param template
 * @param search
 * @param targetPos
 * @param targetSz
 * @param window
 * @param scaleZ
 * @param p
 */
export function update_tracks(
    model: tf.GraphModel,
    template: tf.Tensor3D,
    search: tf.Tensor3D,
    targetPos: number[],
    targetSz: number[],
    window: tf.Tensor2D,
    scaleZ: number,
    p: {
        penalty_k: number,
        window_influence: number,
        lr: number,
        windowing: string,
        exemplar_size: number,
        instance_size: number,
        total_stride: number,
        score_size: number,
        context_amount: number,
        ratio: number
    }): [number, number][] {
    const scaledTargetSz = [targetSz[0] * scaleZ, targetSz[1] * scaleZ];

	var start = new Date().getTime();
    // uncomment this section if using the model which does not including the postprocessing
    // const [grid_to_search_x, grid_to_search_y] = tf.tidy(() => {return grid(p.score_size, p.total_stride, p.instance_size);});

    // const templateTensor = tf.tidy(() => {return tf.cast(tf.expandDims(tf.transpose(template, [2, 0, 1])),'float32');});
    // const searchTensor = tf.tidy(() => {return tf.cast(tf.expandDims(tf.transpose(search, [2, 0, 1])),'float32');});

    // const [boundingboxes4D, scores4D] = tf.tidy(() => {return model.execute({'template': templateTensor, 'search': searchTensor}) as tf.Tensor4D[];});
    // templateTensor.dispose(); searchTensor.dispose();

    // // bbox to real predict
    // const scores2D = tf.tidy(() => {return tf.sigmoid(scores4D).squeeze() as tf.Tensor2D;});
    // const boundingboxes3D = tf.tidy(() => boundingboxes4D.squeeze() as tf.Tensor3D);
    // boundingboxes4D.dispose(); scores4D.dispose();

    // const predX1 = tf.tidy(() => grid_to_search_x.sub(tf.gather(boundingboxes3D, 0)) as tf.Tensor2D);
    // const predY1 = tf.tidy(() => grid_to_search_y.sub(tf.gather(boundingboxes3D, 1)) as tf.Tensor2D);
    // const predX2 = tf.tidy(() => grid_to_search_x.add(tf.gather(boundingboxes3D, 2)) as tf.Tensor2D);
    // const predY2 = tf.tidy(() => grid_to_search_y.add(tf.gather(boundingboxes3D, 3)) as tf.Tensor2D);
    // boundingboxes3D.dispose(); grid_to_search_x.dispose(); grid_to_search_y.dispose();


    const templateTensor = tf.tidy(() => tf.cast(tf.expandDims(tf.transpose(template, [2, 0, 1])), 'float32'));
    const searchTensor = tf.tidy(() => tf.cast(tf.expandDims(tf.transpose(search, [2, 0, 1])), 'float32'));
	console.log("t=",(new Date().getTime()-start));
    const [scores2D, predX1, predX2, predY1, predY2] = tf.tidy(() => model.execute(
		{ 'template': templateTensor, 'search': searchTensor },
		['Identity:0', 'Identity_1:0', 'Identity_2:0', 'Identity_3:0', 'Identity_4:0']
		) as tf.Tensor2D[]);
	console.log("t exec=",(new Date().getTime()-start));
	//predX1 = Identity_1:0
	//predY1 = Identity_3:0
	//predX2 = Identity_2:0
	//predY2 = Identity_4:0
	//scores2D = Identity:0
	templateTensor.dispose(); searchTensor.dispose();

    // size penalty
    const sC = tf.tidy(() => change(sz(predX2.sub(predX1), predY2.sub(predY1)).div(sz_wh(scaledTargetSz)))); // scale penalty

    const a = tf.tidy(() => tf.ones([predX1.shape[0], predX1.shape[1]]).mul(scaledTargetSz[0] / scaledTargetSz[1]));
    const b = tf.tidy(() => ((predX2.sub(predX1)).div((predY2.sub(predY1)))));
    const rC = tf.tidy(() => change(a.div(b)));  // ratio penalty

    const penalty = tf.tidy(() => tf.exp((((rC.mul(sC)).sub(1)).mul(p.penalty_k)).mul(-1)));
    sC.dispose(); a.dispose(); b.dispose(); rC.dispose();

    const pscore0 = tf.tidy(() => penalty.mul(scores2D));
    // window penalty
    const pscore = tf.tidy(() => pscore0.mul(1 - p.window_influence).add(window.mul(p.window_influence)) as tf.Tensor2D);
    pscore0.dispose()

    // get max idx
    const idxMax = tf.tidy(() => pscore.argMax(1).dataSync());
    const nVec = pscore.shape[0];
    let maxI = 0;
    let maxJ = idxMax[maxI];
    let maxN = tf.tidy(() => tf.gather(tf.gather(pscore, maxI), maxJ).dataSync()[0]);
    for (let i = 1; i < nVec; i++) {
        const j = idxMax[i];
        const n = tf.tidy(() => tf.gather(tf.gather(pscore, i), j).dataSync()[0]);
        if (maxN < n) {
            maxI = i;
            maxJ = j;
            maxN = n;
        }
    }
    const rMax = maxI;
    const cMax = maxJ;
    pscore.dispose();

    // // to real size
    const maxPredX1 = tf.tidy(() => tf.gather(tf.gather(predX1, rMax), cMax).dataSync()[0]);
    const maxPredY1 = tf.tidy(() => tf.gather(tf.gather(predY1, rMax), cMax).dataSync()[0]);
    const maxPredX2 = tf.tidy(() => tf.gather(tf.gather(predX2, rMax), cMax).dataSync()[0]);
    const maxPredY2 = tf.tidy(() => tf.gather(tf.gather(predY2, rMax), cMax).dataSync()[0]);
    predX1.dispose(); predX2.dispose(); predY1.dispose(); predY2.dispose();

    const predXs = (maxPredX1 + maxPredX2) / 2;
    const predYs = (maxPredY1 + maxPredY2) / 2;
    let predW = maxPredX2 - maxPredX1;
    let predH = maxPredY2 - maxPredY1;

    let diffXs = predXs - Math.floor(p.instance_size / 2);
    let diffYs = predYs - Math.floor(p.instance_size / 2);

    diffXs = diffXs / scaleZ;
    diffYs = diffYs / scaleZ;
    predW = predW / scaleZ;
    predH = predH / scaleZ;

    const newTargetSz = scaledTargetSz.slice()
        .map((s) => s / scaleZ);

    // size learning rate
    const maxPenalty = tf.tidy(() => tf.gather(tf.gather(penalty, rMax), cMax).dataSync()[0]);
    const maxClsScore = tf.tidy(() => tf.gather(tf.gather(scores2D, rMax), cMax).dataSync()[0]);
    scores2D.dispose(); penalty.dispose();
    const lr = maxPenalty * maxClsScore * p.lr;

    // size rate
    const resXs = targetPos[0] + diffXs;
    const resYs = targetPos[1] + diffYs;

    const resW = predW * lr + (1 - lr) * newTargetSz[0];
    const resH = predH * lr + (1 - lr) * newTargetSz[1];
	console.log("t=",(new Date().getTime()-start));

    return [
        [resXs, resYs], // pred_targetPos
        [newTargetSz[0] * (1 - lr) + lr * resW, newTargetSz[1] * (1 - lr) + lr * resH] // pred_targetSz
    ];
}

// same as above but using slicing instead of creating a tensorBuffer
export function get_subwindow_tracking(
    imTensor: tf.Tensor3D, // image to crop
    pos: number[], // position of the center of the object to track/used as template
    modelSz: number, // output size of the patch
    originalSz: number, // amount of context croped in the patch (h*w)
    avgChans: tf.Tensor // mean of the img channels used for padding
): tf.Tensor3D {

    const sz = originalSz;
    const imH = imTensor.shape[0];
    const imW = imTensor.shape[1];

    const c = (sz + 1) / 2;
    let contextXmin = Math.round(pos[0] - c);
    let contextYmin = Math.round(pos[1] - c);
    let contextXmax = contextXmin + sz - 1;
    let contextYmax = contextYmin + sz - 1;

    const leftPad = Math.floor(Math.max(0., -contextXmin));
    const topPad = Math.floor(Math.max(0., -contextYmin));
    const rightPad = Math.floor(Math.max(0., contextXmax - imW + 1));
    const bottomPad = Math.floor(Math.max(0., contextYmax - imH + 1));

    contextXmin = contextXmin + leftPad;
    contextXmax = contextXmax + leftPad;
    contextYmin = contextYmin + topPad;
    contextYmax = contextYmax + topPad;

    const xmin = Math.floor(contextXmin);
    const ymin = Math.floor(contextYmin);
    const h = Math.floor(contextYmax + 1) - ymin;
    const w = Math.floor(contextXmax + 1) - xmin;

    let imPatch = tf.tidy(() => tf.cast(tf.zeros([3, h, w]), 'float32') as tf.Tensor3D);
    const imTensorT = tf.transpose(imTensor, [2, 0, 1])
    const tensorX = tf.gather(imTensorT, 0);
    const tensorY = tf.gather(imTensorT, 1);
    const tensorZ = tf.gather(imTensorT, 2);
    imTensorT.dispose();

    if (any([topPad, bottomPad, leftPad, rightPad])) {
        const xVal = avgChans.dataSync()[0];
        const yVal = avgChans.dataSync()[1];
        const zVal = avgChans.dataSync()[2];

        const paddings = [[topPad, bottomPad], [leftPad, rightPad]] as [number, number][];
        const tensorXPad = tensorX.pad(paddings, xVal);
        const tensorYPad = tensorY.pad(paddings, yVal);
        const tensorZPad = tensorZ.pad(paddings, zVal);

        const X = tensorXPad.slice([ymin, xmin], [h, w]);
        const Y = tensorYPad.slice([ymin, xmin], [h, w]);
        const Z = tensorZPad.slice([ymin, xmin], [h, w]);
        imPatch = tf.stack([X, Y, Z], 0) as tf.Tensor3D;
        tensorXPad.dispose(); tensorYPad.dispose(); tensorZPad.dispose();
        X.dispose(); Y.dispose(); Z.dispose();

    } else {
        const X = tensorX.slice([ymin, xmin], [h, w]);
        const Y = tensorY.slice([ymin, xmin], [h, w]);
        const Z = tensorZ.slice([ymin, xmin], [h, w]);
        imPatch = tf.stack([X, Y, Z], 0) as tf.Tensor3D;
        X.dispose(); Y.dispose(); Z.dispose();
    }
    tensorX.dispose(); tensorY.dispose(); tensorZ.dispose();
    imPatch = tf.transpose(imPatch, [1, 2, 0]) as tf.Tensor3D;
    if (sz !== modelSz) {
        imPatch = imPatch.resizeBilinear([modelSz, modelSz]);
    }
    return imPatch;
}

function any(iterable: number[]): boolean {
    for (const ite of iterable) {
        if (ite) return true;
    }
    return false;
}

/**
 * Convert top left + size into center + size
 * @param box
 */
export function get_axis_aligned_bbox(box: { x: number, y: number, w: number, h: number }) {
    return {
        cx: box.x + box.w / 2,
        cy: box.y + box.h / 2,
        w: box.w,
        h: box.h
    };
}

export function python2round(f: number) {
    if (Math.round(f + 1) - Math.round(f) !== 1) {
        return f + Math.abs(f) / f * 0.5;
    }
    return Math.round(f);
}

/**
 * Convert center + size to top left + size
 * @param pos
 * @param sz
 */
export function cxy_wh_2_rect(pos: number[], sz: number[]) {
    const xmin = Math.max(0.0, pos[0] - sz[0] / 2);
    const ymin = Math.max(0.0, pos[1] - sz[1] / 2);
    const w = sz[0];
    const h = sz[1];
    return [xmin, ymin, w, h];
}

export function change(r: tf.Tensor2D) {
    const rInv = tf.tidy(() => { return tf.ones([r.shape[0], r.shape[1]]).div(r); });
    return tf.maximum(r, rInv);
}

export function sz(w: tf.Tensor2D, h: tf.Tensor2D) {
    const pad = tf.tidy(() => { return w.add(h).mul(0.5); });
    const sz2 = tf.tidy(() => { return (w.add(pad)).mul(h.add(pad)); });
    pad.dispose();
    return sz2.sqrt();
}

export function sz_wh(wh: number[]): number {
    const pad = (wh[0] + wh[1]) * 0.5;
    const sz2 = (wh[0] + pad) * (wh[1] + pad);
    return Math.sqrt(sz2);
}

// function to retrieve an image
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((fulfill) => {
        const imageObj = new Image();
        imageObj.onload = () => fulfill(imageObj);
        imageObj.src = url;
    });
}

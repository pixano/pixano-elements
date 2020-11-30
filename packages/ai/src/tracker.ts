import * as tf from '@tensorflow/tfjs';
import { GraphModel } from '@tensorflow/tfjs';
// tf.setBackend('cpu');
tf.setBackend('webgl');
// tf.setBackend('wasm');
console.log('Tensorflow Backend :', tf.getBackend());
console.log('WEBGL_RENDER_FLOAT32_CAPABLE', tf.ENV.getBool('WEBGL_RENDER_FLOAT32_CAPABLE'));
console.log('WEBGL_RENDER_FLOAT32_ENABLED', tf.ENV.getBool('WEBGL_RENDER_FLOAT32_ENABLED'));


export class Tracker {

    images: HTMLImageElement[] = [];
    box0: { x: number, y: number, w: number, h: number } | null = null;
    model: GraphModel | null = null;
    // Ocean Config
    p: any = {
        penalty_k: 0.021, // penalty_k: 0.062,
        window_influence: 0.321, //window_influence: 0.38,
        lr: 0.730, //lr: 0.765,
        windowing: 'cosine',
        exemplar_size: 127,
        instance_size: 255,
        total_stride: 8,
        score_size: Math.floor((255 - 127) / 8) + 1 + 8, //    Int((instance_size - exemplar_size)/(total_stride)) + 1 + 8  # for ++
        context_amount: 0.5,
        ratio: 0.93, //ratio: 0.94,
        small_sz: 255,
        big_sz: 271
    };
    window: tf.Tensor2D;
    template: tf.Tensor3D | null = null;
    avg_chans: tf.Tensor | null = null;
    s_x: number = -1;

    // helper variables
    target_pos: [number, number] = [-1, -1];
    target_sz: [number, number] = [-1, -1];
    scale_z: number = -1;

    _loaded: boolean = false;

    constructor() {
        this.window = tf.tensor([17, 17]) as tf.Tensor2D;
        if (this.p.windowing === 'cosine') {
            let hannWindow = tf.signal.hannWindow(this.p.score_size);
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
            tf.loadGraphModel('models/oceanBis_tfjs/model.json').then((model) => {
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
        console.log('=======> Preparing Template... <=======');
        const box = get_axis_aligned_bbox(this.box0!);
        this.target_pos = [box.cx, box.cy];
        this.target_sz = [box.w, box.h];

        // Get context = how to crop both images.
        const wc_z = this.target_sz[0] + this.p.context_amount * (this.target_sz.reduce((a, b) => a + b, 0));
        const hc_z = this.target_sz[1] + this.p.context_amount * (this.target_sz.reduce((a, b) => a + b, 0));
        const s_z = Math.round(Math.sqrt(wc_z * hc_z));

        // pytorch model trained with BGR images.
        let frame_init = tf.tidy(() => tf.browser.fromPixels(im).reverse(-1));
        this.avg_chans = frame_init.mean([0, 1]);

        this.template = tf.tidy(() => get_subwindow_tracking(frame_init, this.target_pos, this.p.exemplar_size, s_z, this.avg_chans!));
        frame_init.dispose();

        this.scale_z = this.p.exemplar_size / s_z;
        let d_search = (this.p.instance_size - this.p.exemplar_size) / 2;  // slightly different from rpn++
        let pad = d_search / this.scale_z;
        this.s_x = python2round(s_z + 2 * pad);
        console.log('ratio', this.s_x, box.w, s_z)
        // s_x = 1000;
    }

    run(im: HTMLImageElement) {
        console.time('inference')
        const currentFrame = tf.tidy(() => tf.browser.fromPixels(im).reverse(-1));

        const search = tf.tidy(() => get_subwindow_tracking(currentFrame,
            this.target_pos, this.p.instance_size,
            this.s_x, this.avg_chans!));
        currentFrame.dispose();

        [this.target_pos, this.target_sz] = tf.tidy(() => update_tracks(this.model!,
            this.template!, search, this.target_pos,
            this.target_sz, this.window, this.scale_z,
            this.p));
        search.dispose();
        const location = cxy_wh_2_rect(this.target_pos, this.target_sz);
        console.timeEnd('inference')
        return location;
    }

    destroy() {
        this.avg_chans!.dispose();
        this.template!.dispose()
    }
}

/**
 * Update track.
 * Return pred_target_pos and pred_target_sz.
 * @param model 
 * @param template 
 * @param search 
 * @param target_pos 
 * @param target_sz 
 * @param window 
 * @param scale_z 
 * @param p 
 */
export function update_tracks(
    model: tf.GraphModel,
    template: tf.Tensor3D,
    search: tf.Tensor3D,
    target_pos: number[],
    target_sz: number[],
    window: tf.Tensor2D,
    scale_z: number,
    p: {
        penalty_k: number,
        window_influence: number,
        lr: number,
        windowing: String,
        exemplar_size: number,
        instance_size: number,
        total_stride: number,
        score_size: number,
        context_amount: number,
        ratio: number
    }): [number, number][] {
    let scaled_target_sz = [target_sz[0] * scale_z, target_sz[1] * scale_z];

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

    // const pred_x1 = tf.tidy(() => grid_to_search_x.sub(tf.gather(boundingboxes3D, 0)) as tf.Tensor2D);
    // const pred_y1 = tf.tidy(() => grid_to_search_y.sub(tf.gather(boundingboxes3D, 1)) as tf.Tensor2D);
    // const pred_x2 = tf.tidy(() => grid_to_search_x.add(tf.gather(boundingboxes3D, 2)) as tf.Tensor2D);
    // const pred_y2 = tf.tidy(() => grid_to_search_y.add(tf.gather(boundingboxes3D, 3)) as tf.Tensor2D);
    // boundingboxes3D.dispose(); grid_to_search_x.dispose(); grid_to_search_y.dispose();


    const templateTensor = tf.tidy(() => tf.cast(tf.expandDims(tf.transpose(template, [2, 0, 1])), 'float32'));
    const searchTensor = tf.tidy(() => tf.cast(tf.expandDims(tf.transpose(search, [2, 0, 1])), 'float32'));
    const [pred_x1, pred_y1, pred_x2, pred_y2, scores2D] = tf.tidy(() => model.execute({ 'template': templateTensor, 'search': searchTensor }, ['Identity:0', 'Identity_1:0', 'Identity_2:0', 'Identity_3:0', 'Identity_4:0']) as tf.Tensor2D[]);
    templateTensor.dispose(); searchTensor.dispose();

    // size penalty
    const s_c = tf.tidy(() => change(sz(pred_x2.sub(pred_x1), pred_y2.sub(pred_y1)).div(sz_wh(scaled_target_sz)))); // scale penalty

    const a = tf.tidy(() => tf.ones([pred_x1.shape[0], pred_x1.shape[1]]).mul(scaled_target_sz[0] / scaled_target_sz[1]));
    const b = tf.tidy(() => ((pred_x2.sub(pred_x1)).div((pred_y2.sub(pred_y1)))));
    const r_c = tf.tidy(() => change(a.div(b)));  // ratio penalty

    const penalty = tf.tidy(() => tf.exp((((r_c.mul(s_c)).sub(1)).mul(p.penalty_k)).mul(-1)));
    s_c.dispose(); a.dispose(); b.dispose(); r_c.dispose();

    const pscore0 = tf.tidy(() => penalty.mul(scores2D));
    // window penalty
    const pscore = tf.tidy(() => pscore0.mul(1 - p.window_influence).add(window.mul(p.window_influence)) as tf.Tensor2D);
    pscore0.dispose()

    // get max idx
    let idx_max = tf.tidy(() => pscore.argMax(1).dataSync());
    let n_vec = pscore.shape[0];
    let max_i = 0;
    let max_j = idx_max[max_i];
    let max_n = tf.tidy(() => tf.gather(tf.gather(pscore, max_i), max_j).dataSync()[0]);
    for (let i = 1; i < n_vec; i++) {
        let j = idx_max[i];
        let n = tf.tidy(() => tf.gather(tf.gather(pscore, i), j).dataSync()[0]);
        if (max_n < n) {
            max_i = i;
            max_j = j;
            max_n = n;
        }
    }
    let r_max = max_i;
    let c_max = max_j;
    pscore.dispose();

    // // to real size
    const max_pred_x1 = tf.tidy(() => tf.gather(tf.gather(pred_x1, r_max), c_max).dataSync()[0]);
    const max_pred_y1 = tf.tidy(() => tf.gather(tf.gather(pred_y1, r_max), c_max).dataSync()[0]);
    const max_pred_x2 = tf.tidy(() => tf.gather(tf.gather(pred_x2, r_max), c_max).dataSync()[0]);
    const max_pred_y2 = tf.tidy(() => tf.gather(tf.gather(pred_y2, r_max), c_max).dataSync()[0]);
    pred_x1.dispose(); pred_x2.dispose(); pred_y1.dispose(); pred_y2.dispose();

    const pred_xs = (max_pred_x1 + max_pred_x2) / 2;
    const pred_ys = (max_pred_y1 + max_pred_y2) / 2;
    let pred_w = max_pred_x2 - max_pred_x1;
    let pred_h = max_pred_y2 - max_pred_y1;

    let diff_xs = pred_xs - Math.floor(p.instance_size / 2);
    let diff_ys = pred_ys - Math.floor(p.instance_size / 2);

    diff_xs = diff_xs / scale_z;
    diff_ys = diff_ys / scale_z;
    pred_w = pred_w / scale_z;
    pred_h = pred_h / scale_z;

    const new_target_sz = scaled_target_sz.slice()
        .map((s) => s / scale_z);

    // size learning rate
    const max_penalty = tf.tidy(() => tf.gather(tf.gather(penalty, r_max), c_max).dataSync()[0]);
    const max_cls_score = tf.tidy(() => tf.gather(tf.gather(scores2D, r_max), c_max).dataSync()[0]);
    scores2D.dispose(); penalty.dispose();
    const lr = max_penalty * max_cls_score * p.lr;

    // size rate
    const res_xs = target_pos[0] + diff_xs;
    const res_ys = target_pos[1] + diff_ys;

    const res_w = pred_w * lr + (1 - lr) * new_target_sz[0];
    const res_h = pred_h * lr + (1 - lr) * new_target_sz[1];

    return [
        [res_xs, res_ys], // pred_target_pos
        [new_target_sz[0] * (1 - lr) + lr * res_w, new_target_sz[1] * (1 - lr) + lr * res_h] // pred_target_sz
    ];
}

// same as above but using slicing instead of creating a tensorBuffer
export function get_subwindow_tracking(
    im_tensor: tf.Tensor3D, // image to crop
    pos: Array<number>, // position of the center of the object to track/used as template
    model_sz: number, // output size of the patch
    original_sz: number, // amount of context croped in the patch (h*w)
    avg_chans: tf.Tensor // mean of the img channels used for padding
): tf.Tensor3D {
    let sz = original_sz;

    const im_h = im_tensor.shape[0];
    const im_w = im_tensor.shape[1];

    const c = (sz + 1) / 2;
    let context_xmin = Math.round(pos[0] - c);
    let context_ymin = Math.round(pos[1] - c);
    let context_xmax = context_xmin + sz - 1;
    let context_ymax = context_ymin + sz - 1;

    const left_pad = Math.floor(Math.max(0., -context_xmin));
    const top_pad = Math.floor(Math.max(0., -context_ymin));
    const right_pad = Math.floor(Math.max(0., context_xmax - im_w + 1));
    const bottom_pad = Math.floor(Math.max(0., context_ymax - im_h + 1));

    context_xmin = context_xmin + left_pad;
    context_xmax = context_xmax + left_pad;
    context_ymin = context_ymin + top_pad;
    context_ymax = context_ymax + top_pad;

    const xmin = Math.floor(context_xmin);
    const ymin = Math.floor(context_ymin);
    const h = Math.floor(context_ymax + 1) - ymin;
    const w = Math.floor(context_xmax + 1) - xmin;

    let im_patch = tf.tidy(() => tf.cast(tf.zeros([3, h, w]), 'float32') as tf.Tensor3D);
    const im_tensorT = tf.transpose(im_tensor, [2, 0, 1])
    const tensor_X = tf.gather(im_tensorT, 0);
    const tensor_Y = tf.gather(im_tensorT, 1);
    const tensor_Z = tf.gather(im_tensorT, 2);
    im_tensorT.dispose();

    if (any([top_pad, bottom_pad, left_pad, right_pad])) {
        const x_val = avg_chans.dataSync()[0];
        const y_val = avg_chans.dataSync()[1];
        const z_val = avg_chans.dataSync()[2];

        const paddings = [[top_pad, bottom_pad], [left_pad, right_pad]] as [number, number][];
        const tensor_X_pad = tensor_X.pad(paddings, x_val);
        const tensor_Y_pad = tensor_Y.pad(paddings, y_val);
        const tensor_Z_pad = tensor_Z.pad(paddings, z_val);

        const X = tensor_X_pad.slice([ymin, xmin], [h, w]);
        const Y = tensor_Y_pad.slice([ymin, xmin], [h, w]);
        const Z = tensor_Z_pad.slice([ymin, xmin], [h, w]);
        im_patch = tf.stack([X, Y, Z], 0) as tf.Tensor3D;
        tensor_X_pad.dispose(); tensor_Y_pad.dispose(); tensor_Z_pad.dispose();
        X.dispose(); Y.dispose(); Z.dispose();

    } else {
        const X = tensor_X.slice([ymin, xmin], [h, w]);
        const Y = tensor_Y.slice([ymin, xmin], [h, w]);
        const Z = tensor_Z.slice([ymin, xmin], [h, w]);
        im_patch = tf.stack([X, Y, Z], 0) as tf.Tensor3D;
        X.dispose(); Y.dispose(); Z.dispose();
    }
    tensor_X.dispose(); tensor_Y.dispose(); tensor_Z.dispose();
    im_patch = tf.transpose(im_patch, [1, 2, 0]) as tf.Tensor3D;
    if (sz !== model_sz) {
        im_patch = im_patch.resizeBilinear([model_sz, model_sz]);
    }
    return im_patch;
}

function any(iterable: Array<number>): Boolean {
    for (let index = 0; index < iterable.length; index++) {
        if (iterable[index]) return true;
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
    if (Math.round(f + 1) - Math.round(f) != 1) {
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
    let xmin = Math.max(0.0, pos[0] - sz[0] / 2);
    let ymin = Math.max(0.0, pos[1] - sz[1] / 2);
    let w = sz[0];
    let h = sz[1];
    return [xmin, ymin, w, h];
}

export function change(r: tf.Tensor2D) {
    let r_inv = tf.tidy(() => { return tf.ones([r.shape[0], r.shape[1]]).div(r); });
    return tf.maximum(r, r_inv);
}

export function sz(w: tf.Tensor2D, h: tf.Tensor2D) {
    let pad = tf.tidy(() => { return w.add(h).mul(0.5); });
    let sz2 = tf.tidy(() => { return (w.add(pad)).mul(h.add(pad)); });
    pad.dispose();
    return sz2.sqrt();
}

export function sz_wh(wh: number[]): number {
    let pad = (wh[0] + wh[1]) * 0.5;
    let sz2 = (wh[0] + pad) * (wh[1] + pad);
    return Math.sqrt(sz2);
}

// function to retrieve an image
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((fulfill) => {
        let imageObj = new Image();
        imageObj.onload = () => fulfill(imageObj);
        imageObj.src = url;
    });
}

import { ShapesEditController, ShapeCreateController } from './controller';
import { Tracker } from '@pixano/ai/lib/tracker';

/**
 * Inherit ShapeCreateController to handle creation of rectangle shapes.
 */
export class TrackingSmartController extends ShapesEditController {

    nextFrame: () => any;

    private tracker = new Tracker();

    constructor(props: Partial<TrackingSmartController>) {
        super(props);
        this.nextFrame = props.nextFrame || (() => {});
    }

    bindings() {
        super.bindings();
        this.keyBindings = this.keyBindings.bind(this);
    }

    activate() {
        super.activate();
        this.tracker.loadModel().then(() => console.info('Model loaded'));
        window.addEventListener('keydown', this.keyBindings)
    }

    deactivate() {
        window.removeEventListener('keydown', this.keyBindings);
    }

    keyBindings(e: KeyboardEvent) {
        if (e.key === 'n') {
            this.track();
        }
    }

    track() {
        // apply tracking
        const shape = this.targetShapes.values().next().value;
        if (!shape) {
            return;
        }
        const im0 = this.renderer.image;
        const x = Math.round(shape.geometry.vertices[0]*this.renderer.imageWidth);
        const y = Math.round(shape.geometry.vertices[1]*this.renderer.imageHeight);
        const w = Math.round(shape.geometry.vertices[2]*this.renderer.imageWidth) - x;
        const h = Math.round(shape.geometry.vertices[3]*this.renderer.imageHeight) - y;
        this.tracker.initBox(im0, x, y, w, h);
        this.nextFrame().then(() => {
            const im1 = this.renderer.image;
            const res = this.tracker.run(im1);
            const target = this.targetShapes.values().next().value;
            target.geometry.vertices = [
                res[0]/this.renderer.imageWidth,
                res[1]/this.renderer.imageHeight,
                (res[0]+res[2])/this.renderer.imageWidth,
                (res[1]+res[3])/this.renderer.imageHeight
            ]
            this.emitUpdate();
        });
    }
}


export class ClickController extends ShapeCreateController {

    protected onRootDown(evt: PIXI.InteractionEvent) {
        const pointer = (evt.data.originalEvent as PointerEvent);
        if (pointer.buttons === 2 || pointer.buttons === 4) {
            return;
        }
        const mouse = this.renderer.getPosition(evt.data);
        this.dispatchEvent(new CustomEvent('point', {detail: this.renderer.normalize(mouse)}));
    }
}
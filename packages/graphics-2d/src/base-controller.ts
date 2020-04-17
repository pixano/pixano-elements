
export abstract class Controller extends EventTarget {
    abstract activate(): void;
    abstract deactivate(): void;
    public reset() {
        this.deactivate();
        this.activate();
    }
    protected pointerHandlers: {
        [key: string]: (evt: any) => void;
    } = {};
    protected keyHandlers: {
        [key: string]: (evt: any) => void;
    } = {};
}

export abstract class Controller extends EventTarget {
    abstract activate(): void;
    abstract deactivate(): void;
    // Reset interaction mode
    public reset() {
        this.deactivate();
        this.activate();
    }
    public emit(type: string, detail: any) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    // to call in constructor
    protected bindings() {}
}
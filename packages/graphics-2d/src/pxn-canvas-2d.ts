/**
 * Implementation of generic class that displays an image
 * with 2D shapes overlayed.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property } from 'lit-element';
import { ObservableSet, observe } from '@pixano/core';
import { ShapeData } from './types';
import { ShapesManager } from './shapes-manager';
import { ViewControls } from './view-controls';
import { observable } from '@pixano/core';
import { Canvas } from './pxn-canvas';

/**
 * Possible modes to be used in this class.
 */
export enum Mode {
  Create = 'create',
  Update = 'update',
  None = 'none'
}

/**
 * Inherit ViewControls to add node scaling
 * depending on zoom level.
 */
export class ViewControlsObjects extends ViewControls {
  public onWheel(evt: WheelEvent) {
    super.onWheel(evt);
    this.updateNodeSize();
  }
  updateNodeSize() {
    this.viewer.labelLayer.children.forEach((obj: any) => {
      obj.nodeContainer.children.forEach((o: any) => {
        o.scale.x = 1.5 / this.viewer.stage.scale.x;
        o.scale.y = 1.5 / this.viewer.stage.scale.y;
      });
    });
  }
}

/**
 * Parent class that displays image with
 * 2d shapes. Can be easily inherited.
 * @fires CustomEvent#create upon creating an new object { detail: Shape }
 * @fires CustomEvent#update upon updating an object { detail: ids[] }
 * @fires CustomEvent#delete upon creating an new object { detail: ids[] }
 */
@customElement('pxn-canvas-2d' as any)
export class Canvas2d extends Canvas {

  // input mode type
  @property({type: String, reflect: true})
  public mode: string = Mode.Update;

  // set of 2d shapes to be drawn by the element
  private _shapes: ObservableSet<ShapeData>;

  // manager that handles interaction with the
  // stage and the shapes.
  protected shManager: ShapesManager;

  // controller of the view enabling
  // panning with right pointer and zoom.
  protected viewControls: ViewControlsObjects = new ViewControlsObjects(this.renderer);

  constructor() {
    super();
    this._shapes = new ObservableSet<ShapeData>();
    // Create a manager of the shapes
    this.shManager = new ShapesManager(this.renderer, this._shapes);
    this.initShapeManagerListeners();
    this.initShapeSetObserver();
  }

  // observable set of selected shape ids.
  get selectedShapeIds() {
    const lis = [...this.shManager.targetShapes.values()];
    return lis.map((s) => s.id);
  }

  // observable set of selected shapes.
  get selectedShapes() {
    return [...this.shManager.targetShapes];
  }

  set selectedShapeIds(ids: string[]) {
    this.shManager.targetShapes.clear();
    for (const v of ids) {
      // retrieve shape corresponding to id
      const shape = [...this.shapes].find((s) => s.id === v);
      if (shape) {
        this.shManager.targetShapes.add(shape);
      }
    }
  }

  protected initShapeManagerListeners() {
    this.shManager.addEventListener('update', (evt: any) => {
      const ids = evt.detail;
      this.notifyUpdate(ids);
    });
  }

  // Get set of 2d shapes with their unique id.
  // 2d shapes are observed to keep display synchronized.
  // and to dispatch events.
  get shapes() {
    return this._shapes;
  }

  /**
   * Reset canvas content with given shapes
   * @param shapes Set of [ShapeData]
   */
  set shapes(value) {
    // console.time('t1');
    // encapsulate object in Proxy
    // to observe its property changes.
    this._shapes.set((value as any).map(observable));
  }

  /**
   * Copy selected shapes in clipboard
   */
  onCopy(): string | void {
    if (this.shManager.targetShapes.size) {
      return JSON.stringify([...this.shManager.targetShapes]);
    }
  }

  /**
   * Paste copied stuff
   */
  onPaste(text: string) {
    const value = JSON.parse(text);
    if (value instanceof Array) {
      value.forEach((v) => {
        const shape = observable({
          ...v,
          id: Math.random().toString(36).substring(7)
        } as ShapeData)
        // Add new object to the list of annotations
        this.shapes.add(shape);
      })
    }
  }

  /**
   * General keyboard event handling
   * @param event [keyBoardEvent]
   */
  public keyBinding (evt: Event) {
    super.keyBinding(evt);
    const event = evt as KeyboardEvent;
    switch (event.key) {
      case 'Tab': {
        this.onTabulation.bind(this)(event);
        break;
      }
      case 'Delete': {
        this.shManager.targetShapes.forEach((s) => this.shapes.delete(s));
        this.shManager.targetShapes.clear();
        break;
      }
      case 'Escape': {
        this.shManager.targetShapes.clear();
        break;
      }
    }
  }

  /**
   * Handle tabulation event
   * @param event [keyBoardEvent]
   */
  protected onTabulation(event: KeyboardEvent) {
    if (this.mode === Mode.Create) {
      return;
    }
    event.preventDefault();
    const shapes = [...this.shapes.values()];
    const currIdx = shapes.findIndex((s) => this.shManager.targetShapes.has(s)) || 0;
    const nextIdx = event.shiftKey ?  (currIdx + 1 + shapes.length) % shapes.length
                                    : (currIdx - 1 + shapes.length) % shapes.length;
    const nextShape = shapes[nextIdx];
    if (nextShape) {
      this.shManager.targetShapes.set([nextShape])
    }
  }

  protected initShapeSetObserver() {
    // Trigger notification on shape
    // selection(s) changed.
    observe(this.shManager.targetShapes, () => {
      this.notifySelection([...this.shManager.targetShapes].map((t) => t.id));
    });
    observe(this.shapes, (event: any, shape?: ShapeData) => {
      if (event === 'add' && shape) {
        this.notifyCreate(shape);
      }
      if (event === 'delete' && shape) {
        this.notifyDelete([shape.id]);
      }
    });
  }

  /**
   * Called after the element’s DOM has been updated the first time
   * @param changedProperty
   */
  protected firstUpdated() {
    this.renderer.setContainer(this.canvasElement);
  }

  /**
   * Snackbar temporary appearance
   * To display mode instructions.
   * @param text
   */
  protected showTooltip(text: string) {
    const x = this.shadowRoot!.getElementById("snackbar")!;
    x.className = "show";
    x.innerHTML = text;
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
  }

  /**
   * Called on every property change
   * @param changedProperty
   */
  protected updated(changedProperties: any) {
    super.updated(changedProperties);
    if (changedProperties.has('mode') && this.mode) {
      this.shManager.setMode(this.mode);
      this.dispatchEvent(new Event('mode'));
    }
  }

  protected notifyUpdate(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` creates object.
     *
     * @event update
     * @param {string[]} ids Ids updated.
     */
    this.dispatchEvent(new CustomEvent('update', { detail: ids }));
  }

  protected notifyMode(mode: Mode) {
    /**
     * Fired when `pxn-canvas-2d` changes mode.
     *
     * @event mode
     * @param {string} mode New mode.
     */
    this.mode = mode;
    this.dispatchEvent(new CustomEvent('mode', {detail: this.mode}));
  }

  protected notifySelection(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` changes selection.
     *
     * @event selection
     * @param {string[]} ids New selection.
     */
    this.dispatchEvent(new CustomEvent('selection', {detail: ids}));
  }

  protected notifyCreate(obj: ShapeData) {
    /**
     * Fired when `pxn-canvas-2d` creates object.
     *
     * @event create
     * @param {string} obj New shape.
     */
    this.dispatchEvent(new CustomEvent('create', {detail: obj}));
  }

  protected notifyDelete(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` deletes object.
     *
     * @event delete
     * @param {string[]} ids Ids deleted.
     */
    this.dispatchEvent(new CustomEvent('delete', { detail: ids}));
  }
}

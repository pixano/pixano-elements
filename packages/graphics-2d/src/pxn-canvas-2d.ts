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
import { ShapesEditController } from './shapes-controllers';
import { observable } from '@pixano/core';
import { Canvas } from './pxn-canvas';
import { Shape } from './shapes-2d';
import { Controller } from './base-controller';
import { dataToShape } from './adapter';


/**
 * Parent class that displays image with
 * 2d shapes. Can be easily inherited.
 * @fires CustomEvent#create upon creating an new object { detail: Shape }
 * @fires CustomEvent#update upon updating an object { detail: ids[] }
 * @fires CustomEvent#delete upon creating an new object { detail: ids[] }
 * @fires CustomEvent#selection upon selection of objects { detail: ids[] }
 * @fires CustomEvent#mode upon interactive mode change { detail: string }
 */
@customElement('pxn-canvas-2d' as any)
export class Canvas2d extends Canvas {

  // input mode type
  @property({type: String, reflect: true})
  public mode: string = "edit";

  // Enable user to draw outside of the image
  @property({type: Boolean})
  public enableOutsideDrawing: boolean = false;

  // set of 2d shapes to be drawn by the element
  private _shapes: ObservableSet<ShapeData>;

  public targetShapes: ObservableSet<ShapeData> = new ObservableSet();

  public graphics: Set<Shape> = new Set();

  public modes: {
    [key: string]: Controller;
  };

  // can be replaced by a custom dataToShape function
  public dataToShape: ((s: ShapeData) => Shape) = dataToShape;

  constructor() {
    super();
    this._shapes = new ObservableSet<ShapeData>();
    this.viewControls.addEventListener('zoom', () => {
      this.renderer.labelLayer.children.forEach((obj: any) => {
        obj.nodeContainer.children.forEach((o: any) => {
          o.scale.x = 1.5 / this.renderer.stage.scale.x;
          o.scale.y = 1.5 / this.renderer.stage.scale.y;
        });
      });
    });
    this.modes = {
      edit: new ShapesEditController(this.renderer, this.graphics, this.targetShapes, this.dispatchEvent.bind(this))
    }
    this.renderer.onImageSizeChange = () => {
      // this.renderer.clearLabels();
      // this.graphics.clear();
      this.graphics.forEach((s: Shape) => {
          s.scaleX = this.renderer.imageWidth || 100;
          s.scaleY = this.renderer.imageHeight || 100;
          s.draw();
      });
    }
    // Order important
    // Other solution: call shapes.clear() on shapes change
    this.observeShapeForDisplay();
    this.observeShapeForNotification();
    this.modes[this.mode].activate();
  }

  // observable set of selected shape ids.
  get selectedShapeIds() {
    const lis = [...this.targetShapes.values()];
    return lis.map((s) => s.id);
  }

  set selectedShapeIds(ids: string[]) {
    const shapes = [...this.shapes].filter((s) => ids.includes(s.id));
    this.targetShapes.set(shapes);
  }

  // observable set of selected shapes.
  get selectedShapes() {
    return [...this.targetShapes];
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
    // to observe its property changes.
    this._shapes.set((value as any).map(observable));
  }

  /**
   * Copy selected shapes in clipboard
   */
  onCopy(): string | void {
    if (this.targetShapes.size) {
      return JSON.stringify([...this.targetShapes]);
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

  observeShapeForDisplay(){
    // new ShapeCreateController(this.renderer)
    // listen global changes on the set of shapes:
    // add a new shape, delete a shape, initialize set.
    observe(this._shapes, (prop: string, value?: any) => {
      switch(prop) {
          case 'set':
          case 'add': {
              value = [value];
              if (prop === 'set') {
                  // reset all objects at once
                  this.renderer.clearLabels();
                  this.graphics.clear();
                  value = this._shapes;
              }
              value.forEach((s: ShapeData) => {
                  const obj = this.dataToShape(s);
                  this.graphics.add(obj);
                  obj.scaleX = this.renderer.imageWidth || 100;
                  obj.scaleY = this.renderer.imageHeight || 100;
                  this.renderer.labelLayer.addChild(obj);
                  obj.draw();
              });
              // reapply interaction controller to new objects
              if (this.modes[this.mode]) {
                  this.modes[this.mode].reset();
              }
              break;
          }
          case 'delete': {
              const obj = [...this.graphics].find(({data}) => data === value);
              if (obj) {
                  this.graphics.delete(obj);
                  this.renderer.labelLayer.removeChild(obj);
                  this.targetShapes.clear();
              }
              break;
          }
          case 'clear': {
              this.renderer.clearLabels();
              if (this.targetShapes.size) {
                  this.targetShapes.clear();
              }
              break;
          }
      }
    });
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
        this.targetShapes.forEach((s) => this.shapes.delete(s));
        this.targetShapes.clear();
        break;
      }
      case 'Escape': {
        this.targetShapes.clear();
        break;
      }
    }
  }

  public setController(mode: string, controller: Controller) {
    if (mode === this.mode && this.modes[mode]) {
        // remove active base controller
        this.modes[mode].deactivate();
        this.modes[mode] = controller;
        this.modes[mode].activate();
    } else {
        this.modes[mode] = controller;
    }
    return this;
  }

  /**
   * Handle new mode set:
   * 1. Reset canvas to default "mode-free" (no interaction)
   * 2. Apply interactions of new mode
   * @param mode string
   */
  public setMode(mode: string) {
    if (mode !== this.mode) {
        if (this.modes[this.mode]) {
            // Restore default state
            this.modes[this.mode].deactivate();
        }
        if (this.modes[mode]) {
            // Set up new mode state
            this.modes[mode].activate();
        }
        this.mode = mode;
    }
}


  /**
   * Handle tabulation event
   * @param event [keyBoardEvent]
   */
  protected onTabulation(event: KeyboardEvent) {
    if (this.mode === "create") {
      return;
    }
    event.preventDefault();
    const shapes = [...this.shapes.values()];
    const currIdx = shapes.findIndex((s) => this.targetShapes.has(s)) || 0;
    const nextIdx = event.shiftKey ?  (currIdx + 1 + shapes.length) % shapes.length
                                    : (currIdx - 1 + shapes.length) % shapes.length;
    const nextShape = shapes[nextIdx];
    if (nextShape) {
      this.targetShapes.set([nextShape])
    }
  }

  protected observeShapeForNotification() {
    // Trigger notification on shape
    // selection(s) changed.
    observe(this.targetShapes, (prop) => {
      if (prop !== 'set') {
        this.notifySelection([...this.targetShapes].map((t) => t.id));
      }
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
      const prevMode = changedProperties.get('mode');
      if (this.modes[prevMode]) {
        // Restore default state of previous mode
        this.modes[prevMode].deactivate();
      }
      if (this.modes[this.mode]) {
          // Set up new mode state
          // Use reset instead of activate
          // to avoid another activate conflict
          this.modes[this.mode].reset();
          this.dispatchEvent(new Event('mode'));
      }
    }
    if (changedProperties.has('enableOutsideDrawing')) {
      this.renderer.enableOutsideDrawing = this.enableOutsideDrawing;
      (this.modes.edit as ShapesEditController).enableOutsideDrawing = this.enableOutsideDrawing;
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

  protected notifyMode(mode: string) {
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

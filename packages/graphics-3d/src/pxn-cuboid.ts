/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { css, customElement, html, LitElement, property } from 'lit-element';
import { ObservableSet, observable } from "@pixano/core";
import { copyClipboard, pasteClipboard } from '@pixano/core/lib/utils';
import { InteractiveMode, ModeManager } from "./cuboid-manager";
import { GroundPlot, PointCloudPlot } from './plots';
import { CuboidSetManager } from "./cuboid-set-manager";
import { SceneView } from './scene-view';
import { Cuboid } from "./types";
import { normalizeAngle, filterCentralArea, findLowestZ } from './utils';
import { GroundSegmentation } from './ground-segmentation';
import { InnerPointsPainter } from './pointcloud-painter';

/** An interactive 3D editor window to manipulate cuboid objects. -
 *
 * @fires CustomEvent#create upon creating an new cuboid { detail: Cuboid }
 * @fires CustomEvent#update upon editing a cuboid { detail: Cuboid }
 * @fires CustomEvent#delete upon deletion of a cuboid { detail: Cuboid }
 * @fires CustomEvent#selection upon deletion of a cuboid { detail: Cuboid[] }
 */
@customElement('pxn-cuboid-editor' as any)
export class CuboidEditor extends LitElement {

  // viewer of scene
  private viewer: SceneView = new SceneView();

  // set of 3d annotation objects
  private _editableCuboids: ObservableSet<Cuboid> = new ObservableSet<Cuboid>();

  private cuboidPlots: CuboidSetManager = new CuboidSetManager(this.viewer, this.editableCuboids);

  private groundPlot: GroundPlot = new GroundPlot();

  private pclPlot: PointCloudPlot = new PointCloudPlot();

  private innerPointsPainter: InnerPointsPainter;

  private groundSegmentation: GroundSegmentation;

  private modeManager: ModeManager;

  /** Current editing mode - Either "edit", "create" or "none". */
  @property({type: String})
  public mode: InteractiveMode;

  constructor() {
    super();
    this.viewer.scene.add(this.pclPlot);
    this.viewer.scene.add(this.groundPlot);

    // decomment this if you want to paint inner points of cuboids
    this.innerPointsPainter = new InnerPointsPainter(this.pclPlot, this.editableCuboids);

    // ground segmentation
    this.groundSegmentation = new GroundSegmentation();

    this.modeManager = new ModeManager(
        this.viewer, this, this.editableCuboids,
        this.cuboidPlots, this.groundPlot, this.pclPlot,
        this.groundSegmentation);
    this.mode = this.modeManager.mode;
    window.addEventListener("keydown", this.defaultOnKeyDown.bind(this));
  }

  destroy() {
    this.cuboidPlots.destroy();
    this.innerPointsPainter.destroy();
    this.groundPlot.destroy();
    this.pclPlot.destroy();
    this.modeManager.destroy();
  }

  // LitElement implementation
  static get styles() {
    return [
      css`
      :host {
        width: 100%;
        height: 100%;
        min-height: 300px;
        min-width: 100px;
        position: relative;
        display: block;
      }
      #root {
        width: 100%;
        height: 100%;
        position: relative;
        background-color: black;
        background-repeat: no-repeat;
        margin: 0px;
        overflow: hidden;
      }
      /* Medium Devices, Desktops */
      @media only screen and (min-width : 992px) {
        #root {
          min-height: 600px;
          max-height: 100vh;
        }
      }
      `
    ];
  }

  firstUpdated() {
    const container = this.shadowRoot!.getElementById("root") as HTMLElement;
    container.appendChild(this.viewer.domElement);
    this.viewer.onResize();
    window.addEventListener("resize", () => this.viewer.onResize());
    this.viewer.render();
    this.addEventListener('mode', () => this.mode = this.modeManager.mode);
  }

  render() {
    return html`<div id="root"></div>`;
  }

  // Exposed API

  get cameraMode() {
    return this.viewer.cameraMode;
  }
  set cameraMode(value) {
    this.mode = 'edit';
    this.viewer.cameraMode = value;
    this.viewer.render();
  }

  /** Point cloud as flattened array of [x, y, z] point coordinates. */
  get pcl() {
    return this.pclPlot.positionBuffer;
  }

  set pcl(value: Float32Array) {
    const count = this.pclPlot.count;
    this.pclPlot.positionBuffer = value;
    if (count === this.pclPlot.maxPts) {
      // initialization of ground z
      const {points, zmin, zmax} = filterCentralArea(this.pclPlot.positionBuffer);
      const z = findLowestZ(points, zmin, zmax);
      this.groundPlot.setZ(z);
      this.groundSegmentation.groundZ = z;
    }
    this.viewer.render();
  }

  getPcl() {
    return this.pclPlot;
  }

  updated(changedProperties: any) {
    if (changedProperties.has('mode')) {
      this.modeManager.mode = this.mode;
    }
  }

  swap() {
    const sel = this.editTarget as Cuboid;
    if (sel) {
      sel.size = [sel.size[1], sel.size[0], sel.size[2]];
      sel.heading = normalizeAngle(sel.heading - Math.PI / 2);
    }
    return sel;
  }

  rotate() {
    const sel = this.editTarget as Cuboid;
    if (sel) {
      sel.heading = normalizeAngle(sel.heading - Math.PI / 2);
    }
    return sel;
  }

  /** The set of editable cuboid. - The cuboid must be observable. */
  get editableCuboids() {
    return this._editableCuboids;
  }
  set editableCuboids(value) {
    this._editableCuboids.clear();
    value = value || [];
    for (const v of value) {
      this._editableCuboids.add(observable(v));
    }
  }

  /** Sets the object of interest for editing */
  get editTarget(): Cuboid | null {
    return this.modeManager.editTarget;
  }
  set editTarget(cuboid) {
      if (cuboid) {
        if (!this.editableCuboids.has(cuboid)) {
          throw new Error("target is not an existing annotation");
        }
        this.modeManager.editTarget = cuboid;
        this.modeManager.mode = 'edit';
      } else {
        this.modeManager.editTarget = null;
      }
  }

  /**
   * Insert a new annotation in the scene.
   *
   * @deprecated add directly to {@link CuboidEditor#editableCuboids}.
   */
  addAnnotation(annotation: Cuboid) {
    const newObj = observable(annotation);
    this.editableCuboids.add(newObj);
    return newObj;
  }

  /**
   * Copy selected cuboid in clipboard
   */
  copy() {
    if (this.editTarget) {
      copyClipboard(JSON.stringify(this.editTarget));
    }
  }

  /**
   * Paste copied cuboid
   */
  paste() {
    pasteClipboard().then((text) => {
      if (text) {
        const cuboid = observable({
          ...JSON.parse(text),
          id: Math.random().toString(36).substring(7)
        } as Cuboid)

        // Add new object to the list of annotations
        this.editableCuboids.add(cuboid);
        this.dispatchEvent(new CustomEvent("create", { detail: cuboid}));
      }
    });
  }

  /**
   * Default keybindings
   * @param e Keyboard event
   */
  protected defaultOnKeyDown(e: KeyboardEvent) {
    if (e.key === " " && this.editTarget !== null) {
      this.editTarget.heading = this.editTarget.heading - Math.PI / 2;
      this.dispatchEvent(new CustomEvent('update', { detail: this.editTarget }));

    } else if (e.key === 'Escape') {
      this.editTarget = null;
      this.modeManager.mode = 'edit';

    } else if ((e.key === 'Delete') && this.editTarget) {
      const annotation = this.editTarget;
      this.editableCuboids.delete(this.editTarget!);
      this.dispatchEvent(new CustomEvent('delete', { detail: annotation }));

    } else if (e.key === 'n') {
      this.modeManager.mode = 'create';

    } else if (e.key === 'c' && e.ctrlKey) {
      this.copy();

    } else if (e.key === 'v' && e.ctrlKey) {
      this.paste();

    } else if (e.key === '+') {
      if (this.pclPlot) {
          this.pclPlot.plusSize();
          this.viewer.render();
      }
  } else if (e.key === '-') {
      if (this.pclPlot) {
          this.pclPlot.minusSize();
          this.viewer.render();
      }
    }
  }
}

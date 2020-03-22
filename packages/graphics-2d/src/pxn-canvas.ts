/**
 * Implementation of generic class that displays an image
 * with 2D shapes overlayed.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { LitElement, html, css, customElement, property } from 'lit-element';
import { copyClipboard, pasteClipboard } from '@pixano/core/lib/utils';
import { Renderer } from './renderer';
import { ViewControls } from './view-controls';

const fullscreen = html`<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.414 18.586l2.586-2.586v8h-8l2.586-2.586-5.172-5.172 2.828-2.828 5.172 5.172zm-13.656-8l2.828-2.828-5.172-5.172 2.586-2.586h-8v8l2.586-2.586 5.172 5.172zm10.828-8l-2.586-2.586h8v8l-2.586-2.586-5.172 5.172-2.828-2.828 5.172-5.172zm-8 13.656l-2.828-2.828-5.172 5.172-2.586-2.586v8h8l-2.586-2.586 5.172-5.172z"/></svg>`;

/**
 * Parent class that displays image
 */
@customElement('pxn-canvas' as any)
export class Canvas extends LitElement {

  // input image path
  @property({type: String})
  public image: string | null = null;

  // whether to display or not the labels
  // on the image
  @property({type: Boolean})
  public hideLabels: boolean = false;

  @property({type: Boolean})
  public disablefullscreen: boolean = false;

  // background color
  public color: string = "#f3f3f5";

  // renderer class
  // html view is added on firstUpdated
  protected renderer: Renderer = new Renderer({color: this.color});

  // controller of the view enabling
  // panning with right pointer and zoom.
  protected viewControls: ViewControls = new ViewControls(this.renderer);

  protected keyHandlerBind: (evt: any) => void = this.keyBinding.bind(this);

  static get styles() {
    return [
      css`
      :host {
        width: 100%;
        height: 100%;
        min-width: 100px;
        position: relative;
        display: block;
      }
      .canvas-container {
        height: 100%;
        width: 100%;
        position: relative;
        background-repeat: no-repeat;
        margin: 0px;
        overflow: hidden;
      }
      .corner {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        position: absolute;
        right: 0px;
        z-index: 1;
        display: flex;
        color: black;
        background: #ffffff2e;
        padding: 10px;
        border-radius: 50%;
        margin: 5px;
        cursor: pointer;
        height: auto;
        width: 20px;
        font-size: 18px;
        -webkit-transition: all 0.5s ease;
          -moz-transition: all 0.5s ease;
            -o-transition: all 0.5s ease;
            -ms-transition: all 0.5s ease;
                transition: all 0.5s ease;
      }
      .corner:hover {
        background: white;
      }
      #snackbar {
        visibility: hidden;
        min-width: 250px;
        margin-left: -125px;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 2px;
        padding: 16px;
        position: fixed;
        z-index: 1;
        left: 50%;
        bottom: 30px;
        font-size: 17px;
        -webkit-touch-callout: none; /* iOS Safari */
            -webkit-user-select: none; /* Safari */
             -khtml-user-select: none; /* Konqueror HTML */
               -moz-user-select: none; /* Old versions of Firefox */
                -ms-user-select: none; /* Internet Explorer/Edge */
                    user-select: none; /* Non-prefixed version, currently
                                          supported by Chrome, Opera and Firefox */
      }

      #snackbar.show {
        visibility: visible;
        -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
        animation: fadein 0.5s, fadeout 0.5s 2.5s;
      }

      @-webkit-keyframes fadein {
        from {bottom: 0; opacity: 0;}
        to {bottom: 30px; opacity: 1;}
      }

      @keyframes fadein {
        from {bottom: 0; opacity: 0;}
        to {bottom: 30px; opacity: 1;}
      }

      @-webkit-keyframes fadeout {
        from {bottom: 30px; opacity: 1;}
        to {bottom: 0; opacity: 0;}
      }

      @keyframes fadeout {
        from {bottom: 30px; opacity: 1;}
        to {bottom: 0; opacity: 0;}
      }`
    ];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    // set global window event listeners on connection
    window.addEventListener('keydown', this.keyHandlerBind);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // A classic event listener will not be automatically destroyed by lit-element,
    // This will introduce memory leaks and weird bugs.
    window.removeEventListener('keydown', this.keyHandlerBind);
  }

  get imageWidth() {
    return this.renderer.imageWidth;
  }

  get imageHeight() {
    return this.renderer.imageHeight;
  }

  /**
   * Set the image to display, from a Image Element
   */
  set imageElement(img: HTMLImageElement) {
    if (img !== this.imageElement) {
      this.renderer.image = img;
      this.onImageChanged();
    }
  }

  get imageElement() {
    return this.renderer.htmlImageElement;
  }

  public zoomIn() {
    this.viewControls.zoomIn();
  }

  public zoomOut() {
    this.viewControls.zoomOut();
  }

  public resize() {
    this.renderer.resize();
  }

  /**
   * Handle copy keyboard event
   * Return the string you want to copy
   */
  protected onCopy(): string | void {
    // Implement your own onCopy method.
  }

  /**
   * Handle paste of copied string.
   */
  protected onPaste(text: string): string | void {
    return text;
  }

  /**
   * Invoked on image change.
   */
  protected onImageChanged() {
    // Implement your own onImageChanged method.
  }

  /**
   * General keyboard event handling
   * @param event [keyBoardEvent]
   */
  public keyBinding (evt: Event) {
    const event = evt as KeyboardEvent;
    switch (event.key) {
      case 'c': {
        if (event.ctrlKey) {
          const str = this.onCopy();
          if (str) copyClipboard(str);
        }
        break;
      }
      case 'v': {
        if (event.ctrlKey) {
          pasteClipboard().then((str) => {
            if (str) this.onPaste(str);
          });
        }
        break;
      }
      case 'm': {
        this.renderer.brightness -= 0.1;
        break;
      }
      case 'p': {
        this.renderer.brightness += 0.1;
        break;
      }
    }
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

  protected loadImageFromSrc(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      if (src) {
        img.onload = () => {
          if (img !== null) {
            resolve(img)
          }
        }
        img.src = src;
      } else {
        resolve(img);
      }
    })
  }

  /**
   * Called on every property change
   * @param changedProperty
   */
  protected updated(changedProperties: any) {
    if (changedProperties.has('image') && this.image != null) {
      this.loadImageFromSrc(this.image).then((img) => {
        this.imageElement = img;
      });
    }
    if (changedProperties.has('hideLabels') && this.hideLabels !== undefined) {
      this.renderer.showLabels = !this.hideLabels;
    }
  }

  /**
   * Return HTML canvas element where labels are drawn
   */
  protected get canvasElement(): HTMLDivElement {
    return this.shadowRoot!.getElementById("canvas") as HTMLDivElement;
  }

  /**
   * Render canvas fullscreen.
   */
  protected fullScreen() {
    if (document.fullscreenEnabled) {
      this.canvasElement.requestFullscreen();
    }
  }

  /**
   * Render the element template.
   */
  render() {
    /**
     * `render` must return a lit-html `TemplateResult`.
     *
     * To create a `TemplateResult`, tag a JavaScript template literal
     * with the `html` helper function:
     */
    return html`
      ${this.disablefullscreen ? html``: html`
        <p class="corner" @click=${this.fullScreen} title="Fullscreen">${fullscreen}</p>`}
      <div id="canvas" class="canvas-container" oncontextmenu="return false;"></div>
      <div id="snackbar">Some text some message..</div>
    `;
  }
}
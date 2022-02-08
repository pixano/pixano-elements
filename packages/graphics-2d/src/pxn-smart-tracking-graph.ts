/**
 * Implementation of tracking plugin.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

 import { customElement, html, property} from 'lit-element';
 import { TrackingGraph } from './pxn-tracking-graph'
//  import { Tracker } from '@pixano/ai/lib/tracker';
 import { ShapeData } from './types';
 import {
     getShape,
     setShape
 } from './utils-video';
 import '@material/mwc-switch';
 

 export class ExtTracker {
    public url: string = "http://localhost:4000";
    public updateInterval: number = 15;
    loadModel(url: string){
        this.url = url;
        const o = {type: 'load'};
        fetch(this.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(o) 
            })
        return Promise.resolve()
        
    }
    async initKeypoints(img: string, kps: number[], vis: number[], fid: number, w: number, h: number, trackId: string){ 
        const o = {image: img, keypoints: kps, visibility: vis, type: 'init', frame_id: fid, width: w, height: h, id: trackId} 
        return new Promise((resolve)=>{
            fetch(this.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(o) 
            }).then(res => res.json())
            .then(res => {
                resolve(res)
            })
        }) 
    }
    
    async updateModel(img: string, kps: number[], vis: number[], fid: number, w: number, h: number, trackId: string){ 
        const o = {image: img, keypoints: kps, visibility: vis, type: 'update', frame_id: fid, width: w, height: h, id: trackId} 
        return new Promise((resolve)=>{
            fetch(this.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(o) 
            }).then(res => res.json())
            .then(res => {
                resolve(res)
            })
        }) 
    }

    async run(imgNext: string, fid: number, w: number, h:number, trackId: string): Promise<any[]>{
        const o = {image: imgNext, keypoints: [], visibility: [], type: 'run', frame_id: fid, width: w, height: h, id: trackId}
        return new Promise((resolve)=>{
            fetch(this.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(o) 
            }).then(res => res.json())
            .then(res => {
                resolve([res["keypoints"], res["visibility"]])
            })
        }) 
    }

 }
 
 @customElement('pxn-smart-tracking-graph' as any)
 export class SmartTrackingGraph extends TrackingGraph {
 
     // smart tracker
     private tracker = new ExtTracker();

     @property()
     public frameCount: number = 0;
     
     @property({type: Boolean})
     public isModelInitialized: boolean = false;
 
     @property({type: String})
     public model: string = 'http://localhost:4000';
 
     constructor() {
         super();
       // // @ts-ignore
         this.addEventListener('create', () => {
            this.isModelInitialized = false; 
		});

     }
 
     protected keyDownHandler = (evt: KeyboardEvent) => { if (evt.key === 't') { this.runTracking(); } }
 
     connectedCallback() {
         super.connectedCallback();
         // set global window event listeners on connection
         window.addEventListener('keydown', this.keyDownHandler);
     }
 
     disconnectedCallback() {
         // A classic event listener will not be automatically destroyed by lit-element,
         // This will introduce memory leaks and weird bugs.
         window.removeEventListener('keydown', this.keyDownHandler);
         super.disconnectedCallback();
     }

     runTracking(forwardMode:boolean=true) {
		if (this.isTrackTillTheEndChecked){
			this.trackTillTheEnd(forwardMode);
		}

		else {
			if (forwardMode) this.trackTillNextFrame();
			else this.trackTillPrevFrame();
		}
	}
 
     updated(changedProperties: any) {
         super.updated(changedProperties);
         if (changedProperties.has('model')) {
             // load the model
             this.renderer.renderer.plugins.interaction.cursorStyles.default = 'wait';
             this.tracker.loadModel(this.model).then(() => {
                 this.renderer.renderer.plugins.interaction.cursorStyles.default = 'inherit';
                 this.renderer.renderer.plugins.interaction.currentCursorMode = "inherit";
             });
         }
     }
 
     protected delay(ms: number) {
         return new Promise((resolve) => setTimeout(resolve, ms));
     };


     async trackTillTheEnd(forwardMode:boolean=true) {
         let stopTracking = false;
         const stopTrackingListenerFct = function stopTrackingListener (evt: KeyboardEvent) {
             if (evt.key === 'Escape') {
                 stopTracking = true;
             }
         }
         window.addEventListener('keydown', stopTrackingListenerFct);
         if (forwardMode){
            this.isModelInitialized = false;
            this.frameCount = 0
            while (!stopTracking && !this.isLastFrame()) {
                this.frameCount++;
                // update target template every 5 frames
                await this.trackTillNextFrame();
            }
            this.frameCount = 0
            this.isModelInitialized = false;
        }else{
            this.isModelInitialized = false;
            this.frameCount = 0
            while (!stopTracking && this.timestamp > 0) {
                this.frameCount++;
                // update target template every 5 frames
                await this.trackTillPrevFrame();
            }
            this.isModelInitialized = false;
            this.frameCount = 0
        }
         // back to edit mode after each new creation
         this.mode = 'edit';
 
         window.removeEventListener('keydown', stopTrackingListenerFct);
     }

     protected async trackTillPrevFrame(){
         /// process the selected shape
         if (this.targetShapes.size>1) {
            console.warn("ABORT: we can only track one shape at a time")
            return;
        }

        const currentTrackId = this.selectedTrackIds.values().next().value;
        // const target0 = this.targetShapes.values().next().value as ShapeData;
        const target0 = getShape(this.tracks[currentTrackId], this.timestamp)!;
        /// get the shape to track
        const v: number[] = target0.geometry.vertices; 
        const w: boolean[] = target0.geometry.visibles!;
        const trackId: string = target0.id;

        
        if (!this.isModelInitialized){
           const im0 = this.renderer.image; // await resizeImage(this.renderer.image, 200);
           const keypoints = v.map((it, idx) => idx%2==0? Math.round(it*im0.width): Math.round(it*im0.height)) // list x,y,x,y normalized
           const visibility: number[] = w.map((it) => it==true ? 1:0);

           const crop0 = this.cropImage(im0, {x: 0, y: 0, width: im0.width, height: im0.height});

           await this.tracker.initKeypoints(crop0, keypoints, visibility, this.timestamp, im0.width, im0.height, trackId);
           this.isModelInitialized = true;

           const im1 = await (this.loader as any).peekFrame(this.frameIdx-1);
           const crop1 = this.cropImage(im1, {x: 0, y: 0, width: im1.width, height: im1.height});
           /// processing
           const res = await this.tracker.run(crop1, this.timestamp - 1, im1.width, im1.height, trackId);
           await this.prevFrame();
           // TODO: should not move invisible points
           const predv: number[] = res[0];
           const predvis: boolean[] = res[1];
        //    const newKps = predv.map((it, idx) => predvis[Math.round(idx/2)]? it: v[idx])
           const newShape = JSON.parse(JSON.stringify(getShape(this.tracks[currentTrackId], this.timestamp + 1)))    
           newShape.geometry.vertices = predv; //newKps; 
           newShape.geometry.visibles = predvis;
           setShape(this.tracks[currentTrackId], this.timestamp, newShape, false);
           this.dispatchEvent(new Event('update-tracks'));
           await this.delay(100);
           
        }
        else {
           const im1 = await (this.loader as any).peekFrame(this.frameIdx-1);
           const crop1 = this.cropImage(im1, {x: 0, y: 0, width: im1.width, height: im1.height});
           /// processing
           const res = await this.tracker.run(crop1, this.timestamp - 1, im1.width, im1.height, trackId);
           await this.prevFrame();
           // should not move invisible points
           const predv: number[] = res[0];
           const predvis: boolean[] = res[1];
        //    const newKps = predv.map((it, idx) => predvis[Math.round(idx/2)]? it: v[idx])
           const newShape = JSON.parse(JSON.stringify(getShape(this.tracks[currentTrackId], this.timestamp+1)))
        //    newShape.geometry.vertices = [...target1.geometry.vertices];
           newShape.geometry.vertices = predv; //newKps; 
           newShape.geometry.visibles = predvis;
           setShape(this.tracks[currentTrackId], this.timestamp, newShape, false);
           this.dispatchEvent(new Event('update-tracks'));
           // Update dynamic template each n frames (n is fixed by the tracker update)
           if (this.frameCount == this.tracker.updateInterval){
               this.frameCount = 0;
               const keypoints = predv.map((it, idx) => idx%2==0? Math.round(it*im1.width): Math.round(it*im1.height)) // list x,y,x,y normalized
            //    const keypoints = newKps.map((it, idx) => idx%2==0? Math.round(it*im1.width): Math.round(it*im1.height)) // list x,y,x,y normalized
               const visibility: number[] = predvis.map((it) => it==true ? 1:0);
               this.tracker.updateModel(crop1, keypoints, visibility, this.timestamp, im1.width, im1.height, trackId);
           }
           await this.delay(100);
       }
     }
 
     protected async trackTillNextFrame() {
         /// process the selected shape
         if (this.targetShapes.size>1) {
             console.warn("ABORT: we can only track one shape at a time")
             return;
         }
 
         const currentTrackId = this.selectedTrackIds.values().next().value;
		// const target0 = this.targetShapes.values().next().value as ShapeData;
		const target0 = getShape(this.tracks[currentTrackId], this.timestamp)!;
         /// get the shape to track
         const v: number[] = target0.geometry.vertices; 
         const w: boolean[] = target0.geometry.visibles!;
         const trackId: string = target0.id;

         
         if (!this.isModelInitialized){
            const im0 = this.renderer.image; // await resizeImage(this.renderer.image, 200);
            const keypoints = v.map((it, idx) => idx%2==0? Math.round(it*im0.width): Math.round(it*im0.height)) // list x,y,x,y normalized
            const visibility: number[] = w.map((it) => it==true ? 1:0);

            const crop0 = this.cropImage(im0, {x: 0, y: 0, width: im0.width, height: im0.height});

            await this.tracker.initKeypoints(crop0, keypoints, visibility, this.timestamp, im0.width, im0.height, trackId);
            this.isModelInitialized = true;

            const im1 = await (this.loader as any).peekFrame(this.frameIdx+1);
            const crop1 = this.cropImage(im1, {x: 0, y: 0, width: im1.width, height: im1.height});
            /// processing
            const res = await this.tracker.run(crop1, this.timestamp + 1, im1.width, im1.height, trackId);
            await this.nextFrame()
            /// get calculated shape and take it as the new shape
            const target1 = this.targetShapes.values().next().value as ShapeData;
            // should not move invisible points
            const predv: number[] = res[0];
            const predvis: boolean[] = res[1];
            // const newKps = predv.map((it, idx) => predvis[Math.round(idx/2)]? it: v[idx])
            target1.geometry.vertices = predv; // newKps; 
            target1.geometry.visibles = predvis;
            const newShape = JSON.parse(JSON.stringify(getShape(this.tracks[target1.id], this.timestamp)))    
            newShape.geometry.vertices = [...target1.geometry.vertices];
            setShape(this.tracks[currentTrackId], this.timestamp, newShape, false);
		    this.dispatchEvent(new Event('update-tracks'));
            await this.delay(100);
            
         }
         else {
            const im1 = await (this.loader as any).peekFrame(this.frameIdx+1);
            const crop1 = this.cropImage(im1, {x: 0, y: 0, width: im1.width, height: im1.height});
            /// processing
            const res = await this.tracker.run(crop1, this.timestamp + 1, im1.width, im1.height, trackId);
            await this.nextFrame()
            /// get calculated shape and take it as the new shape
            const target1 = this.targetShapes.values().next().value as ShapeData;
            // should not move invisible points
            const predv: number[] = res[0];
            const predvis: boolean[] = res[1];
            // const newKps = predv.map((it, idx) => predvis[Math.round(idx/2)]? it: v[idx])
            target1.geometry.vertices = predv;//newKps; 
            target1.geometry.visibles = predvis;
            const newShape = JSON.parse(JSON.stringify(getShape(this.tracks[target1.id], this.timestamp)))
            newShape.geometry.vertices = [...target1.geometry.vertices];
            setShape(this.tracks[currentTrackId], this.timestamp, newShape, false);
		    this.dispatchEvent(new Event('update-tracks'));
            // Update dynamic template each n frames (n is fixed by the tracker update)
            if (this.frameCount == this.tracker.updateInterval){
                this.frameCount = 0;
                const keypoints = predv.map((it, idx) => idx%2==0? Math.round(it*im1.width): Math.round(it*im1.height)) // list x,y,x,y normalized
                // const keypoints = newKps.map((it, idx) => idx%2==0? Math.round(it*im1.width): Math.round(it*im1.height)) // list x,y,x,y normalized
                const visibility: number[] = predvis.map((it) => it==true ? 1:0);
                this.tracker.updateModel(crop1, keypoints, visibility, this.timestamp, im1.width, im1.height, trackId);
            }
            await this.delay(100);
        }
     }

    //  protected updateStartFrame(){
    //      this.startFrame = this.frameIdx;
    //      console.log("start frame is: ", this.frameIdx);
    //  }

    //  protected updateEndFrame(){
    //     this.endFrame = this.frameIdx;
    //     console.log("end frame is: ", this.frameIdx);
    // }

     protected cropImage(image: any, roi: any){

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = roi.width;
        cropCanvas.height = roi.height;
        const cropContext:any = cropCanvas.getContext('2d')
        
        cropContext.drawImage(
        image,
        roi.x,
        roi.y,
        roi.width,
        roi.height,
        0,
        0,
        roi.width,
        roi.height
        );
        const dataURL = cropCanvas.toDataURL("image/jpeg");
        return dataURL
        }
 
     // overide leftPanel to add tracking properties
	get leftPanel() {
		return html`
		<div>
			${super.leftPanel}
			<div class="card">
				<p>Forward/backward tracking
				<mwc-icon-button-toggle title="Backward tracking" onIcon="keyboard_double_arrow_left" offIcon="keyboard_double_arrow_left"
								@click=${() => this.runTracking(false)}></mwc-icon-button-toggle>
				<mwc-icon-button-toggle title="Forward tracking" onIcon="keyboard_double_arrow_right" offIcon="keyboard_double_arrow_right"
								@click=${() => this.runTracking(true)}></mwc-icon-button-toggle></p>
			</div>
		</div>
		`;
	}

    //  // overide rightPanel to add start/end tracking properties
    //  // TODO: mettre les flags sur la barre de progression
    //  get rightPanel() {
    //     const disabled = false;
    //     let isStart = this.startFrame == this.frameIdx;
    //     let isEnd = this.endFrame == this.frameIdx;
    //     return html`
    //     <div>
    //         ${super.rightPanel}
    //         <div class="card">
    //             <p>Start/End tracking 
    //             </br>
    //             <mwc-icon-button-toggle title="First tracked frame" id="startKeyshape" ?on=${isStart} ?disabled=${disabled} @click=${() => this.updateStartFrame()} onIcon="flag" offIcon="outlined_flag"></mwc-icon-button-toggle>
    //             <mwc-icon-button-toggle title="Last tracked frame" id="endKeyshape" ?on=${isEnd} ?disabled=${disabled} @click=${() => this.updateEndFrame()} onIcon="flag" offIcon="outlined_flag"></mwc-icon-button-toggle>
    //         </div>
    //     </div>
    //     `;
    // }

 }
 /*
 TODO:
 - change kps icon according to user interaction on them
 - back prop
 */
 
 // export function resizeImage(img: HTMLImageElement, targetWidth: number=400): Promise<HTMLImageElement> {
 // 	return new Promise((resolve) => {
 // 		const canvas = document.createElement("canvas");
 // 		const context = canvas.getContext("2d")!;
 
 // 		const originalWidth = img.width;
 // 		const originalHeight = img.height;
 
 // 		const canvasWidth = targetWidth;
 // 		const canvasHeight = originalHeight * targetWidth / originalWidth;
 
 // 		canvas.width = canvasWidth;
 // 		canvas.height = canvasHeight;
 
 // 		context.drawImage(
 // 			img, 0, 0, targetWidth, canvasHeight
 // 		);
 // 		const newImg = new Image();
 // 		newImg.onload = () => {
 // 			resolve(newImg);
 // 		};
 // 		newImg.src = canvas.toDataURL();
 // 	})
 // }

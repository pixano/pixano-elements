/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/


/**
 * Local video cache.
 */
export class VideoCache {

    private frames: {timestamp: number, data: any}[];
    private _numFrames: number;
    private _sourceId: string;
    private _frameIndex: number;
  
    constructor() {
      this.frames = [];
      this._numFrames = -1;
      this._sourceId = '';
      this._frameIndex = -1;
    }
  
    get sourceId() {
      return this._sourceId;
    }
  
    set sourceId(value) {
      this._sourceId = value;
    }
  
    get frameIndex() {
      return this._frameIndex;
    }
  
    set frameIndex(frameIndex) {
      this._frameIndex = frameIndex;
    }
  
    getNextIdxToLoad(start: number) {
      const idx = this.frames.slice(start + 1).findIndex((f) => f.data == null);
      if (idx !== -1) {
        return start + 1 + idx;
      } else {
        return -1;
      }
    }
  
    /**
     * Set the total number of frames.
     * @param value total number of frames
     */
    setNumFrames(value: number) {
      this._numFrames = value;
    }
  
    /**
     * Get the total number of frames.
     */
    get numFrames() {
      return this._numFrames;
    }
  
    /**
     * Get the number of currently loaded frames in the cache.
     */
    getNumLoadedFrames() {
      return this.frames.filter((f) => f.data != null).length;
    }
  
    getLoadedBetween(a: number, b: number) {
      return this.frames.slice(a, b).filter((f) => f.data != null).length;
    }
  
    getMaxLoaded() {
      const revArray = this.frames.slice().reverse();
      const lastIdx = revArray.findIndex((f) => f.data != null);
      return this.frames.length - lastIdx;
    }
  
    /**
     * Chech if the frames are completly loaded in the cache.
     */
    isFullyLoaded() {
        return ((this.numFrames === this.frames.length) && this.frames.length > 0);
    }
  
    isLoadedByTimestamp(timestamp: number) {
      const index = this.frames.findIndex((f) => f.timestamp === timestamp);
      return index !== -1 && this.frames[index].data != null;
    }
  
    isLoadedByIndex(idx: number) {
      return this.frames[idx] && this.frames[idx].data != null;
    }
  
    /**
     * Get image from the cache by id
     * @param id frame id in the cache
     */
    getFrameByIndex(idx: number) {
      return (this.frames[idx] && this.frames[idx].data != null) ? this.frames[idx].data : null;
    }
  
    /**
     * Get image from the cache by timestamp
     * @param id frame id in the cache
     */
    getFrameByTimestamp(timestamp: number) {
      const index = this.frames.findIndex((f) => f.timestamp === timestamp);
      if (index !== -1) {
          return this.frames[index].data;
      }
      return new Image();
    }
  
    /**
     * Set image from the cache by id
     * @param id frame id in the cache
     */
    setCacheByTimestamp(frame: {timestamp: number, data: any}) {
      const index = this.frames.findIndex((f) => f.timestamp === frame.timestamp);
      this.frames[index] = frame;
    }
  
    /**
     * Get the timestamp for the frame at index.
     * @param id frame index
     */
    toTimestamp(id:number) {
      return this.frames[id] ? this.frames[id].timestamp : -1;
    }
  
    /**
     * Get the timestamp for the frame at index.
     * @param id frame index
     */
    getFrameIndex(timestamp: number) {
      return this.frames.findIndex((f) => f.timestamp === timestamp);
    }
  
    /**
     * Add new frame to the cache.
     * @param f frame to add
     */
    add(f: {timestamp: number, data: any}) {
      this.frames.push(f);
    }
  
    /**
     * Clear cache.
     */
    clear() {
      this.frames = [];
      this._numFrames = 0;
    }
  
    clearData() {
      this.frames.forEach((f) => f.data = null);
    }
  }
  
  ////// Data loaders
  
  function readImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.crossOrigin = "anonymous";
      image.src = dataUrl;
    });
  }
  
  function readPcl(path: string): Promise<Float32Array> {
    return new Promise((resolve) => {
      fetch(path).then((response) => {
        return response.ok ? response.arrayBuffer() : Promise.reject(response.status);
      }).then((points) => {
        resolve(new Float32Array(points));
      }); 
    });
  }

  function readBase64Array(path: string): Promise<Float32Array> {
    const blob = atob( path );
    const aryBuf = new ArrayBuffer( blob.length );
    let dv = new DataView( aryBuf );
    for ( let i=0; i < blob.length; i++ ) dv.setUint8( i, blob.charCodeAt(i) );

    return Promise.resolve(new Float32Array(aryBuf));
  }
  
  function read(path: string | string[]): Promise<any> {
    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    if (typeof path === 'string') {
      if (path.endsWith('bin')) {
        return readPcl(path);
      } else if (path.match(/\.(jpeg|jpg|gif|png)$|data:image|blob:/) != null) {
        // source ends with .[jpeg,jpg,gif,png] or is base64
        return readImage(path);
      } else if (base64regex.test(path)) {
        // source path is base64 encoded of float32 array
        return readBase64Array(path);
      }
    } else if (Array.isArray(path)) {
      return Promise.all(path.map(read));
    }
    return Promise.resolve();
  }
  
  /**
  * Handle loading of view(s)
  */
  export class Loader extends EventTarget {
  
    load(path: string): Promise<any> {
      return read(path);
    }
  }
  
  /**
  * Handle loading of a sequence
  * of files.
  */
  export class SequenceLoader extends EventTarget {
  
    private bufferSize: number;
    // private loadedFrameNumber: number;
    private isLoading: boolean;
    private loadStop: boolean;
    private cache: any;
    public frames: {timestamp: number, path: string}[];
    private _eventAbortCompleted: Event;
  
    constructor() {
      super();
      this.bufferSize = 2500; // number of frames max
      // this.loadedFrameNumber = 0;
      this.isLoading = false;
      this.loadStop = false;
      this.cache = null;
      this.frames = [];
      this._eventAbortCompleted = new Event('cancel_completed');
    }
  
    /**
     * Load metadata
     * @param { <timestamp: number, path: [string]>[] } frames 
     */
    init(frames: {timestamp: number, path: string}[]): Promise<number> {
      // fill cache with empty timestamped images to make sure that
      // the timestamps are in order
      this.cache = new VideoCache;
      for (const source of frames) {
        this.cache.add({ timestamp: source.timestamp, data: null });
      }
      this.cache.setNumFrames(frames.length);
      this.frames = frames;
      this.frames.sort((a:{timestamp: number, path: string}, b:{timestamp: number, path: string}) => {
        return a.timestamp - b.timestamp;
      });
      return this.abortLoading().then(() => {
        return Promise.resolve(frames.length);
      })
    }
  
    /**
     * Peek frame at index.
     * @param {number} idx 
     */
    peekFrame(idx: number) {
      const requestedFrame = this.cache.getFrameByIndex(idx);
      if (requestedFrame == null) {
        return this.abortLoading().then(() => {
          this.cache.clearData();
          return this.load(idx); 
        });
        // if frame not loaded, abort current load and start from there
        // this.videoLoader.setFrameIndex(frameIndex);
      } else {
        return Promise.resolve(requestedFrame);
      }
    }
  
    /**
     * Cancel image requests by emptying their src
     */
    abortLoading() {
      if (!this.isLoading) {
        return Promise.resolve();
      } else {
        this.loadStop = true;
        const self = this;
        return new Promise((resolve) => {
          self.addEventListener('cancel_completed', () => {
            resolve();
          })
        }); 
      }
    }
  
    /**
     * Launch load of images.
     * Resolve first frame as soon as loaded
     * @param idx first frame index to load
     */
    load(idx: number, startBufferIdx?: number): any {
      startBufferIdx = startBufferIdx || idx;
      const self = this;
      if (!this.frames[idx]) {
        return Promise.resolve();
      }
      const timestamp = this.frames[idx] ? this.frames[idx].timestamp : 0;
      const path = this.frames[idx].path;
      const next = idx + 1;
      this.isLoading = true;
      const maxi = Math.min(this.frames.length - 1, startBufferIdx + this.bufferSize - 1)
      if (this.loadStop) {
        this.dispatchEvent(this._eventAbortCompleted)
        this.loadStop = false;
        this.isLoading = false;
      } else {
          return new Promise((resolve) => {
            return read(path).then((data: any) => {
              self.cache.setCacheByTimestamp({ timestamp, data });
              this.dispatchEvent(new CustomEvent('loaded_frame_index', {detail: idx}));
              if (idx === startBufferIdx) {
                resolve(data);
              }
              if (next <= maxi){
                self.load(next, startBufferIdx);
              } else {
                console.info('Finished loading', path);
                this.isLoading = false;
              }                
            });
          });
      }
    }
  }

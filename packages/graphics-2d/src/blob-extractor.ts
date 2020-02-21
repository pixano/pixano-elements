/**
 * Implementations of contour retrieval from mask.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

export class RegBlob {
  public contours: Contour[] = new Array();
  public readonly cls: number;
  public nbPixels: number = 0;

  constructor(cls: number){
    this.cls = cls
  }
}

export interface Contour {
  points: number[];
  type: string;
}


export class BlobExtractor {

  private width: number;
  private height: number;
  private aug_w: number;
  private aug_h: number;
  private max: number;
  private pos: number[];

  private withExtrema = false;
  private extrema: number[]

  private augData: Array<number>;
  public blobs: Map<number, RegBlob> = new Map();
  public label: Array<number>;
  private augLabel: Array<number>;

  static BACKGROUND = null;
  static UNSET = -1;
  static MARKED = -2;
  static CONNEXITY = 4;

  public targetId: number;

  constructor(width: number, height: number, data?: number[], augData?: number[], vertexExtrema?: number[]) {
    this.width = width;
    this.height = height;
    this.aug_w = width + 2;
    this.aug_h = height + 2
    data = data || [];
    let [xMin, yMin, xMax, yMax] = [0,0,0,0]
    if (vertexExtrema){
      [xMin, yMin, xMax, yMax] = vertexExtrema
      xMax = xMax - 1;
      yMax = yMax - 1
      this.extrema = [xMin, yMin, xMax, yMax]
      this.withExtrema = true;
    } else {
      this.extrema = [0, 1, this.aug_w - 1, this.aug_h - 2];
    }

    this.max = this.aug_h * this.aug_w;
    this.pos = [1, this.aug_w + 1, this.aug_w, this.aug_w - 1, -1, -this.aug_w - 1, -this.aug_w, -this.aug_w + 1];

    this.label = new Array(this.width * this.height);

    //let tic = performance.now()
    if (augData)
      this.augData = augData;
    else
      this.augData = this.addBorders(data);

    //let toc = performance.now()
    //console.log("Add borders (ms)", toc - tic)

    if (vertexExtrema)
      this.extrema = [xMin, yMin + 1, xMax + 2, yMax + 1];

    this.augLabel = new Array(this.max);
    this.targetId = 0;
  }
  
  /**
   * 
   * @param pos Pixel position in augmented image (can be zero padded image or point image)
   * @param aug_w Width of augmented image
   * @returns Pixel position in original image
   */
    protected origPos(pos: number, aug_w: number) {
      var y = pos / aug_w | 0
      var x = pos % aug_w

      // x - 1 : original x in original data
      // y - 1 : original y in original data 
      var o_pos = (y - 1) * (aug_w - 2) + x - 1  // original position in original data
      return o_pos
    }
  
  /**
   * Add borders with zeros around an image
   * @param data The image, stored in a 1D list
   * @returns The new image (1D list) with zeros borders
   */
    protected addBorders(data: number[]) {
      const aug_data = new Array((this.aug_w)*(this.aug_h));
      const [xMin, yMin, xMax, yMax] = this.extrema;

      if (this.withExtrema){
        for (var x = xMin; x <= xMax + 2 ; x++){
          for (var y = yMin; y <= yMax + 2; y++) {
            const offset = y * this.aug_w + x
            if (x == xMin || y == yMin || x == xMax + 2 || y == yMax + 2) {
              aug_data[offset] = BlobExtractor.BACKGROUND;
            }
            else {
              aug_data[offset] = data[offset - (this.width + 2*y + 1)];
            }
          }
        }
      }
      else {
        for (var x = 0; x < this.aug_w; x++){
          for (var y = 0; y < this.aug_h; y++) {
            var offset = y * this.aug_w + x
            if (x == 0 || y == 0 || x == this.width + 1 || y == this.height + 1) {
              aug_data[offset] = BlobExtractor.BACKGROUND;
            }
            else {
              aug_data[offset] = data[offset - (this.width + 2*y + 1)];
            }
          }
        }
      }         
      return aug_data;
    }

    protected strPtToPos(pix_pos: number, str_pos: string) {
      const pix_y = pix_pos / this.aug_w | 0;
      const pt_pos = (() => {
        switch(str_pos) {
          case 'tl':
            return pix_pos + pix_y;
          case 'tr':
            return pix_pos + pix_y + 1;
          case 'bl':
            return pix_pos + (this.aug_w + 1) + pix_y;
          default:
          case 'br':
            return pix_pos + (this.aug_w + 1) + pix_y + 1;
        }
      })();
      return this.origPos(pt_pos, this.aug_w + 1)
    }
  
    addPoints(contour: Contour, old_pos: number, old_q: number, new_q: number){
      const new_added = new Array();
      switch(old_q){
        case 0:
          switch(new_q)
          {
            case 0:
              new_added.push(this.strPtToPos(old_pos, "tr"));
              break;
            case 2:
              new_added.push(this.strPtToPos(old_pos, "tr"));
              new_added.push(this.strPtToPos(old_pos, "br"));
              break;
            case 4:
              new_added.push(this.strPtToPos(old_pos, "tr"));
              new_added.push(this.strPtToPos(old_pos, "br"));
              new_added.push(this.strPtToPos(old_pos, "bl"));
              break;
            case 6:
              break;
          }
          break;
        
        case 2:
          switch(new_q)
          {
            case 0:
              break;
            case 2:
              new_added.push(this.strPtToPos(old_pos, "br"));
              break;
            case 4:
              new_added.push(this.strPtToPos(old_pos, "br"));
              new_added.push(this.strPtToPos(old_pos, "bl"));
              break;
            case 6:
              new_added.push(this.strPtToPos(old_pos, "br"));
              new_added.push(this.strPtToPos(old_pos, "bl"));
              new_added.push(this.strPtToPos(old_pos, "tl"));
              break;
          }
          break;

        case 4:
          switch(new_q)
          {
            case 0:
              new_added.push(this.strPtToPos(old_pos, "bl"));
              new_added.push(this.strPtToPos(old_pos, "tl"));
              new_added.push(this.strPtToPos(old_pos, "tr"));
              break;
            case 2:
              break;
            case 4:
              new_added.push(this.strPtToPos(old_pos, "bl"));
              break;
            case 6:
              new_added.push(this.strPtToPos(old_pos, "bl"));
              new_added.push(this.strPtToPos(old_pos, "tl"));
              break;
          }
          break;

        case 6:
          switch(new_q)
          {
            case 0:
              new_added.push(this.strPtToPos(old_pos, "tl"));
              new_added.push(this.strPtToPos(old_pos, "tr"));
              break;
            case 2:
              new_added.push(this.strPtToPos(old_pos, "tl"));
              new_added.push(this.strPtToPos(old_pos, "tr"));
              new_added.push(this.strPtToPos(old_pos, "br"));
              break;
            case 4:
              break;
            case 6:
              new_added.push(this.strPtToPos(old_pos, "tl"));
              break;
          }
          break;
      }
      contour.points.push(...new_added)
      return contour;
    }
  
    
    /**
     * Returns next pixel of contour
     * @param S Current contour pixel
     * @param p Current index of connexity array
     * @returns A dictionary with next pixel of contour and its associated connexity index
     */
    protected tracer(S: number, p: number) {
      let d = 0;
      while (d < 8) {
        const q = (p + d) % 8;
        const T = S + this.pos[q];

        // Make sure we are inside image
        if (T < 0 || T >= this.max)
          continue;

        if (this.augData[T] == this.targetId)
          return {T:T, q:q};

        this.augLabel[T] = BlobExtractor.MARKED;
        if (BlobExtractor.CONNEXITY == 8)
          d++
        else
          d = d + 2
      }
      // No move
      return {T:S, q:-1};
    }
    
    /**
     * Computes a contour
     * @param S Offset of starting point
     * @param C Label count
     * @param external Boolean Is this internal or external tracing
     * @returns The computed contour and the number of pixels of the contour
     */
    protected contourTracing(S: number, C: number, external: boolean): [Contour, number] {
      let p: number;
      if (BlobExtractor.CONNEXITY == 8)
          p = external ? 7 : 3;
      else
          p = external ? 0 : 2;
      
      let contour = {type:external ? "external": "internal", points: new Array()};
      //let nbPixels = 0
      
      const addedPixels = new Set<number>()
  
      // Find out our default next pos (from S)
      let tmp = this.tracer(S, p); 
      const T2 = tmp.T;
      let q  = tmp.q;
  
      this.augLabel[S] = C;
      //nbPixels += 1;
      addedPixels.add(S)

      // Single pixel check
      if (T2 == S){
        if (BlobExtractor.CONNEXITY == 4){
          contour.points.push(this.strPtToPos(S, "tl"))
          contour.points.push(this.strPtToPos(S, "tr"))
          contour.points.push(this.strPtToPos(S, "br"))
          contour.points.push(this.strPtToPos(S, "bl"))
        }
        return [contour, addedPixels.size];
      }
  
      let Tnext   = T2;
      let T       = T2;
  
      while ( T != S || Tnext != T2 ) {
  
        this.augLabel[Tnext] = C;
        if (!addedPixels.has(Tnext))
          addedPixels.add(Tnext)
        //nbPixels += 1;
  
        T = Tnext;
        if (BlobExtractor.CONNEXITY == 8)
            p = (q + 5) % 8;
        else
            p = (q + 6) % 8;

        tmp = this.tracer(T, p);

        if (BlobExtractor.CONNEXITY == 4)
          contour = this.addPoints(contour, T, q, tmp.q);
  
        Tnext = tmp.T;
        q     = tmp.q;
      }
      //nbPixels -= 1;
      return [contour, addedPixels.size];
    };
    
    /**
     * Performs the blob extraction
     * @param target_id the target id of the blobs to find
     * @param needLabel whether we need the computed mask
     */
    public extract(target_id: number, needLabel: boolean = false) {
      console.log("Starting blob extraction for target id", target_id)
      this.targetId = target_id;
  
      //let tic = performance.now()

      for (let i = this.extrema[0]; i <= this.extrema[2]; i++){
        for (let j = this.extrema[1]; j <= this.extrema[3]; j++){
          let posi = i + j * this.aug_w;
          this.augLabel[posi] = BlobExtractor.UNSET;
        }
      }
      //let toc = performance.now()
      //console.log("set init aug label", toc - tic)

      //let counter = 0;
  
      let c = 0; 
      //var y = 1; // We start at 1 to avoid looking above the image
      var y = this.extrema[1];
      do {
        //var x = 0;
        var x = this.extrema[0];
        do {
          //counter++;
          var offset = y * this.aug_w + x;

          // We skip white pixels or previous labeled pixels
          if (this.augData[offset] != this.targetId)
            continue;

          // Step 1 - P not labelled, and above pixel is white
          if (this.augData[offset - this.aug_w] != this.targetId && this.augLabel[offset] == BlobExtractor.UNSET) {

            // P must be external contour
            //console.log("Found external contour")
            this.blobs.set(c, new RegBlob(c));
            let [contour, nbPixels] = this.contourTracing(offset, c, true);
            this.blobs.get(c)!.contours.push(contour);
            this.blobs.get(c)!.nbPixels += nbPixels;
            c++;
          }

          // Step 2 - Below pixel is white, and unmarked
          if (this.augData[offset + this.aug_w] != this.targetId && this.augLabel[offset + this.aug_w] == BlobExtractor.UNSET) {

            // Use previous pixel label, unless this is already labelled
            let n = this.augLabel[offset - 1];
            if (this.augLabel[offset] != BlobExtractor.UNSET)
              n = this.augLabel[offset];

            // P must be a internal contour
            //console.log("Found internal contour")
            const [contour, nbPixels] = this.contourTracing(offset, n, false);
            const b = this.blobs.get(n);
            if (b) {
              b.contours.push(contour);
              b.nbPixels += nbPixels;
            }
            
          }

          // Step 3 - Not dealt within previous two steps
          if (this.augLabel[offset] == BlobExtractor.UNSET) {
            let n = this.augLabel[offset - 1] || 0;
            // Assign P the value of N
            this.augLabel[offset] = n;
            const b = this.blobs.get(n);
            if (b) { b.nbPixels += 1; }
            
          }

        } while (x++ <= this.extrema[2]);  //while (x++ < this.aug_w);
      } while (y++ <= this.extrema[3]);//(y++ < (this.aug_h - 1)); // We end one before the end to to avoid looking below the image
  
      //console.log("counter", counter)
      //console.log("number of blobs =", c);

      //tic = performance.now()
      //console.log("while loops (ms)", tic - toc)

      if (needLabel) {
        for (let x = 0; x < this.width; x++){
          for (let y = 0; y < this.height; y++) {
            const offset = x + y * this.width
            this.label[offset] = this.augLabel[offset + this.width + 2*y + 3]
          }
        }
      }     
      //toc = performance.now()
      //console.log("fill label (ms)", toc -tic)
      //console.log("label", this.label)
    };
  }
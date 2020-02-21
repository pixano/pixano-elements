# @pixano/ai

Pixano toolbox of AI algorithms for smart annotation in the browser.

## Import 

```javascript
import { PixelToBoundingBox } from "@pixano/ai/lib/pixel-to-bounding-box";
```

## Example: Bounding box detection guided by a user click

Example usage:
```javascript
const image = new Image();
image.onload = () => {
    const detection = await this.boundingBoxCreator.predict(
    {x: 200, y: 500},
    image
);
}
image.src = '/path/to/your/image.jpg';
```

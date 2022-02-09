/**
 * Pixano 2d-graphics elements.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

 import { Classification } from './pxn-classification';
import { Polygon } from './pxn-polygon';
import { Rectangle } from './pxn-rectangle';
import { Segmentation } from './pxn-segmentation';
import { Graph } from './pxn-graph';
import { SmartRectangle } from './pxn-smart-rectangle';
import { Tracking } from './pxn-tracking';
import { SmartTracking } from './pxn-smart-tracking';
import { SmartSegmentation } from './pxn-smart-segmentation';
import { TrackingGraph } from './pxn-tracking-graph';
import { SmartTrackingGraph } from './pxn-smart-tracking-graph';

export { Graph, Polygon, Rectangle, Segmentation, SmartRectangle, Tracking, SmartTracking, SmartSegmentation, TrackingGraph, SmartTrackingGraph };

declare global {
	interface HTMLElementTagNameMap {
		'pxn-classification': Classification;
		'pxn-polygon': Polygon;
		'pxn-rectangle': Rectangle;
		'pxn-segmentation': Segmentation;
		'pxn-smart-segmentation': SmartSegmentation;
		'pxn-graph': Graph;
		'pxn-smart-rectangle': SmartRectangle;
		'pxn-tracking': Tracking;
		'pxn-smart-tracking': SmartTracking;
		'pxn-tracking-graph': TrackingGraph;
		'pxn-smart-tracking-graph': SmartTrackingGraph;
	}
}

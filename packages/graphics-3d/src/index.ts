/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Cuboid } from './types';
import { CuboidEditor } from './pxn-cuboid';

export { Cuboid, CuboidEditor };

declare global {
	interface HTMLElementTagNameMap {
		'pxn-cuboid-editor': CuboidEditor;
	}
}
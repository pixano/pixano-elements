/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

/** Minimal interface exposed by cuboid objects. */
export interface Cuboid {
  id: string;
  // x, y, z
  position: number[];
  // length, width, height
  size: number[];
  // rotation around z axis (trigometric)
  heading: number;
  // color
  color?: number;
}

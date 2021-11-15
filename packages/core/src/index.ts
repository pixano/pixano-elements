/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Observer, observable, ObservableMap, ObservableSet, observe, unobserve } from './observer';
import { PlaybackControl } from './playback-control';
import { Destructible } from './types';
import { BasicEventTarget } from './event-emitter';
import * as utils from './utils';

export {
	Destructible,
	Observer,
	observable,
	ObservableMap,
	ObservableSet,
	observe,
	unobserve,
	BasicEventTarget,
	utils
};

declare global {
	interface HTMLElementTagNameMap {
		'playback-control': PlaybackControl;
	}
}

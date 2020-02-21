/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

type EventListener<T extends Event> = (event: T) => void;


/** Basic implementation of EventTarget */
export class BasicEventTarget implements EventTarget {
  private listeners = new Map<string, EventListener<any>[]>();

  addEventListener<T extends Event>(type: string, listener: EventListener<T>) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.push(listener);
    } else {
      this.listeners.set(type, [listener]);
    }
  }

  removeEventListener<T extends Event>(type: string, listener: EventListener<T>) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const i = listeners.indexOf(listener);
      if (i >= 0) {
        listeners.splice(i, 1);
      }
    }
  }

  dispatchEvent(event: Event) {
    const listeners = this.listeners.get(event.type);

    if (listeners) {
      for (const listener of listeners) {
        listener.call(this, event);
      }
      return !event.defaultPrevented;

    } else {
      return true;
    }
  }
}
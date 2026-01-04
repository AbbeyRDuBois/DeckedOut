type Listener<T> = (payload: T) => void;

//This is the communicator between the Models and Controllers/Views
export class EventEmitter<Events extends Record<string, any>> {
  private listeners: Map<string, Set<Function>> = new Map();

  //Adds listener
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    const key = String(event);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener as Function);
  }

  //Removes Listener
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    const key = String(event);
    this.listeners.get(key)?.delete(listener as Function);
  }

  // Calls Listeners
  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    const key = String(event);
    const set = this.listeners.get(key);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        (fn as Listener<Events[K]>)(payload);
      } catch (e) {
        // swallow errors from listeners to keep emitter resilient
        console.error(`Event listener for ${key} failed:`, e);
      }
    }
  }
}

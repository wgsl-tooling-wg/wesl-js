/**
 * WeakMap cache for GPUDevice-based caching
 *
 * GPUDevices are weakly held to avoid memory leaks.
 */
export class DeviceCache<T> {
  private cache = new WeakMap<GPUDevice, Map<string, T>>();

  get(device: GPUDevice, key: string): T | undefined {
    return this.cache.get(device)?.get(key);
  }

  set(device: GPUDevice, key: string, value: T): void {
    let deviceCache = this.cache.get(device);
    if (!deviceCache) {
      deviceCache = new Map();
      this.cache.set(device, deviceCache);
    }
    deviceCache.set(key, value);
  }
}

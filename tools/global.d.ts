/** @category GPU */
interface GPUCompilationMessage {
  readonly offset: number;
  readonly length: number;
}

// Stronger typing for event listeners.

/** @internal */

interface __GPUDeviceEventMap {
  uncapturederror: GPUUncapturedErrorEvent;
}

// Extensions to the generated definition below.

interface GPUDevice {
  addEventListener<K extends keyof __GPUDeviceEventMap>(
    type: K,

    listener: (
      this: GPUDevice,

      ev: __GPUDeviceEventMap[K],
    ) => any,

    options?: boolean | AddEventListenerOptions,
  ): void;

  addEventListener(
    type: string,

    listener: EventListenerOrEventListenerObject,

    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof __GPUDeviceEventMap>(
    type: K,

    listener: (
      this: GPUDevice,

      ev: __GPUDeviceEventMap[K],
    ) => any,

    options?: boolean | EventListenerOptions,
  ): void;

  removeEventListener(
    type: string,

    listener: EventListenerOrEventListenerObject,

    options?: boolean | EventListenerOptions,
  ): void;
}

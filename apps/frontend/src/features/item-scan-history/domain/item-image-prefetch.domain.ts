import { getFullscreenImageUrl } from "./item-image-resolution.domain";

export type ItemImagePrefetchStatus = "idle" | "loading" | "loaded" | "failed";

interface PrefetchTask {
  url: string;
  resolve: () => void;
  reject: () => void;
}

const MAX_CONCURRENT_PREFETCHES = 2;

const statusByUrl = new Map<string, ItemImagePrefetchStatus>();
const promiseByUrl = new Map<string, Promise<void>>();
const queue: PrefetchTask[] = [];

let activePrefetchCount = 0;

function shouldSkipPrefetch(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    }
  ).connection;

  return connection?.saveData === true;
}

function runNextPrefetch(): void {
  if (activePrefetchCount >= MAX_CONCURRENT_PREFETCHES) {
    return;
  }

  const task = queue.shift();
  if (!task) {
    return;
  }

  activePrefetchCount += 1;
  statusByUrl.set(task.url, "loading");

  const image = new Image();
  image.decoding = "async";

  image.onload = () => {
    activePrefetchCount -= 1;
    statusByUrl.set(task.url, "loaded");
    task.resolve();
    runNextPrefetch();
  };

  image.onerror = () => {
    activePrefetchCount -= 1;
    statusByUrl.set(task.url, "failed");
    promiseByUrl.delete(task.url);
    task.reject();
    runNextPrefetch();
  };

  image.src = task.url;
}

function enqueuePrefetch(url: string, priority: boolean): Promise<void> {
  const existingStatus = statusByUrl.get(url);
  if (existingStatus === "loaded") {
    return Promise.resolve();
  }

  const existingPromise = promiseByUrl.get(url);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const task = { url, resolve, reject };
    if (priority) {
      queue.unshift(task);
    } else {
      queue.push(task);
    }

    runNextPrefetch();
  });

  statusByUrl.set(url, "loading");
  promiseByUrl.set(url, promise);

  return promise;
}

function scheduleIdle(work: () => void): void {
  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (requestIdleCallback) {
    requestIdleCallback(work, { timeout: 1200 });
    return;
  }

  window.setTimeout(work, 180);
}

export function getItemImagePrefetchStatus(imageUrl: string): ItemImagePrefetchStatus {
  const fullscreenUrl = getFullscreenImageUrl(imageUrl);
  return statusByUrl.get(fullscreenUrl) ?? "idle";
}

export function prefetchFullscreenImage(
  imageUrl: string,
  options: { priority?: boolean; idle?: boolean } = {},
): Promise<void> {
  if (!imageUrl || shouldSkipPrefetch()) {
    return Promise.resolve();
  }

  const fullscreenUrl = getFullscreenImageUrl(imageUrl);
  const startPrefetch = () =>
    enqueuePrefetch(fullscreenUrl, options.priority === true).catch(() => {
      // Failed prefetches should never block the viewer; the real <img> can retry.
    });

  if (options.idle && !options.priority) {
    return new Promise<void>((resolve) => {
      scheduleIdle(() => {
        void startPrefetch().finally(resolve);
      });
    });
  }

  return startPrefetch();
}

export function prefetchFullscreenImages(
  imageUrls: string[],
  options: { priority?: boolean; idle?: boolean } = {},
): void {
  const uniqueUrls = [...new Set(imageUrls.filter(Boolean))];
  for (const imageUrl of uniqueUrls) {
    void prefetchFullscreenImage(imageUrl, options);
  }
}

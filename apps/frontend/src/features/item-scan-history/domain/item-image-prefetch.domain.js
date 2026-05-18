import { getFullscreenImageUrl } from "./item-image-resolution.domain";
const MAX_CONCURRENT_PREFETCHES = 2;
const statusByUrl = new Map();
const promiseByUrl = new Map();
const queue = [];
let activePrefetchCount = 0;
function shouldSkipPrefetch() {
    if (typeof navigator === "undefined") {
        return true;
    }
    const connection = navigator.connection;
    return connection?.saveData === true;
}
function runNextPrefetch() {
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
function enqueuePrefetch(url, priority) {
    const existingStatus = statusByUrl.get(url);
    if (existingStatus === "loaded") {
        return Promise.resolve();
    }
    const existingPromise = promiseByUrl.get(url);
    if (existingPromise) {
        return existingPromise;
    }
    const promise = new Promise((resolve, reject) => {
        const task = { url, resolve, reject };
        if (priority) {
            queue.unshift(task);
        }
        else {
            queue.push(task);
        }
        runNextPrefetch();
    });
    statusByUrl.set(url, "loading");
    promiseByUrl.set(url, promise);
    return promise;
}
function scheduleIdle(work) {
    const requestIdleCallback = window.requestIdleCallback;
    if (requestIdleCallback) {
        requestIdleCallback(work, { timeout: 1200 });
        return;
    }
    window.setTimeout(work, 180);
}
export function getItemImagePrefetchStatus(imageUrl) {
    const fullscreenUrl = getFullscreenImageUrl(imageUrl);
    return statusByUrl.get(fullscreenUrl) ?? "idle";
}
export function prefetchFullscreenImage(imageUrl, options = {}) {
    if (!imageUrl || shouldSkipPrefetch()) {
        return Promise.resolve();
    }
    const fullscreenUrl = getFullscreenImageUrl(imageUrl);
    const startPrefetch = () => enqueuePrefetch(fullscreenUrl, options.priority === true).catch(() => {
        // Failed prefetches should never block the viewer; the real <img> can retry.
    });
    if (options.idle && !options.priority) {
        return new Promise((resolve) => {
            scheduleIdle(() => {
                void startPrefetch().finally(resolve);
            });
        });
    }
    return startPrefetch();
}
export function prefetchFullscreenImages(imageUrls, options = {}) {
    const uniqueUrls = [...new Set(imageUrls.filter(Boolean))];
    for (const imageUrl of uniqueUrls) {
        void prefetchFullscreenImage(imageUrl, options);
    }
}

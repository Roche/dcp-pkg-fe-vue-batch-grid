import type { DynamicValueBatchLoader, DynamicValueLoadContext } from '@/types/BatchGrid';

const MOUNT_CONFIRMATION_DELAY_MS = 500;
const BATCH_COLLECTION_WINDOW_MS = 1000;

export type DynamicValueCacheEntry =
    | {
        status: 'loading';
        promise: Promise<unknown>;
    }
    | {
        status: 'loaded';
        value: unknown;
    };

export type DynamicValueCellCache = {
    get: (cacheKey: string) => DynamicValueCacheEntry | undefined;
    load: (cacheKey: string, loader: () => Promise<unknown>) => Promise<unknown>;
};

export const createDynamicValueCellCache = (): DynamicValueCellCache => {
    const entries = new Map<string, DynamicValueCacheEntry>();

    return {
        get: (cacheKey: string) => entries.get(cacheKey),
        load: (cacheKey: string, loader: () => Promise<unknown>) => {
            const existingEntry = entries.get(cacheKey);

            if (existingEntry?.status === 'loaded') {
                return Promise.resolve(existingEntry.value);
            }

            if (existingEntry?.status === 'loading') {
                return existingEntry.promise;
            }

            const promise = loader()
                .then((value) => {
                    entries.set(cacheKey, {
                        status: 'loaded',
                        value: value ?? null
                    });

                    return value ?? null;
                })
                .catch((error) => {
                    entries.delete(cacheKey);
                    throw error;
                });

            entries.set(cacheKey, {
                status: 'loading',
                promise
            });

            return promise;
        }
    };
};

/**
 * Creates a batch loader that:
 * 1. Waits 500ms to confirm cells are still mounted (not just transient)
 * 2. Collects all confirmed cells for 1 second
 * 3. Fires a single batch load request with all collected contexts
 *
 * This ensures efficient batching while avoiding unnecessary loads from cells
 * that are mounted temporarily (e.g., during rapid scrolling).
 */
const createBatchLoader = (
    cache: DynamicValueCellCache,
    batchLoader: DynamicValueBatchLoader
) => {
    const canceledLoadError = new Error('Dynamic load canceled because cell is no longer mounted.');

    type PendingLoad = {
        cacheKey: string;
        context: DynamicValueLoadContext;
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
        isMounted: () => boolean;
    };

    const pendingConfirmation = new Map<string, { timeoutId: number; context: DynamicValueLoadContext; resolve: (value: unknown) => void; reject: (error: unknown) => void; isMounted: () => boolean }>();
    const batchQueue = new Map<string, PendingLoad>();
    let batchTimerId: number | undefined;

    const flushBatch = async () => {
        if (batchQueue.size === 0) {
            return;
        }

        batchTimerId = undefined;
        const loadsArray = Array.from(batchQueue.values());
        batchQueue.clear();

        const activeLoads = loadsArray.filter((load) => load.isMounted());
        const canceledLoads = loadsArray.filter((load) => !load.isMounted());

        for (const load of canceledLoads) {
            load.reject(canceledLoadError);
        }

        if (activeLoads.length === 0) {
            return;
        }

        try {
            const contexts = activeLoads.map((load) => load.context);
            const results = await batchLoader(contexts);

            for (const load of activeLoads) {
                const value = results[load.cacheKey];
                load.resolve(value ?? null);
            }
        } catch (error) {
            for (const load of activeLoads) {
                load.reject(error);
            }
        }
    };

    const confirmAndQueueLoad = (cacheKey: string, context: DynamicValueLoadContext, resolve: (value: unknown) => void, reject: (error: unknown) => void, isMounted: () => boolean) => {
        // Clear any existing confirmation timer for this key
        const existingConfirmation = pendingConfirmation.get(cacheKey);
        if (existingConfirmation) {
            window.clearTimeout(existingConfirmation.timeoutId);
        }

        // Wait 500ms to confirm the cell is still mounted
        const timeoutId = window.setTimeout(() => {
            pendingConfirmation.delete(cacheKey);

            // Check if still mounted before adding to batch
            if (!isMounted()) {
                reject(canceledLoadError);
                return;
            }

            // Add to batch queue
            batchQueue.set(cacheKey, {
                cacheKey,
                context,
                resolve,
                reject,
                isMounted
            });

            // Schedule batch flush if not already scheduled
            if (batchTimerId === undefined) {
                batchTimerId = window.setTimeout(flushBatch, BATCH_COLLECTION_WINDOW_MS);
            }
        }, MOUNT_CONFIRMATION_DELAY_MS);

        pendingConfirmation.set(cacheKey, {
            timeoutId,
            context,
            resolve,
            reject,
            isMounted
        });
    };

    return {
        load: (
            cacheKey: string,
            context: DynamicValueLoadContext,
            isMounted: () => boolean
        ): Promise<unknown> => {
            const existingEntry = cache.get(cacheKey);

            if (existingEntry?.status === 'loaded') {
                return Promise.resolve(existingEntry.value);
            }

            if (existingEntry?.status === 'loading') {
                return existingEntry.promise;
            }

            // Create promise for this load
            let resolve: (value: unknown) => void = () => {};
            let reject: (error: unknown) => void = () => {};
            const batchPromise = new Promise<unknown>((res, rej) => {
                resolve = res;
                reject = rej;
            });

            // Queue for confirmation
            confirmAndQueueLoad(cacheKey, context, resolve, reject, isMounted);

            // Mark as loading in cache
            return cache.load(cacheKey, () => batchPromise);
        }
    };
};

const sharedBatchLoaders = new WeakMap<
    DynamicValueCellCache,
    WeakMap<DynamicValueBatchLoader, ReturnType<typeof createBatchLoader>>
>();

export const getSharedBatchLoader = (
    cache: DynamicValueCellCache,
    batchLoader: DynamicValueBatchLoader
) => {
    let cacheLoaders = sharedBatchLoaders.get(cache);

    if (!cacheLoaders) {
        cacheLoaders = new WeakMap<DynamicValueBatchLoader, ReturnType<typeof createBatchLoader>>();
        sharedBatchLoaders.set(cache, cacheLoaders);
    }

    let sharedLoader = cacheLoaders.get(batchLoader);

    if (!sharedLoader) {
        sharedLoader = createBatchLoader(cache, batchLoader);
        cacheLoaders.set(batchLoader, sharedLoader);
    }

    return sharedLoader;
};
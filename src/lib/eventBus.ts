import { EventCallback, UnsubscribeFunction } from '@/types';

const subscriptions = new Map<string, Set<EventCallback>>();
const latestValues = new Map<string, unknown>();

export function subscribe<T = unknown>(
    id: string, 
    callback: EventCallback<T>
): UnsubscribeFunction {
    if (!subscriptions.has(id)) {
        subscriptions.set(id, new Set());
    }
    subscriptions.get(id)!.add(callback as EventCallback);

    // Fire immediately if a value exists
    if (latestValues.has(id)) {
        callback(latestValues.get(id) as T);
    }

    return () => {
        subscriptions.get(id)?.delete(callback as EventCallback);
    };
}

export function publish<T = unknown>(id: string, value: T): void {
    latestValues.set(id, value);
    if (subscriptions.has(id)) {
        subscriptions.get(id)!.forEach(cb => cb(value));
    }
}

export function getLatest<T = unknown>(id: string): T | undefined {
    return latestValues.get(id) as T | undefined;
}

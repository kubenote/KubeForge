const subscriptions = new Map<string, Set<(val: any) => void>>();
const latestValues = new Map<string, any>();

export function subscribe(id: string, callback: (val: any) => void) {
    if (!subscriptions.has(id)) subscriptions.set(id, new Set());
    subscriptions.get(id)!.add(callback);

    // Fire immediately if a value exists
    if (latestValues.has(id)) {
        callback(latestValues.get(id));
    }

    return () => {
        subscriptions.get(id)?.delete(callback);
    };
}

export function publish(id: string, value: any) {
    latestValues.set(id, value);
    if (subscriptions.has(id)) {
        subscriptions.get(id)!.forEach(cb => cb(value));
    }
}

export function getLatest(id: string) {
    return latestValues.get(id);
}

export function any<T>(array: T[], fn: (arg0: T) => boolean): boolean {
    for (const elem of array) {
        if (fn(elem)) return true;
    }
    return false;
}

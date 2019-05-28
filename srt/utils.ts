export function any<T>(array: T[], fn: (arg0: T) => boolean): boolean {
    for (const elem of array) {
        if (fn(elem)) return true;
    }
    return false;
}

export function all<T>(array: T[], fn: (arg0: T) => boolean): boolean {
    for (const elem of array) {
        if (!fn(elem)) return false;
    }
    return true;
}


export namespace config {
    export const RADIX = 4;
    export let DEBUG = false;
    export let precision = 30; // Number of quotient digits to calculate
}

export function debugLog(message?: any, ...optionalParams: any[]) {
    if (config.DEBUG) {
        console.log(message, ...optionalParams);
    }
}

import { LKNumber } from './number';
import { any } from './utils';


export function lookupTable(remainder: LKNumber, divisor: LKNumber): number {
    const p = remainder.toNumber();
    const d = divisor.toNumber();

    const D = (x: number) => x * d;

    const p_d_in_pos = ([p_lower_bound, d_upper_bound_fraction]: [number, number]): boolean => {
        // is p below the line?
        return p < p_lower_bound && d >= 1 + (d_upper_bound_fraction/16);
    };
    const p_d_in_neg = ([p_lower_bound, d_upper_bound_fraction]: [number, number]): boolean => {
        return p >= p_lower_bound && d >= 1 + (d_upper_bound_fraction/16);
    };

    if (p > D(8/3)) {
        throw new RangeError('exceeded upper bound');
    
    } else if (D(8/3) >= p && p > D(5/3)) {
        return 2;

    } else if (D(5/3) >= p && p > D(4/3)) {
        const pairs = [
            [1.5,   0],
            [1.75,  2],
            [2.0,   5],
            [2.25,  8],
            [2.5,  11],
            [2.75, 14]
        ];
        if (any(pairs, p_d_in_pos)) return 2
        else return 1;

    } else if (D(4/3) >= p && p > D(2/3)) {
        return 1;

    } else if (D(2/3) >= p && p > D(1/3)) {
        const pairs = [
            [0.375, 0],
            [0.5,   2],
            [0.625, 8],
            [0.75, 14]
        ];
        if (any(pairs, p_d_in_pos)) return 1;
        else return 0;

    } else if (D(1/3) >= p && p > D(-1/3)) {
        return 0;

    } else if (D(-1/3) >= p && p > D(-2/3)) {
        const pairs = [
            [-0.625, 0],
            [-0.750, 2],
            [-0.875, 8],
            [-1.00, 14]
        ];
        if (any(pairs, p_d_in_neg)) return -0;
        else return -1;

    } else if (D(-2/3) >= p && p > D(-4/3)) {
        return -1;

    } else if (D(-4/3) >= p && p > D(-5/3)) {
        const pairs = [
            [-1.625,  0],
            [-1.875,  2],
            [-2.125,  5],
            [-2.375,  8],
            [-2.625, 11],
            [-2.875, 14],
        ];
        if (any(pairs, p_d_in_neg)) return -1;
        else return -2;

    } else if (D(-5/3) >= p && p > D(-8/3)) {
        return -2;

    } else {
        throw new RangeError(`exceeded lower bound, p: ${p}`);
    }
}

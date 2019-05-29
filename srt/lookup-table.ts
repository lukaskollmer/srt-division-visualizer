import { LKNumber } from './number.js';
import { any, debugLog } from './utils.js';

import * as LookupTableData from './lookup-table-data.js';

export enum LookupTableBehaviour {
    Correct, Incorrect_PentiumFDIV
}

const kRemainderInterval = 0.125;
const kDivisorInterval = 1/16;


function isPentiumFdivDefectiveCell(p: number, d: number): boolean {
    return any(LookupTableData.pentium_fdiv_defective_cells, ([x, y]) => x === d && y === p);
}


// Returns a tuple containing the quotient digit guess and a boolean indicating whether the guess is from an invalid area
export function lookupQuotientDigit(k: number, remainder: LKNumber, divisor: LKNumber, behaviour: LookupTableBehaviour): [number, boolean] {
    const p = remainder.toNumber();
    if (p === 0) return [0, false];
    
    const d = divisor.toNumber();
    const D = (x: number) => x * d;
    
    // offset from the s axis, in eights
    const p_adj_flr = (p >= 0 ? Math.floor : Math.ceil)(p / kRemainderInterval);
    // offset from the y axis, in sixteenths
    const d_adj_flr = Math.floor((d - 1) / kDivisorInterval);

    debugLog(`p: ${p} (${p_adj_flr}), d: ${d} (${d_adj_flr})`);

    if (p === 0) {
        return [0, false];
    }

    if (p > 0) {
        if (p <= D(1/3)) {
            return [0, false];
        
        } else if (p <= D(2/3)) {
            for (const [x, y] of LookupTableData.pairs_1_3_pos) {
                if (x <= d_adj_flr && y >= p_adj_flr) return [0, false];
            }
            return [1, false];
        
        } else if (p <= D(4/3)) {
            return [1, false];
        
        } else if (p <= D(5/3)) {
            for (const [x, y] of LookupTableData.pairs_4_3_pos) {
                if (x <= d_adj_flr && y >= p_adj_flr) return [1, false];
            }
            return [2, false];
        
        } else {
            if (behaviour === LookupTableBehaviour.Incorrect_PentiumFDIV && isPentiumFdivDefectiveCell(p_adj_flr, d_adj_flr)) {
                debugLog('Hit defective cell');
                return [0, true];
            }

            for (const [x, y] of LookupTableData.pairs_8_3_pos) {
                if (x <= d_adj_flr && y >= p_adj_flr) return [2, false];
            }
            if (behaviour === LookupTableBehaviour.Correct) {
                // The correct lookuop table behaviour should never reach this region of the table
                throw new Error(`[lookup table] input combination (${p_adj_flr}, ${d_adj_flr}) exceeded upper table bound`);
            }
            return [0, true];
        }
    }

    if (p < 0) {
        if (p > D(-1/3)) {
            return [0, false];
        
        } else if (p >= D(-2/3)) {
            for (const [x, y] of LookupTableData.pairs_2_3_neg) {
                if (x <= d_adj_flr && y < p_adj_flr) return [0, false];
            }
            return [-1, false];
        
        } else if (p > D(-4/3)) {
            return [-1, false];
        
        } else if (p >= D(-5/3)) {
            for (const [x, y] of LookupTableData.pairs_5_3_neg) {
                if (x <= d_adj_flr && y <= p_adj_flr) return [-1, false];
            }
            return [-2, false];
        
        } else if (p > D(-8/3)) {
            return [-2, false];
        
        } else {
            for (const [x, y] of LookupTableData.pairs_8_3_neg) {
                if (x <= d_adj_flr && y <= p_adj_flr) return [-2, false];
            }

            if (behaviour === LookupTableBehaviour.Correct) {
                // The correct lookuop table behaviour should never reach this region of the table
                throw new Error(`[lookup table] input combination (${p_adj_flr}, ${d_adj_flr}) exceeded lower table bound`);
            }
            return [0, true];
        }
    }

    throw new Error(`[lookup table] unhandled input combination (${p_adj_flr}, ${d_adj_flr})`);
}

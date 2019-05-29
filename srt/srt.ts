import { LKNumber } from "./number.js";
import { lookupQuotientDigit, LookupTableBehaviour } from "./lookup-table.js";
import { config, debugLog } from "./utils.js";


export class DivisionStep {
    quotientDigits: number[];
    quotientGuess: number;
    prevCarry: LKNumber;
    prevRemainder: LKNumber;
    approximatedRemainder: LKNumber;
    qD_before_bit_flip: LKNumber;
    qD: LKNumber;
    carry: LKNumber;
    carryBeforeShift: LKNumber;
    remainder: LKNumber;
    remainderBeforeShift: LKNumber;
}


export class DivisionResult {
    normalizedDividend: [LKNumber, number];
    normalizedDivisor: [LKNumber, number];
    approximatedDivisor: LKNumber;
    lookupTableBehaviour: LookupTableBehaviour;
    value: LKNumber;
    value_unshifted: LKNumber;
    steps: DivisionStep[];
    quotientDigits: number[];
}



function _truncateExponent(x: LKNumber, numDigitsToKeep: number): LKNumber {
    const retval = x.copy();
    for (let i = 0; i < LKNumber.exponentWidth - numDigitsToKeep; i++) {
        retval.exponentView[i] = x.exponentView[LKNumber.exponentWidth - numDigitsToKeep];
    }
    return retval;
}

function _roundDownSignificand(x: LKNumber, numDigitsToKeep: number): LKNumber {
    const retval = x.copy();
    for (let i = numDigitsToKeep; i < LKNumber.significandWidth; i++) {
        retval.significandView[i] = 0;
    }
    return retval;
}


function _calc_approx_remainder(carry: LKNumber, remainder: LKNumber): LKNumber {
    return _truncateExponent(_roundDownSignificand(carry, 3).add(_roundDownSignificand(remainder, 3)), 4);
}


// "The easy way"
// TODO reimplement this
function assembleQuotientDigitsIntoResult_imp1(quot_digits: number[], exp_dividend: number, exp_divisor: number): LKNumber {
    return new LKNumber(quot_digits.reduce((acc, q, i) => acc + q * Math.pow(config.RADIX, -i), 0)).mul(2 * (exp_dividend - exp_divisor));
}


// "The other way"
function assembleQuotientDigitsIntoResult_imp2(quot_digits: number[], exp_dividend: number, exp_divisor: number): [LKNumber, LKNumber] {
    const q_pos = new LKNumber();
    const q_neg = new LKNumber();
    
    for (let i = 0; i < quot_digits.length; i++) {
        const digit = quot_digits[i];
        if (digit !== 0) {
            let d: [number, number];
            switch (digit) {
                case -2: case 2: d = [1, 0]; break;
                case -1: case 1: d = [0, 1]; break;
                default: throw new Error(`should never reach here`);
            }
            
            const target = digit >= 0 ? q_pos : q_neg;
            if (i === 0) {
                target.exponentView[LKNumber.exponentWidth - 2] = d[0];
                target.exponentView[LKNumber.exponentWidth - 1] = d[1];
            } else {
                const offset = 2 * (i - 1);
                target.significandView[offset] = d[0];
                target.significandView[offset + 1] = d[1];
            }
        }
    }
    
    const result = q_pos.sub(q_neg);
    const result_unshifted = result.copy();
    result.shift_left(exp_dividend - exp_divisor);
    return [result_unshifted, result];
}




// The SRT Division Algorithm
export function srt(_dividend: LKNumber, _divisor: LKNumber, N: number, lookupTableBehaviour: LookupTableBehaviour): DivisionResult {
    const [dividend, exp_dividend] = _dividend.normalized();
    const [divisor, exp_divisor] = _divisor.normalized();
    
    const quot_digits = new Array<number>(N);
    const divisor_approx = _roundDownSignificand(divisor, 4);
    
    debugLog(`- q0: ${dividend}`);
    debugLog(`- q1: ${divisor_approx}`);
    
    const steps = new Array<DivisionStep>(N);
    
    let remainder = dividend;
    let carry = new LKNumber();
    
    
    for (let k = 0; k < N; k++) {
        const step = new DivisionStep();
        
        step.prevCarry = carry.copy();
        step.prevRemainder = remainder.copy();
        debugLog(`\n\n==================================`);
        debugLog(`- k: ${k+1}`);
        
        debugLog(`- pc: ${carry}`);
        debugLog(`- pr: ${remainder}`);
        
        const approx_remainder = _calc_approx_remainder(carry, remainder);
        step.approximatedRemainder = approx_remainder.copy();
        debugLog(`- ar: ${approx_remainder}`);
        const quot_guess = step.quotientGuess = lookupQuotientDigit(k, approx_remainder, divisor_approx, lookupTableBehaviour);
        debugLog(`- q: ${quot_guess}`);
        
        const qD = divisor.mul(Math.abs(quot_guess));
        step.qD_before_bit_flip = qD.copy();
        if (quot_guess > 0) {
            qD.flipBits();
        }
        step.qD = qD.copy();
        
        [remainder, carry] = remainder.add_carrySave(carry, qD);
        if (quot_guess > 0) {
            carry.fullBitPattern[LKNumber.bitPatternWidth - 1] = 1;
        }
        
        step.remainderBeforeShift = remainder.copy();
        remainder.shift_left(2);
        
        step.carryBeforeShift = carry.copy();
        carry.shift_left(2);
        debugLog(`- 4c: ${carry}`);
        debugLog(`- 4r: ${remainder}`);
        
        debugLog(`- 4c1: ${carry}`);
        carry = _truncateExponent(carry, 4);
        debugLog(`- 4c2: ${carry}`);
        step.carry = carry.copy();
        
        debugLog(`- 4r1: ${remainder}`);
        remainder = _truncateExponent(remainder, 4);
        debugLog(`- 4r2: ${remainder}`);
        step.remainder = remainder.copy();
        
        quot_digits[k] = quot_guess;
        step.quotientDigits = quot_digits.slice(0, k+1);
        
        steps[k] = step;
    }
    
    const result = new DivisionResult();
    result.normalizedDividend = [dividend, exp_dividend];
    result.normalizedDivisor = [divisor, exp_divisor];
    result.approximatedDivisor = divisor_approx;
    result.lookupTableBehaviour = lookupTableBehaviour;
    [result.value_unshifted, result.value] = assembleQuotientDigitsIntoResult_imp2(quot_digits, exp_dividend, exp_divisor);
    result.steps = steps;
    result.quotientDigits = quot_digits;
    
    debugLog(quot_digits);
    
    return result;
}

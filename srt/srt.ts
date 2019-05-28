import { LKNumber } from "./number.js";
import { lookupQuotientDigit, LookupTableBehaviour } from "./lookup-table.js";
import { config, debugLog } from "./utils.js";


export class DivisionStep {
    quotientDigits: number[];
    quotientGuess: number;
    prevCarry: LKNumber;
    prevRemainder: LKNumber;
    approximatedRemainder: LKNumber;
    qD: LKNumber;
    carry: LKNumber;
    carryBeforeShift: LKNumber;
    remainder: LKNumber;
    remainderBeforeShift: LKNumber;
}


export class DivisionResult {
    normalizedDividend: [LKNumber, number];
    normalizedDivisor: [LKNumber, number];
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
        
        const approx_remainder = step.approximatedRemainder = _calc_approx_remainder(carry, remainder);
        debugLog(`- ar: ${approx_remainder}`);
        const quot_guess = step.quotientGuess = lookupQuotientDigit(k, approx_remainder, divisor_approx, lookupTableBehaviour);
        debugLog(`- q: ${quot_guess}`);
        
        const dQ = step.qD = divisor.mul(Math.abs(quot_guess));
        if (quot_guess > 0) {
            dQ.flipBits();
        }
        
        [remainder, carry] = remainder.add_carrySave(carry, dQ);
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
    result.lookupTableBehaviour = lookupTableBehaviour;
    [result.value_unshifted, result.value] = assembleQuotientDigitsIntoResult_imp2(quot_digits, exp_dividend, exp_divisor);
    result.steps = steps;
    result.quotientDigits = quot_digits;
    
    debugLog(quot_digits);
    
    return result;
}




function _runTests(enableDebugLogging: boolean) {
    config.DEBUG = enableDebugLogging;
    config.precision = 30;
    
    class TestCase {
        x: number;
        y: number;
        expectedResult: number;
        lookupBehaviour: LookupTableBehaviour;
        
        constructor(x: number, y: number, lookupBehaviour: LookupTableBehaviour, expectedResult: number) {
            this.x = x;
            this.y = y;
            this.expectedResult = expectedResult;
            this.lookupBehaviour = lookupBehaviour;
        }
    }
    
    const testCases: TestCase[] = [
        new TestCase(15, 4, LookupTableBehaviour.Correct, 3.75),
        new TestCase(4195835, 3145727, LookupTableBehaviour.Correct, 1.333820449136241002),
        new TestCase(4195835, 3145727, LookupTableBehaviour.Incorrect_PentiumFDIV, 1.333739068902037589),
        new TestCase(5506153, 294911, LookupTableBehaviour.Correct, 18.67055823621364),
        new TestCase(5506153, 294911, LookupTableBehaviour.Incorrect_PentiumFDIV, 18.66990719233938)
    ];
    
    
    function _lookupBehaviourToString(lookupBehaviour: LookupTableBehaviour): string {
        switch (lookupBehaviour) {
            case LookupTableBehaviour.Correct: return 'Correct';
            case LookupTableBehaviour.Incorrect_PentiumFDIV: return 'Incorrect_PentiumFDIV';
        }
    }
    
    for (let i = 0; i < testCases.length; i++) {
        console.log(`======= test #${i} =======`);
        
        const testCase = testCases[i];
        
        const result = srt(new LKNumber(testCase.x), new LKNumber(testCase.y), config.precision, testCase.lookupBehaviour);
        const value = result.value.toNumber();
        console.log(`- ${testCase.x} / ${testCase.y} (${_lookupBehaviourToString(testCase.lookupBehaviour)})`);
        console.log(`- exp: ${testCase.expectedResult}`);
        console.log(`- act: ${value}`)
        console.log(`- diff: ${Math.abs(value - testCase.expectedResult)}`);
        console.log(`- digits: ${result.quotientDigits}`)
        
        console.log();
    }
}


_runTests(false);

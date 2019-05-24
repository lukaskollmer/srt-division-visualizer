import { LKNumber } from "./number";
import { lookupTable } from "./lookup-table";


function srt(dividend: LKNumber, divisor: LKNumber, radix: number, N: number = 12) {
    const quot_digits = new Array<number>(N);
    quot_digits.fill(0);
    
    const exp_dividend = dividend.normalize();
    const exp_divisor = divisor.normalize();

    let remainder = dividend;

    for (let k = 0; k < N; k++) {
        // console.log(`\n\nk: ${k}, remainder: ${remainder}, divisor: ${divisor}`);
        const quot_guess = lookupTable(remainder, divisor);
        //console.log(`quot_guess: ${quot_guess}`);
        
        const x = divisor.mul(quot_guess);
        //console.log(`x = ${quot_guess} * ${divisor} = ${x}`);
        
        remainder = remainder.sub(x);
        //console.log(`r - x = ${remainder}`);

        remainder = remainder.mul(radix);
        //console.log(`r2 = ${remainder}`);
        
        quot_digits[k] = quot_guess;
    }


    // Assemble the quotient digits into a number

    const q_pos = new LKNumber();
    const q_neg = new LKNumber();

    for (let i = 0; i < quot_digits.length; i++) {
        const digit = quot_digits[i];
        if (digit !== 0) {
            let d;
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
    result.shift_left(exp_dividend - exp_divisor);
    return result.toNumber();
}


const prime_pairs = [
    [22, 7],
    [333, 106],
    [355, 113],
    [52163, 16604],
    [103993, 33102],
    [245850922, 78256779],
]

for (const [x, y] of prime_pairs) {
    console.log(srt(new LKNumber(x), new LKNumber(y), 4, 20));
}

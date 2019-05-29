import { LKNumber } from '../srt/number.js';
import { LookupTableBehaviour } from '../srt/lookup-table.js';
import { srt, DivisionResult, DivisionStep, assembleQuotientDigitsIntoResult } from '../srt/srt.js';
import { DOMGen, MathJaxUtils } from './util.js';
import { config } from '../srt/utils.js';

// Not sure why but for some reason typescript refuses to use the definitions from @types/chart.js :/
declare const Chart: any;


let iterationStepTemplate: StringTemplate = null;

const dividendInputField = document.getElementById('d1') as HTMLInputElement;
const divisorInputField  = document.getElementById('d2') as HTMLInputElement;


function checkIsValidInput(fieldName: string, rawValue: string): boolean {
    if (rawValue.length === 0) {
        alert(`Error: Missing input in ${fieldName} field`);
        return false;
    }

    return true;
}



// TODO rewrite this so that it parses all template names once, and just uses the start/end offsets in subsequent subsituutions
class StringTemplate {
    readonly rawString: string;

    constructor(rawString: string) {
        this.rawString = rawString;
    }

    substitute(substitutions: {[key: string]: string | number}): string {
        let components: string[] = [];

        let next_char_escaped: boolean = false;
        let totalOffset = 0;



        for (const line of this.rawString.split('\n')) {
            if (line.charAt(0) === '!') {
                continue;
            }

            let lastMatchEndIndex = 0;

            for (let i = 0; i < line.length; i++) {
                let c = line.charAt(i);

                next_char_escaped = (c === '\\') ? !next_char_escaped : false;

                if (!next_char_escaped && c === '%') {
                    components.push(line.substring(lastMatchEndIndex, i));
                    i += 1;
                    let key = '';
                    while ((c = line.charAt(i)) !== '%') {
                        key += c;
                        i += 1;
                    }
                    i += 1;
                    lastMatchEndIndex = i;
                    const replacement = substitutions[key];
                    if (replacement === undefined) {
                        throw new Error(`Unable to substitute for key '${key}'`);
                    }
                    components.push(String(replacement));
                }
            }

            components.push(line.substring(lastMatchEndIndex, line.length), '\n');
        }

        return components.join('');
    }
}



function drawChartForQuotientGuesses(result: DivisionResult) {
    return;

    const element = document.getElementById('quotient-guess-chart') as HTMLCanvasElement;
    const ctx = element.getContext('2d');
    const data = result.steps.map((step, k) => {
        const value = assembleQuotientDigitsIntoResult(
            step.quotientDigits,
            result.normalizedDividend[1],
            result.normalizedDivisor[1]
        )[1].toNumber();
        return {
            x: k,
            y: value
        }
    })
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: result.steps.map((_, i) => i),
            datasets: [{
                label: 'label',
                data: data  
            }]
        }
    });
}




async function didClickCalculateButton() {
    if (iterationStepTemplate === null) {
        throw 'FOOKIN HELL';
    }
    const precision = 12;
    const dividendRawValue = dividendInputField.value;
    const divisorRawValue = divisorInputField.value;

    if (!checkIsValidInput('dividend', dividendRawValue) || !checkIsValidInput('divisor', divisorRawValue)) {
        return;
    }

    DOMGen.discardCurrentVisualization();
    DOMGen.setInsertionPoint(document.getElementById('insertion_marker'));


    const dividend = new LKNumber(dividendRawValue);
    const divisor = new LKNumber(divisorRawValue);

    const incorrectResult = srt(dividend, divisor, precision, LookupTableBehaviour.Incorrect_PentiumFDIV);

    document.getElementById('input_formula').innerHTML = MathJaxUtils.createHeaderEquation(dividend, divisor, incorrectResult);

    let hadInvalidLookupDigit = false;
    const quotientDigitsList: string[] = [];

    for (let k = 0; k < precision; k++) {
        const step = incorrectResult.steps[k];

        if (hadInvalidLookupDigit || step.isGuessFromInvalidLookupTableArea) {
            hadInvalidLookupDigit = true;
            quotientDigitsList.push(`\\color{red}{${step.quotientGuess}}`);
        } else {
            quotientDigitsList.push(step.quotientGuess.toString());
        }

        const toBinary = (x: LKNumber) => x.toBinaryString(4, LKNumber.significandWidth);

        const html = iterationStepTemplate.substitute({
            RADIX:                  config.RADIX,
            DIVISOR:                incorrectResult.normalizedDivisor[0].toBinaryString(4, LKNumber.significandWidth),
            DIVISOR_APPROX:         incorrectResult.approximatedDivisor.toBinaryString(1, 4),
            ITERATION_INDEX:        k,
            ITERATION_INDEX_NEXT:   k+1,
            QUOTIENT_GUESS:         quotientDigitsList[k],
            QUOTIENT_DIGITS:        quotientDigitsList.join(', '),
            CARRY_PREV:             toBinary(step.prevCarry),
            CARRY_PREV_APPROX:      step.prevCarry.toBinaryString(4, 3),
            REMAINDER_PREV:         toBinary(step.prevRemainder),
            REMAINDER_PREV_APPROX:  step.prevRemainder.toBinaryString(4, 3),
            REMAINDER_APPROX:       step.approximatedRemainder.toBinaryString(4, 3),
            NEG_QD:                 toBinary(step.qD),
            CARRY_UNSHIFTED:        toBinary(step.carryBeforeShift),
            CARRY_SHIFTED:          toBinary(step.carry),
            REMAINDER_UNSHIFTED:    toBinary(step.remainderBeforeShift),
            REMAINDER_SHIFTED:      toBinary(step.remainder),
        });

        const p = new DOMParser();
        const d = p.parseFromString(html, 'text/html');

        DOMGen.insert(d.firstChild.childNodes[1].firstChild as HTMLElement);
    }

    // drawChartForQuotientGuesses(incorrectResult);

    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}


(async () => {
    const res = await fetch('./iteration-step-template.html');
    const str = await res.text();
    iterationStepTemplate = new StringTemplate(str);
})();



document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calc-button').addEventListener('click', didClickCalculateButton);
    
    dividendInputField.value = '4195835';
    divisorInputField.value = '3145727';
    // setTimeout(didClickCalculateButton, 1000);
});
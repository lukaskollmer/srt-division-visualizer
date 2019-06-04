// TODO: in the assembled results, mark everything after an incorrect guess red

import { LKNumber } from '../srt/number.js';
import { LookupTableBehaviour } from '../srt/lookup-table.js';
import { srt, DivisionResult, DivisionStep, assembleQuotientDigitsIntoResult } from '../srt/srt.js';
import { DOMGen, MathJaxUtils, Settings } from './util.js';
import { config } from '../srt/utils.js';



function getElementById<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}


const domParser = new DOMParser();
let iterationStepTemplate: StringTemplate = null;

const dividendInputField   = getElementById<HTMLInputElement>('input.dividend');
const divisorInputField    = getElementById<HTMLInputElement>('input.divisor');
const precisionInputField  = getElementById<HTMLInputElement>('input.precision');
const lookupBehaviourInput = getElementById<HTMLSelectElement>('input.lookup-behaviour');



function checkIsValidInput(fieldName: string, value: number): boolean {
    if (!isFinite(value)) { // according to the mozilla docs, isFinite also checks for NaN and undefined
        alert(`Error: Missing input in ${fieldName} field`);
        return false;
    }

    return true;
}


class StringTemplate {
    readonly rawString: string;

    constructor(rawString: string) {
        this.rawString = rawString;
    }

    substitute(substitutions: {[key: string]: string | number}): string {
        let components: string[] = [];
        let next_char_escaped: boolean = false;

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


function getSelectedLookupTableBehaviour(): LookupTableBehaviour {
    const rawValue = lookupBehaviourInput.value;
    if (rawValue === 'input.lookup-behaviour.correct') {
        return LookupTableBehaviour.Correct;
    } else if (rawValue === 'input.lookup-behaviour.pentium-fdiv') {
        return LookupTableBehaviour.Incorrect_PentiumFDIV;
    } else {
        console.log(`Invalid option value: ${rawValue}`);
        return LookupTableBehaviour.Correct;
    }
}


function didClickCalculateButton() {
    if (iterationStepTemplate === null) {
        throw 'FOOKIN HELL';
    }
    const precision = parseInt(precisionInputField.value);
    const dividendValue = parseFloat(dividendInputField.value);
    const divisorValue = parseFloat(divisorInputField.value);

    if (!checkIsValidInput('dividend', dividendValue) || !checkIsValidInput('divisor', divisorValue) || !checkIsValidInput('precision', precision)) {
        return;
    }

    DOMGen.discardCurrentVisualization();
    DOMGen.setInsertionPoint(document.getElementById('insertion_marker'));

    let dividend, divisor: LKNumber;
    let exp_dividend, exp_divisor: number;

    try {
        [dividend, exp_dividend] = LKNumber.normalized(dividendValue);
        [divisor, exp_divisor] = LKNumber.normalized(divisorValue);
    } catch (error) {
        if (error instanceof Error) {
            alert(`${error.name}: ${error.message}`);
        } else {
            alert(error);
        }
        return;
    }

    const lookupBehaviour = getSelectedLookupTableBehaviour();
    const result = srt(dividend, divisor, precision, lookupBehaviour);

    let hadInvalidLookupDigit = false;
    const coloredQuotientDigits: string[] = [];

    for (let k = 0; k < precision; k++) {
        const step = result.steps[k];
        
        hadInvalidLookupDigit = hadInvalidLookupDigit || step.isGuessFromInvalidLookupTableArea;
        coloredQuotientDigits.push(`\\href{#${k}}{\\color{${hadInvalidLookupDigit ? 'red' : 'black'}}{${step.quotientGuess}}}`);

        const ass_unshifted = assembleQuotientDigitsIntoResult(step.quotientDigits);
        const ass_shifted = ass_unshifted.copy(); ass_shifted.shift_left(exp_dividend - exp_divisor);

        const toBinary = (x: LKNumber) => x.toBinaryString(4, LKNumber.significandWidth);

        const html = iterationStepTemplate.substitute({
            RADIX:                  config.RADIX,
            DIVISOR:                divisor.toBinaryString(4, LKNumber.significandWidth),
            DIVISOR_APPROX:         result.approximatedDivisor.toBinaryString(1, 4),
            ITERATION_INDEX:        k,
            ITERATION_INDEX_NEXT:   k+1,
            QUOTIENT_GUESS:         coloredQuotientDigits[k],
            QUOTIENT_DIGITS:        coloredQuotientDigits.join(', '),
            ASS_QUOTIENT_UNSHIFTED: ass_unshifted.toNumber(),
            ASS_QUOTIENT:           ass_shifted.toNumber(),
            INPUT_EXP_DIFF:         exp_dividend - exp_divisor,
            CARRY_PREV:             toBinary(step.prevCarry),
            CARRY_PREV_APPROX:      step.prevCarry.toBinaryString(4, 3),
            REMAINDER_PREV:         toBinary(step.prevRemainder),
            REMAINDER_PREV_APPROX:  step.prevRemainder.toBinaryString(4, 3),
            REMAINDER_APPROX:       step.approximatedRemainder.toBinaryString(4, 3),
            QD_SHIFTED_B4_NEG:      toBinary(step.qD_before_bit_flip),
            NEG_QD:                 toBinary(step.qD),
            CARRY_UNSHIFTED:        toBinary(step.carryBeforeShift),
            CARRY_SHIFTED:          toBinary(step.carry),
            REMAINDER_UNSHIFTED:    toBinary(step.remainderBeforeShift),
            REMAINDER_SHIFTED:      toBinary(step.remainder),
        });

        const dom = domParser.parseFromString(html, 'text/html');
        DOMGen.insert(dom.firstChild.childNodes[1].firstChild as HTMLElement);
    }

    DOMGen.insert(document.createElement('hr'));

    const shiftedFinalResult = result.value.copy(); shiftedFinalResult.shift_left(exp_dividend - exp_divisor);
    const shiftedFinalResultDigits: string = (() => {
        const finalResultAsString = shiftedFinalResult.toNumber().toString();
        if (lookupBehaviour === LookupTableBehaviour.Correct) {
            return `\\color{black}{${finalResultAsString}}`;
        }
        const correctSrtResult = srt(dividend, divisor, precision, LookupTableBehaviour.Correct);
        const correctResultValue = correctSrtResult.value.copy(); correctResultValue.shift_left(exp_dividend - exp_divisor);
        const correctResultAsString = correctResultValue.toNumber().toString();

        const limit = Math.min(finalResultAsString.length, correctResultAsString.length);
        let i = 0;
        while (i < limit && finalResultAsString.charAt(i) === correctResultAsString.charAt(i)) {
            i += 1;
        }

        return i === limit
            ? finalResultAsString
            : `${finalResultAsString.substring(0, i)}\\color{red}{${finalResultAsString.substring(i)}}`;
    })();

    document.getElementById('input_formula').innerHTML = MathJaxUtils.createHeaderEquation(
        [dividendValue, dividend, exp_dividend],
        [divisorValue, divisor, exp_divisor],
        result,
        shiftedFinalResultDigits,
        coloredQuotientDigits
    );


    MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
}


(async () => {
    const res = await fetch('./iteration-step-template.html');
    const str = await res.text();
    iterationStepTemplate = new StringTemplate(str);
})();



document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calc-button').addEventListener('click', didClickCalculateButton);

    for (const elem of document.getElementsByClassName('fraction-input')) {
        elem.addEventListener('keyup', event => {
            if (event instanceof KeyboardEvent && event.key === 'Enter') {
                didClickCalculateButton();
            }
        })
    }

    // Set initial values
    dividendInputField.value   = Settings.get(Settings.Key.dividend).toString();
    divisorInputField.value    = Settings.get(Settings.Key.divisor).toString();
    precisionInputField.value  = Settings.get(Settings.Key.precision).toString();
    lookupBehaviourInput.value = Settings.get(Settings.Key.lookupBehaviour);


    dividendInputField.addEventListener('change', function() {
        Settings.set(Settings.Key.dividend, parseInt(this.value));
    });
    divisorInputField.addEventListener('change', function() {
        Settings.set(Settings.Key.divisor, parseInt(this.value));
    });
    precisionInputField.addEventListener('change', function() {
        Settings.set(Settings.Key.precision, parseInt(this.value));
    });
    lookupBehaviourInput.addEventListener('change', function() {
        Settings.set(Settings.Key.lookupBehaviour, this.value);
    });
});


(window as any).lk_goto = (index: number) => {
    location.href = `#${index}`;
}
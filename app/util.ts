import { LKNumber } from "../srt/number.js";
import { DivisionStep, DivisionResult } from "../srt/srt.js";
import { config } from "../srt/utils.js";

const kDivisionVisualizationInsertedDivClass = '__div_visualization';

export namespace DOMGen {
    export function discardCurrentVisualization() {
        Array.from(document.getElementsByClassName(kDivisionVisualizationInsertedDivClass)).forEach(n => n.remove());
    }

    let _insertionPoint: HTMLElement;
    export function setInsertionPoint(insertionPoint: HTMLElement) {
        _insertionPoint = insertionPoint;
    }

    export function insert(elem: HTMLElement) {
        elem.classList.add(kDivisionVisualizationInsertedDivClass);
        _insertionPoint.parentElement.insertBefore(elem, _insertionPoint.nextSibling);
        _insertionPoint = elem;
    }

    export function createIterationHeadingRowForIndex(k: number): HTMLDivElement {
        const div1 = document.createElement('div');
        div1.classList.add('row', kDivisionVisualizationInsertedDivClass);
        
        const div2 = document.createElement('div');
        div2.classList.add('twelve', 'columns');
        const h3 = document.createElement('h3');
        h3.innerText = `Iteration #${k}`;
        h3.classList.add('iteration-index-header');
        
        div2.appendChild(h3);
        div1.appendChild(div2);
        return div1;
    }
}

export namespace MathJaxUtils {

    export function genFraction(x: string | number, x_base: number | null, x_exp: number | null, y: string | number, y_base: number | null, y_exp: number | null): string {
        // TODO there's obvious potential for improvement here...
        let str = `\\frac{${x}`;
        if (x_base) {
            str += `_{${x_base}}`;
        }
        if (x_base && x_exp) {
            str += ` * ${x_base}^{${x_exp}}`;
        }
        str += `}{${y}`;
        if (y_base) {
            str += `_{${y_base}}`;
        }
        if (y_base && y_exp) {
            str += ` * ${y_base}^{${y_exp}}`;
        }
        str += '}';
        return str;
    }
    

    // Params:
    // dividend/divisor: tuple containing [original input, normalized input, normalized input exponent]
    export function createHeaderEquation(_dividend: [number, LKNumber, number], _divisor: [number, LKNumber, number], result: DivisionResult, shiftedResult: LKNumber, coloredQuotientDigits: string[]): string {
        const [input_dividend, norm_dividend, norm_dividend_exp] = _dividend;
        const [input_divisor, norm_divisor, norm_divisor_exp] = _divisor;
    
        let str = '$$';
        str += '\\begin{align*}';
        str += genFraction(input_dividend, 10, null, input_divisor, 10, null);
        str += ' &= ';
        str += genFraction(norm_dividend.toBinaryString(), 2, norm_dividend_exp, norm_divisor.toBinaryString(), 2, norm_divisor_exp);
        str += ' = ';
        str += genFraction(norm_dividend.toBinaryString(), 2, null, norm_divisor.toBinaryString(), 2, null);
        str += ' * ';
        str += `2^{${norm_dividend_exp - norm_divisor_exp}}`;

        const [significandLimit, significandShortened] = ((): [number, boolean] => {
            const idx = result.value.significandView.lastIndexOf(1);
            if (idx === -1) return [5, true];
            if (idx < 12) return [idx + 1, false];
            else return [12, true];
        })();

        str += '\\\\[7pt]'
        str += ' &= ';

        str += '[';
        str += coloredQuotientDigits.join(', ');
        str += `]_{${config.RADIX}}`;

        str += '\\\\[5pt]'
        str += ' &= ';

        str += `${result.value.toBinaryString(undefined, significandLimit)}`
        if (significandShortened) {
            str += '...';
        }
        str += `_{2} * 2^{${norm_dividend_exp - norm_divisor_exp}} = ${shiftedResult.toNumber()}`;

        str += '\\end{align*}$$'
        return str;
    }
}


export namespace Settings {
    const settingsKey = (name: string) => `me.lukaskollmer.srt-division-visualizer.settings.${name}`;


    class _SettingsItem<T> {
        readonly key: string;
        readonly defaultValue: T;

        constructor(name: string, defaultValue: T) {
            this.key = settingsKey(name);
            this.defaultValue = defaultValue;
        }
    }

    export const Key = {
        dividend:  new _SettingsItem<number>('dividend', 15),
        divisor:   new _SettingsItem<number>('divisor', 4),
        precision: new _SettingsItem<number>('precision', 12),
        lookupBehaviour: new _SettingsItem<string>('lookupTableBehaviour', 'input.lookup-behaviour.correct'),
        numDigits: new _SettingsItem<number>('numDigits', 23)
    };

    export function get<T>(item: _SettingsItem<T>): T {
        const value = localStorage.getItem(item.key);
        if (value === null) {
            Settings.set(item, item.defaultValue);
            return item.defaultValue;
        }
        return JSON.parse(value) as T;
    }

    export function set<T>(item: _SettingsItem<T>, value: T) {
        localStorage.setItem(item.key, JSON.stringify(value));
    }
}
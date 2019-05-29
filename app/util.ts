import { LKNumber } from "../srt/number.js";
import { DivisionStep, DivisionResult } from "../srt/srt.js";

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
    

    export function createHeaderEquation(dividend: LKNumber, divisor: LKNumber, result: DivisionResult): string {
        const [d1, d1_exp] = result.normalizedDividend;
        const [d2, d2_exp] = result.normalizedDivisor;
    
        let str = '$$';
        str += genFraction(dividend.toNumber(), 10, null, divisor.toNumber(), 10, null);
        str += ' = ';
        str += genFraction(d1.toBinaryString(), 2, d1_exp, d2.toBinaryString(), 2, d2_exp);
        str += ' = ';
        str += genFraction(d1.toBinaryString(), 2, null, d2.toBinaryString(), 2, null);
        str += ' * ';
        str += `2^{${d1_exp - d2_exp}}`;

        const [significandLimit, significandShortened] = ((): [number, boolean] => {
            const idx = result.value_unshifted.significandView.lastIndexOf(1);
            if (idx === -1) return [5, true];
            if (idx < 12) return [idx + 1, false];
            else return [12, true];
        })();


        str += ' = ';
        str += `${result.value_unshifted.toBinaryString(undefined, significandLimit)}`
        if (significandShortened) {
            str += '...';
        }
        str += ` * 2^{${d1_exp - d2_exp}} = ${result.value.toNumber()}`;

        // str += ' = ';
        // str += `${result.value_unshifted.toBinaryString(4, 12)}... * 2^{${d1_exp - d2_exp}} = ${result.value.toNumber()}`;
        str += '$$';
        return str;
    }
}
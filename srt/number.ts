// An arbitrary width number type with certain binary characteristics
// Uses two's complement for negative numbers

export class LKNumber {
    static get exponentWidth(): number {
        return 32;
    }
    
    static get significandWidth(): number {
        return 64;
    }
    
    static get bitPatternWidth(): number {
        return this.exponentWidth + this.significandWidth;
    }


    private readonly _buffer: ArrayBuffer;
    private readonly _fullBitPattern: Uint8Array;


    constructor(value?: number | string | ArrayBuffer) {
        if (value instanceof ArrayBuffer) {
            this._buffer = value;
        } else {
            this._buffer = new ArrayBuffer(LKNumber.bitPatternWidth);
        }
        this._fullBitPattern = new Uint8Array(this._buffer);
        
        if (typeof value === 'number' || typeof value === 'string') {
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            const isNegative = value < 0;
            if (isNegative) value *= -1;

            const dec = Math.floor(value);
            const decBinaryDigits = dec.toString(2);
            const limit = Math.min(LKNumber.exponentWidth, decBinaryDigits.length);
            for (let i = 0; i < limit; i++) {
                const x = parseInt(decBinaryDigits.charAt(i));
                this.exponentView[LKNumber.exponentWidth - limit + i] = x;
            }

            let frac = value - dec;
            for (let i = 0; i < LKNumber.significandWidth && frac != 0; i++) {
                const tmp = frac - Math.pow(2, -(i+1));
                if (tmp >= 0) {
                    this.significandView[i] = 1;
                    frac = tmp;
                }
            }

            if (isNegative) {
                LKNumber._negate_imp(this.fullBitPattern, this.fullBitPattern);
            }
        }
    }


    // static normalized(value: number): [LKNumber, number] {
    //     if (value === 0) {
    //         return [new LKNumber(), 0];
    //     }

    //     const isNegative = value < 0;
    //     if (isNegative) value *= -1;

    //     const dec = Math.floor(value);
    //     const decBinaryDigits = dec.toString(2);

    //     let exp = 0;
    //     while (value > 10) {
    //         value /= 10;
    //         exp += 1;
    //     }
    //     return [new LKNumber(value), exp];
    // }



    get fullBitPattern(): Uint8Array {
        return this._fullBitPattern;
    }

    get exponentView(): Uint8Array {
        return new Uint8Array(this._buffer, 0, LKNumber.exponentWidth);
    }

    get significandView(): Uint8Array {
        return new Uint8Array(this._buffer, LKNumber.exponentWidth, LKNumber.significandWidth);
    }

    copy(): LKNumber {
        return new LKNumber(this._buffer.slice(0));
    }

    // Normalize a number in-place, returns the exponent
    // todo support left shift normalization and negative numbers
    normalize(): number {
        if (this.exponentView.lastIndexOf(1) === -1) return 0;

        let exp = 0;
        while (this.exponentView.indexOf(1) != LKNumber.exponentWidth - 1) {
            exp += 1;
            this.shift_right(1);
        }
        return exp;
    }

    normalized(): [LKNumber, number] {
        const x = this.copy();
        return [x, x.normalize()];
    }

    get isNegative() {
        return this.significandView[0] === 1;
    }

    add(other: LKNumber): LKNumber {
        const retval = new LKNumber();
        LKNumber._add_imp(
            retval.fullBitPattern,
            this.fullBitPattern,
            other.fullBitPattern
        );
        return retval;
    }

    add_carrySave(other: LKNumber, yetAnother: LKNumber): [LKNumber, LKNumber] {
        const retval = new LKNumber();
        const carry = new LKNumber();
        for (let i = LKNumber.bitPatternWidth - 1; i >= 0; i--) {
            const x = this.fullBitPattern[i] + other.fullBitPattern[i] + yetAnother.fullBitPattern[i];
            switch (x) {
                case 0: break;
                case 1: retval.fullBitPattern[i] = 1; break;
                case 2: carry.fullBitPattern[i] = 1; break;
                case 3:
                    retval.fullBitPattern[i] = 1;
                    carry.fullBitPattern[i] = 1;
                    break;
                default: throw new Error(`should never reach here (x: ${x})`);
            }
        }
        carry.shift_left(1);
        return [retval, carry];
    }


    sub(other: LKNumber): LKNumber {
        return this.add(other.negate());
    }

    mul(other: number): LKNumber {
        if (other == 0) {
            return new LKNumber();
        } else if (other === 1) {
            return this.copy();
        } else if (other == -1) {
            return this.copy().negate();
        } else if (other % 2 == 0) {
            const retval = this.copy();
            retval.shift_left(Math.abs(other / 2));
            if (other < 0) {
                LKNumber._negate_imp(retval.fullBitPattern, retval.fullBitPattern);
            }
            return retval;
        }
        throw new Error(`Unhandled mul operand ${other}`);
    }


    flipBits() {
        for (let i = 0; i < LKNumber.bitPatternWidth; i++) {
            this.fullBitPattern[i] = 1 - this.fullBitPattern[i];
        }
    }


    negate(): LKNumber {
        const retval = this.copy();
        LKNumber._negate_imp(
            this.fullBitPattern,
            retval.fullBitPattern
        );

        return retval;
    }


    shift_left(x: number) {
        LKNumber.shift_left_imp(this.fullBitPattern, x);
    }


    shift_right(x: number) {
        LKNumber.shift_right_sext_imp(this.fullBitPattern, x);
    }


    toString(): string {
        return `<LKNumber ${this.toBinaryString(6, LKNumber.significandWidth)} (${this.toNumber()})>`
    }


    // Returns a binary representation of the number
    // Note that the exponent digits may be truncated: you can revert to the actual number
    // by sign-extending based on the string's first digit
    toBinaryString(fixedExponentWidth?: number, fixedSignificandWidth?: number): string {
        const firstSignificantExponentDigit: number = (() => {
            if (fixedExponentWidth !== undefined) {
                return LKNumber.exponentWidth - fixedExponentWidth;
            }
            const minExpWidthInBinaryRepresentation = 6; // obviously this cannot be larger than the actual exponent width
            const maxOffset = LKNumber.exponentWidth - minExpWidthInBinaryRepresentation;
            if (this.exponentView[0] === 0) {
                return Math.max(maxOffset, this.exponentView.indexOf(1) - 1);
            } else {
                const idx = this.exponentView.indexOf(0);
                if (idx === -1) return maxOffset;
                else return Math.min(maxOffset, idx);
            }
        })();
        const lastSignificantSignificandDigit = fixedSignificandWidth !== undefined ? fixedSignificandWidth : Math.max(4, this.significandView.lastIndexOf(1) + 1);
        return [
            ...this.exponentView.subarray(firstSignificantExponentDigit),
            '.',
            ...this.significandView.subarray(0, lastSignificantSignificandDigit)
        ].join('');
    }

    toNumber(): number {
        let value = 0;
        let bitPattern = this.fullBitPattern;
        const sign = bitPattern[0];
        
        if (sign === 1) {
            bitPattern = new Uint8Array(LKNumber.bitPatternWidth);
            LKNumber._negate_imp(this.fullBitPattern, bitPattern);
        }

        for (let i = LKNumber.exponentWidth - 1; i >= 0; i--) {
            value += Math.pow(2, i) * bitPattern[LKNumber.exponentWidth - i - 1];
        }

        for (let i = 1; i < LKNumber.significandWidth; i++) {
            value += Math.pow(2, -i) * bitPattern[LKNumber.exponentWidth + i - 1];
        }

        return Math.pow(-1, sign) * value;
    }



    // MARK: static methods

    static _add_imp(dst: Uint8Array, src1: Uint8Array, src2: Uint8Array) {
        let carry = 0, x = 0;
        for (let i = LKNumber.bitPatternWidth; i > 0; i--) {
            switch (carry + src1[i - 1] + src2[i - 1]) {
                case 0:
                    x = 0; carry = 0; break;
                case 1:
                    x = 1; carry = 0; break;
                case 2:
                    x = 0; carry = 1; break;
                case 3:
                    x = 1; carry = 1; break;
                default: throw new Error('should never reach here');
            }
            dst[i - 1] = x;
        }
    }

    static shift_left_imp(buf: Uint8Array, x: number) {
        for (let i = 0; i < LKNumber.bitPatternWidth - x; i++) {
            buf[i] = buf[i + x];
        }
        for (let i = x; i > 0; i--) {
            buf[LKNumber.bitPatternWidth - i] = 0;
        }
    }

    static shift_right_sext_imp(buf: Uint8Array, x: number) {
        const sign = buf[0];
        for (let i = LKNumber.bitPatternWidth - 1; i >= x; i--) {
            buf[i] = buf[i - x];
        }
        for (let i = 0; i < x; i++) {
           buf[i] = sign;
        }
    }

    static _negate_imp(src: Uint8Array, dest: Uint8Array) {
        const tmp = new Uint8Array(LKNumber.bitPatternWidth);
        tmp[LKNumber.bitPatternWidth - 1] = 1;

        for (let i = 0; i < LKNumber.bitPatternWidth; i++) {
            dest[i] = 1 - src[i];
        }
        LKNumber._add_imp(dest, dest, tmp);
    }
}
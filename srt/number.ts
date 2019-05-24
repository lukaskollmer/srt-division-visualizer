// An arbitrary width number type with certain binary characteristics

export class LKNumber {
    static get exponentWidth(): number {
        return 64;
    }
    static get significandWidth(): number {
        return 256;
    }
    static get bitPatternWidth(): number {
        return LKNumber.exponentWidth + LKNumber.significandWidth;
    }

    _buffer: ArrayBuffer;
    fullBitPattern: Uint8Array;

    constructor(value?: number | ArrayBuffer) {

        if (!(value instanceof ArrayBuffer)) {
            this._buffer = new ArrayBuffer(LKNumber.bitPatternWidth);
            this.fullBitPattern = new Uint8Array(this._buffer);
        }

        if (value instanceof ArrayBuffer) {
            this._buffer = value;
            this.fullBitPattern = new Uint8Array(this._buffer);
        
        } else if (typeof value === 'number') {
            const isNegative = value < 0;
            if (isNegative) value *= -1;

            const dec = Math.floor(value);
            const decBinaryDigits = dec.toString(2);
            for (let i = 0; i < decBinaryDigits.length; i++) {
                const x = parseInt(decBinaryDigits.charAt(i));
                this.exponentView[LKNumber.exponentWidth - decBinaryDigits.length + i] = x;
            }

            let frac = value - dec;
            for (let i = 0; i < 20 && frac != 0; i++) {
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

    add(other: LKNumber): LKNumber {
        const retval = new LKNumber();
        LKNumber._add_imp(
            retval.fullBitPattern,
            this.fullBitPattern,
            other.fullBitPattern
        );
        return retval;
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


    negate(): LKNumber {
        const retval = this.copy();
        LKNumber._negate_imp(
            this.fullBitPattern,
            retval.fullBitPattern
        );

        return retval;
    }

    // shift the number's bit pattern in-place
    shift(x: number) {
        if (x < 0) {
            this.shift_left(Math.abs(x));
        } else if (x > 0) {
            this.shift_right(x);
        }
    }

    shift_left(x: number) {
        LKNumber.shift_left_imp(this.fullBitPattern, x);
    }

    shift_right(x: number) {
        LKNumber.shift_right_sext_imp(this.fullBitPattern, x);
    }


    toString(): string {
        const numberOfSignificantSignificandDigits = this.significandView.lastIndexOf(1);
        const binaryDigits = [
            ...this.exponentView,
            '.',
            ...this.significandView.slice(0, Math.max(0, numberOfSignificantSignificandDigits) + 1)
        ].join('');

        return `<LKNumber ${binaryDigits} (${this.toNumber()})>`
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
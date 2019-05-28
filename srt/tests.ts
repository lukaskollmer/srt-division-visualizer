import { config } from "./utils";
import { LookupTableBehaviour } from "./lookup-table";
import { srt } from "./srt";
import { LKNumber } from "./number";

config.DEBUG = false;
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
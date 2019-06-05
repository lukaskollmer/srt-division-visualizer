# srt-division-visualizer

A visualization of the SRT division algorithm as used in the 1994 Intel Pentium processor generation, with focus on the 1994 Pentium's FDIV division bug.

This project was created as part of the IN0014 seminar [Analyse von Softwarefehlern](https://campus.tum.de/tumonline/wbLv.wbShowLVDetail?pStpSpNr=950402141) (Analyzing Software Bugs).

## Usage
- A live version of the app is deployed at https://lukaskollmer.me/srt-division-visualizer/
- Build instructions: `npm i && npm run build`
- Run some sample divisions: `npm test` (Enable debug logging by changing the `config.DEBUG` assignment in [`tests.ts`](/srt/tests.ts))

## Other resources
- [The Pentium's FDIV lookup table](https://docs.google.com/spreadsheets/d/1L6T_SfR-T6IQwE8KTKssrxZpG9ZIDXapkZ6eCQ_Jt3w/edit?usp=sharing)
- [Slides from my presentation about the FDIV bug](https://files.lukaskollmer.me/tum/intel-pentium-fdiv-division-bug.pdf)


## Further reading
- [Higher-Radix Division Using Estimates of the Divisor and Partial Remainders](https://files.lukaskollmer.me/tum/925-934.pdf)
- [Statistical Analysis of Floating Point Flaw in the Pentium Processor (1994)](https://files.lukaskollmer.me/tum/intel_whitepaper.pdf)
- [It Takes Six Ones To Reach A Flaw](https://files.lukaskollmer.me/tum/ARITH12_Coe.pdf)

## License
MIT @ [Lukas Kollmer](https://lukaskollmer.me)

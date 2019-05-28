// The Pentium's lookup table visualized: 
// https://docs.google.com/spreadsheets/d/1L6T_SfR-T6IQwE8KTKssrxZpG9ZIDXapkZ6eCQ_Jt3w/edit?usp=sharing


// coordinates point to lower left corner
export const pentium_fdiv_defective_cells: number[][] = [
    [1,  23],
    [4,  27],
    [7,  31],
    [10, 35],
    [13, 39]
];





// Cell coordinates below are given in the following format:
// - x: offset from the y axis, in sixteenths
// - y: offset from the x axis, in eights
// Important:
// - For cells in the upper half of the table, the coordinates point to the upper left corner of the region's topleft cell
// - For cells in the lower half of the table, the coordinates point to the lower left corner of the region's bottomleft cell



export const pairs_8_3_pos: number[][] = [
    [0,  23],
    [1,  24],
    [2,  26],
    [3,  27],
    [4,  28],
    [5,  30],
    [6,  31],
    [7,  32],
    [8,  34],
    [9,  35],
    [10, 36],
    [11, 38],
    [12, 39],
    [13, 40],
    [14, 42],
    [15, 43]
];


export const pairs_4_3_pos: number[][] = [
    [0,  12],
    [2,  14],
    [5,  16],
    [8,  18],
    [11, 20],
    [14, 22]
];


export const pairs_1_3_pos: number[][] = [
    [0,  3],
    [2,  4],
    [8,  5],
    [14, 6]
];







export const pairs_2_3_neg: number[][] = [
    [0,  -5],
    [2,  -6],
    [8,  -7],
    [14, -8]
];


export const pairs_5_3_neg: number[][] = [
    [0,  -13],
    [2,  -15],
    [5,  -17],
    [8,  -19],
    [11, -21],
    [15, -23]
]

export const pairs_8_3_neg: number[][] = [
    [0,  -23],
    [1,  -24],
    [2,  -26],
    [3,  -27],
    [4,  -28],
    [5,  -30],
    [6,  -31],
    [7,  -32],
    [8,  -34],
    [9,  -35],
    [10, -36],
    [11, -38],
    [12, -39],
    [13, -40],
    [14, -42],
    [15, -43]
];

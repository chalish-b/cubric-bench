type Algorithm = { name: string; algorithm: string };

export const pllAlgorithms: Algorithm[] = [
  { name: "Aa", algorithm: "x R' U R' D2 R U' R' D2 R2" },
  { name: "Ab", algorithm: "x R2 D2 R U R' D2 R U' R" },
  { name: "F", algorithm: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { name: "Ga", algorithm: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { name: "Gb", algorithm: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { name: "Gc", algorithm: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { name: "Gd", algorithm: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { name: "Ja", algorithm: "x R2 F R F' R U2 r' U r U2" },
  { name: "Jb", algorithm: "R U R' F' R U R' U' R' F R2 U' R'" },
  { name: "Ra", algorithm: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { name: "Rb", algorithm: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { name: "T", algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: "E", algorithm: "x' L' U L D' L' U' L D L' U' L D' L' U L D" },
  {
    name: "Na",
    algorithm: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  },
  { name: "Nb", algorithm: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { name: "V", algorithm: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { name: "Y", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { name: "H", algorithm: "M2 U M2 U2 M2 U M2" },
  { name: "Ua", algorithm: "R U' R U R U R U' R' U' R2" },
  { name: "Ub", algorithm: "R2 U R U R' U' R' U' R' U R'" },
  { name: "Z", algorithm: "M' U M2 U M2 U M' U2 M2" },
];

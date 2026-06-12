export type Algorithm = { name: string; algorithm: string };

export const pllAlgorithms: Algorithm[] = [
  // TODO: Make sure all of these have correct AUF at the end. It's important for the base case
  { name: "Aa", algorithm: "x R' U R' D2 R U' R' D2 R2 x'" }, // correct
  { name: "Ab", algorithm: "x R2 D2 R U R' D2 R U' R x'" }, // correct
  { name: "F", algorithm: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" }, // correct
  { name: "Ga", algorithm: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { name: "Gb", algorithm: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { name: "Gc", algorithm: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { name: "Gd", algorithm: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { name: "Ja", algorithm: "x R2 F R F' R U2 r' U r U2 x'" },
  { name: "Jb", algorithm: "R U R' F' R U R' U' R' F R2 U' R' U'" },
  { name: "Ra", algorithm: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { name: "Rb", algorithm: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { name: "T", algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" }, // correct
  { name: "E", algorithm: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" }, // correct
  {
    name: "Na",
    algorithm: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", // correct, U2 might give us a more intuitive view but might break the AUF
  },
  { name: "Nb", algorithm: "R' U R U' R' F' U' F R U R' F R' F' R U' R" }, // correct, U2 might give us a more intuitive view but then it'd break the AUF
  { name: "V", algorithm: "R' U R' U' y R' F' R2 U' R' U R' F R F y'" }, // correct, that y' at the end is necessary to get the intuitive base view
  { name: "Y", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" }, // correct
  { name: "H", algorithm: "M2 U M2 U2 M2 U M2" }, // correct
  { name: "Ua", algorithm: "R U' R U R U R U' R' U' R2" }, // correct
  { name: "Ub", algorithm: "R2 U R U R' U' R' U' R' U R'" }, // correct
  { name: "Z", algorithm: "M' U M2 U M2 U M' U2 M2 U'" }, // added U' at the end for AUF. Might also need a Y to give us a more intuitive base view
];

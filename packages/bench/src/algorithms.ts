export type Algorithm = { name: string; algorithm: string };

export const pllAlgorithms: Algorithm[] = [
  // The algorithm itself doesn't really matter here. What matters is that when you apply the inverse,
  // you get the "intuitive base case", where things are aligned nicely and easy for recognition.
  { name: "Aa", algorithm: "x R' U R' D2 R U' R' D2 R2 x'" },
  { name: "Ab", algorithm: "x R2 D2 R U R' D2 R U' R x'" },
  { name: "F", algorithm: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { name: "Ga", algorithm: "R2 U R' U R' U' R U' R2 U' D R' U R D' U" },
  { name: "Gb", algorithm: "R' U' R U D' R2 U R' U R U' R U' R2 D U'" },
  { name: "Gc", algorithm: "R2 F2 R U2 R U2 R' F R U R' U' R' F R2" },
  { name: "Gd", algorithm: "R U R' U' D R2 U' R U' R' U R' U R2 D' U" },
  { name: "Ja", algorithm: "y L' U' L F L' U' L U L F' L2 U L U" },
  { name: "Jb", algorithm: "R U R' F' R U R' U' R' F R2 U' R' U'" },
  { name: "Ra", algorithm: "y' R U' R' U' R U R D R' U' R D' R' U2 R' U'" },
  { name: "Rb", algorithm: "R' U2 R U2 R' F R U R' U' R' F' R2 U'" },
  { name: "T", algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: "E", algorithm: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { name: "Na", algorithm: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { name: "Nb", algorithm: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { name: "V", algorithm: "R' U R' U' y R' F' R2 U' R' U R' F R F y'" },
  { name: "Y", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { name: "H", algorithm: "M2 U M2 U2 M2 U M2" },
  { name: "Ua", algorithm: "R U' R U R U R U' R' U' R2" },
  { name: "Ub", algorithm: "R2 U R U R' U' R' U' R' U R'" },
  { name: "Z", algorithm: "M' U' M2 U' M2 U' M' U2 M2 U" },
];

Cubric Bench is a benchmark for LLMs to test their ability to identify Rubik's cube states, recognize common algorithms (F2L, OLL, PLL) and come up with solutions to questions about the cube state and moves.

Currently, I'm focusing on implementing the `cube` package, which will model the cube as a data structure and apply moves to it. We also have a `cube-demo` app that is used to visualize the state of the cube in a three.js app. I want to get the cube logic right before we move onto benchmark specific stuff.

## Things to keep in mind
- Use `pnpm` for all npm related commands
- Test the cube package using `pnpm --filter @cubric/cube test`


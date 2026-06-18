## Bug fixes & other tests

- Make sure all of the algorithms have correct AUF at the end. It's important for the base case to be correct

## Benchmark Prompt Details

(This one is the global prompt, which will apply to all test cases)

- Your job is to identify and solve simple cases for the Rubik's Cube.
- Based on this given state of the cube, respond with a sequence of moves to solve this state of the cube according to the given instructions.
- You're seing a view that shows F, R, and U faces.
- The cube is in a valid state, there is no trickery.
- Assume you can find the solution by only seeing 3 faces. If you think you need more, use your intuition to assume the simplest case.
- You can't write or evaluate code to solve things, only use your visual intelligence and reasoning.
- Only respond with the algorithm itself after reasoning, no additional information or explanation.
- If you still think the cube is in an invalid state, you're probably seeing things wrong. You can give up instead of going in circles, respond with "Q" (invalid move that'll be counted as quit) in this case.

---

"Q" is just an invalid move that'll throw an error and count as a fail.

Some models really struggle with even understanding the visual, so the whole effort becomes wrong and useless from the start. We can have an alternate mode that also gives the state as text, like Top: [Green, Green, While \n Red Red Red \n ...] (obviously scored in a different category than purely visual ones)

IDEA: If they are stuck, they can request some "help" which can give them a slightly different angle or the actual state of the colors / faces, or something like that. That could be cool.

## Difficulty Tiers & Scoring

Models often misread the image and spiral from there. Instead of one mode, use tiers to separate vision ability from reasoning ability:

- **Hard (Vision)**: Image only, no text hints
- **Medium**: Image + text state of the 3 visible faces
- **Easy (Reasoning)**: Image + full text state of all 6 faces

This gives us separate Vision Score vs Reasoning Score on the leaderboard. A model that does well on Medium but poorly on Hard has a vision problem, not a reasoning one.

**I think we can just start with "medium" which is a good balance**. Because most models suck at understanding the picture and their whole effort becomes futile, and "hard" mode becomes useless for most of them.

## Future

Benchmark Ideas

- Open ended algorithm questions
  - Apply a few moves to a solved cube, and ask the model for the moves to solve the cube.
  - We can test which models can go up to 1 move, 2 moves, 3 moves etc.
    - Split it into 3 different test suites: 1 move idents, 2 moves (compose 2 random moves), 3 moves.
  - This is also how we'll do things like OLL since they don't really have common names, and if we want to generalize it to other cases like F2L, or even more advanced algorithms and recognition etc., this approach is more scalable
    - Like, apply the reverse of an OLL, PLL, F2L etc. to generate a case, and ask the model for a solution. Apply the resulting solution to the cube and check whether it solves the case. This way, cases that have different solutions can be tested.
- Multiple choice (These kinda suck, focus on open ended for now)
  - What would be the state of this cube after we do this move
  - Which move or sequence of moves have to be done to go from state A to state B
    - Can identify models that can understand only 1 move, 2 moves, 3+ moves etc.
    - maybe this shouldn't even be multiple choice. just make it open ended

## Data Analysis Ideas

- Showing total cost for a run, and average cost per test case, average tokens spent per test case.
- For each run and case, include the 3D interactive cube so we can see the state of the cube given to the model. Basically make it possible to inspect every case with stuff like the prompt given to the model, the scramble (and 3d interactive cube state), model's answer, expected answer, etc.
- Have a section / tab for each case: PLL Recognition, Simple Scramble etc. Currently we only have results for simple scramble so we can start with that.

### PLL Specific Stuff (Not useful rn because we shifted the focus to simple scrambles)

- The easiest and hardest algorithms: The ones with the highest and lowest correct answers. (T, H, Z, U seem to be easy to recognize)
- The success rate between the base case vs. the AUF and rotated cases.

### Scramble cases
- We sum probably sum up all the results of 1+2+3 move scrambles to get a total score for each model.
- We can dig deeper into how much models fall off as move count increases as a graph 

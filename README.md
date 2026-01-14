# Spherical Snake

Based on original "Snake game on a sphere" by Kevin Albertson (c) 2016. MIT Licensed. this is my forked version of the necessary "MIT copypasta disclaimer" requirement.

![Spherical Snake Gameplay](./gameplay2.gif)


## Main changes

The game is for now some kind of snake-pac-man but the labyrinth is our own tail... ON a sphere!1!!

the snake cannot "bite its own head". hence there's a Cyan "neck"-bead of the snake which marks the start of collision enabled snake body.


## Summary of changes

- Game canvas is bigger. Various parameters were tweaked by hand to achieve this.
- Pause with space bar.
- "WASD" controls.
- Speed UP TURBO with Forwards (W or Up arrow).
- Power UP button. it's not a cheat it's a feature. it's boring to play the "earlier level" repeatedly. Adds +50 pellets to the Snake and the Score


### work in progress, experiments in game UI

- Slow DOWN (holds down toggle with S or Back arrow).
  work in progress.
- "Q" and "E" toggle functionality. Double toggle and two directional-angle registers.

- numbers in the UI. the floating point angle in radians at 3 different rounding levels.


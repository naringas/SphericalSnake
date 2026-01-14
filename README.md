# Spherical Snake

Based on original "Snake game on a sphere" by Kevin Albertson (c) 2016. MIT Licensed. this is my forked version of the necessary "MIT copypasta disclaimer" requirement.

![Spherical Snake Gameplay](./gameplay2.gif)

### incomplete summary of changes

- canvas is bigger. I tweaked various parameters by hand to achieve this.
- Pause with space bar. 
- "WASD" controls.
- "toggle functionality with T" (lazy hacked implementation; I would fail my most stringent code-smell tests). 
- Power UP button. it's not a cheat it's a feature. it's boring to play the "earlier level" repeatedly.
- numbers in the UI. the floating point angle in radians at 3 different rounding levels.

- at the moment the "T" toggle functionality can instantly cause a collision if the instant rotation is bigger than 2.0000...

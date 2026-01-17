# Spherical Snake

Based on original "Snake game on a sphere" by Kevin Albertson (c) 2016. MIT Licensed. this is my forked version of the necessary "MIT copypasta disclaimer" requirement.

TODO: update gameplay webm/gif

# Main changes

The snake cannot "bite its own head". hence there's a Cyan "neck"-pellet of the snake which marks the start of collision enabled snake body.


## Summary of changes

- Game canvas is bigger. Various parameters were tweaked by hand to achieve this.
- Pause with space bar.
- "WASD" controls.
- Speed UP TURBO with Forwards. [🇼] or Up arrow
- Slow DOWN BullTime-style. Hold down [🇸] or Down arrow
  (this simply clicks the ToggleDirection checkbox really fast)

- Toggle direction register:
  When the "hat" is RED, first store the current angle. then change the current direction to 0 (Eastwards, horizontally rightwards). finally change to the GREEN "arrow" mode.
  When the "arrow" is GREEN, first reset the direction to formerly stored angle (displayed as the green-clock hand) and reset the red mode.

- [🇶] & [🇦] Hard Turns:
  Instantly change direction depending on the color/mode/checkbox status:
  in Green mode, Q and E set the direction to UP or DOWN instantly
  in Red mode, Q and E set the direction + or - 90 degrees relative to the snake's motion

- Power UP button. (it's not a cheat it's a feature)
  Adds +50 pellets to the Snake and the Score.


### Rationalistic tale for the fork's changes

All I did is complete the functionality of 'acceleration' (which is in the original game)
with the slowdown _dual_ action. This slowdown was implemented through the "saving the angle" functionality: the original toggle checkbox I forked the game for (but I lie, I forked the game to add the powerup button... but then kept on rolling with the changes)

Holding the toggle key; the back key slams on the breaks in a bullet-time looking slowdown way; but all is happening is the toggle checkbox is getting clicked on really fast.

The toggle is originally a manual action; using the [🇹] key, or clicking the checkbox. Originally I had no idea this was going to be the backbone of the slowdown functionality. I was only investigating angles in radians and floating point numbers.

Eventually, after making a visual for the stored angle (the green clock hand's original intention), I settled on the Red and Green modes with Q and E hard turn shortcuts.

_The checkbox can be though of in various ways: as read/write control for the stored angle; as the red or green mode flag; as controlling what the next click of the toggle will do: 0 or absolute North/South?_

But the digital instantaneous turns enable a sort of conversion between speed now, and empty room later (and viceversa in a head-spinning manner).

_For the snake to change direction without turning is time saving magic to play for longer!_

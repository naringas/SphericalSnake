# Torus Snake (formerly Spherical Snake)

Based on original "Snake game on a sphere" by Kevin Albertson (c) 2016. MIT Licensed. Forked and expanded by naringas.

TODO: update gameplay webm/gif

# Main changes

The game is played on a **3D Torus** (donut) embedded in 3-space:
- Intrinsic toroidal coordinates $(u, v)$ with physical speed normalization via Riemannian metric $ds^2 = (R + r \cos v)^2 du^2 + r^2 dv^2$.
- Centered dynamic tracking: the torus rolls and tumbles under the snake, keeping the head at screen center facing the viewer via the local Darboux orthonormal frame.
- Depth sorting and 3D occlusion: the snake winds around the outer tube, dives through the donut hole, and wraps behind the far side.
- The snake cannot "bite its own head" — cyan "neck"-pellet marks the start of self-collision enabled body.


## Summary of changes

- 3D Torus geometry with major radius $R=1.0$ and tube radius $r=0.45$.
- Game canvas is bigger (800x800). Various parameters tweaked by hand.
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

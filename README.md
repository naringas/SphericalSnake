# Spherical & Torus Snake

Based on original "Snake game on a sphere" by Kevin Albertson (c) 2016. MIT Licensed. Forked and expanded by naringas.

TODO: update gameplay webm/gif

# Game Modes & Stage Select

The game features a **Stage Select** screen before playing, allowing you to choose between two world topologies:

1. **Sphere (Classic S²)**
   - The original finite spherical world with positive curvature ($+1$).
   - Slither around the surface of a 3D rotating globe with horizon curvature and pole-wrapping coordinates.
   - World rotates under the snake head as you navigate.

2. **Torus (3D Donut T²)**
   - Non-Euclidean donut geometry embedded in 3-space.
   - Intrinsic toroidal coordinates $(u, v)$ with physical speed normalization via Riemannian metric $ds^2 = (R + r \cos v)^2 du^2 + r^2 dv^2$.
   - Local Darboux orthonormal frame tracking: keeps head facing forward at screen center.
   - 3D occlusion and depth sorting: snake dives through the donut hole and wraps around the tube and far side.

You can switch stages anytime before starting, during gameplay via the "Select Stage" button, or on the Game Over screen.

# Controls & Mechanics

- **Stage Select**: Press `[1]` for Sphere or `[2]` for Torus (or click on the stage card).
- **Turn**: Left/Right arrows or `[A]` / `[D]`.
- **Turbo**: Up arrow or `[W]`.
- **Pause**: Space bar.
- **Slow DOWN BullTime-style**: Hold down `[S]` or Down arrow (toggles direction register rapidly).
- **Direction Toggle Register**:
  - In Red mode, `[Q]` and `[E]` turn $\pm 90^\circ$ relative to current direction.
  - In Green mode, `[Q]` and `[E]` snap instantly to absolute North / South.
  - Toggle manually with `[T]` or the checkbox.
- **Power UP**: Adds +50 pellets to snake and score.
- **Neck pellet**: The cyan pellet marks the neck; the first 7 nodes do not self-collide to prevent accidental instant deaths.

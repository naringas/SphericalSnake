Things learned:

- Rotating along an axis which is on one of the three standard planes only requires three rotations. E.g. rotating along axis on XY plane of angle A with x axis can be done as follows:

RotateZ (90 - A) to orient axis up
RotateY (amount) to do the rotation
RotateZ (- (90 - A)) to orient axis back

- The motion of the snake is the same as the motion of the world-sphere 🤯
- Torus geometry:
  - Parameterized by toroidal angle $u$ (major circle around donut, radius $R$) and poloidal angle $v$ (minor circle around tube, radius $r$).
  - Metric: $ds^2 = (R + r \cos v)^2 du^2 + r^2 dv^2$. Speed is normalized by metric: $du = \frac{V \cos \theta}{R + r \cos v}$, $dv = \frac{V \sin \theta}{r}$.
  - Snake head is kept centered facing the camera via the local Darboux frame $(T_u, T_v, N)$ where $T_u$ is screen-right (+East), $T_v$ is screen-down (+South), and $N$ points toward the camera. Depth sorting gives 3D occlusion as the snake coils around the front, through the hole, and behind the donut.

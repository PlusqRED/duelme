/** Something a spring moves: where it is and how fast it goes. */
export interface SpringBody {
  at: number;
  vel: number;
}

/** A spring's stiffness and damping: a `zeta` under 1 overshoots a little before it settles, 1 does not. */
export interface SpringConfig {
  k: number;
  zeta: number;
}

/**
 * One frame of a damped spring pulling `body` towards `target`, `dt` seconds long. It takes four
 * small steps rather than one, so a stiff spring stays stable at any frame rate.
 */
export function springStep(body: SpringBody, target: number, { k, zeta }: SpringConfig, dt: number): SpringBody {
  const damping = 2 * zeta * Math.sqrt(k);
  const h = dt / 4;
  let { at, vel } = body;
  for (let i = 0; i < 4; i += 1) {
    vel += (-k * (at - target) - damping * vel) * h;
    at += vel * h;
  }
  return { at, vel };
}

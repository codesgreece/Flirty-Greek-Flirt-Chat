export const motionTokens = {
  fast: 0.08,
  normal: 0.12,
  emphasis: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
  spring: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 },
  cardSpring: { type: "spring" as const, stiffness: 260, damping: 24, mass: 0.9 },
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: motionTokens.normal, ease: motionTokens.ease },
};

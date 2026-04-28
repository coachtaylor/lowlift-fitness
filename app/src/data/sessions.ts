import { SessionType } from '../components/SessionCard';
import { Movement, loadMovements } from './movements';

export type { Movement } from './movements';

export type Session = {
  id: string;
  slug: string;
  type: SessionType;
  name: string;
  movements: Movement[];
};

type SessionTemplate = {
  slug: string;
  type: SessionType;
  name: string;
  movementSlugs: string[];
};

const TEMPLATES: SessionTemplate[] = [
  {
    slug: 'full-body-activation',
    type: 'move',
    name: 'Full Body Activation',
    movementSlugs: [
      'bodyweight-squat',
      'incline-push-up',
      'standing-march',
      'standing-arm-circles',
    ],
  },
  {
    slug: 'lower-body-builder',
    type: 'move',
    name: 'Lower Body Builder',
    movementSlugs: [
      'bodyweight-squat',
      'reverse-lunges',
      'standing-calf-raises',
      'wall-sit',
    ],
  },
  {
    slug: 'core-and-stability',
    type: 'move',
    name: 'Core & Stability',
    movementSlugs: [
      'plank-hold',
      'standing-march',
      'glute-bridge',
      'chair-sit-to-stand',
    ],
  },
  {
    slug: 'desk-relief-flow',
    type: 'stretch',
    name: 'Desk Relief Flow',
    movementSlugs: [
      'neck-stretch',
      'chest-opener',
      'seated-spinal-twist',
      'hip-flexor-stretch',
    ],
  },
  {
    slug: 'lower-body-reset',
    type: 'stretch',
    name: 'Lower Body Reset',
    movementSlugs: [
      'hamstring-stretch',
      'hip-flexor-stretch',
      'seated-spinal-twist',
      'chest-opener',
    ],
  },
  {
    slug: 'quick-reset',
    type: 'both',
    name: 'Quick Reset',
    movementSlugs: [
      'standing-march',
      'bodyweight-squat',
      'incline-push-up',
      'chair-sit-to-stand',
      'chest-opener',
      'neck-stretch',
      'seated-spinal-twist',
    ],
  },
  {
    slug: 'energy-boost',
    type: 'both',
    name: 'Energy Boost',
    movementSlugs: [
      'standing-march',
      'reverse-lunges',
      'bodyweight-squat',
      'standing-arm-circles',
      'hip-flexor-stretch',
      'hamstring-stretch',
      'seated-spinal-twist',
    ],
  },
  {
    slug: 'posture-fix',
    type: 'both',
    name: 'Posture Fix',
    movementSlugs: [
      'standing-arm-circles',
      'chair-sit-to-stand',
      'glute-bridge',
      'plank-hold',
      'chest-opener',
      'seated-spinal-twist',
      'neck-stretch',
    ],
  },
  {
    slug: 'light-strength-and-mobility',
    type: 'both',
    name: 'Light Strength + Mobility',
    movementSlugs: [
      'glute-bridge',
      'standing-calf-raises',
      'chair-sit-to-stand',
      'standing-march',
      'hamstring-stretch',
      'hip-flexor-stretch',
      'neck-stretch',
    ],
  },
  {
    slug: 'full-body-reboot',
    type: 'both',
    name: 'Full Body Reboot',
    movementSlugs: [
      'wall-sit',
      'plank-hold',
      'bodyweight-squat',
      'reverse-lunges',
      'hip-flexor-stretch',
      'chest-opener',
      'hamstring-stretch',
    ],
  },
];

export async function getRandomSession(type: SessionType): Promise<Session | null> {
  const pool = TEMPLATES.filter((t) => t.type === type);
  if (pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return buildSession(pick);
}

async function buildSession(template: SessionTemplate): Promise<Session | null> {
  const catalog = await loadMovements();
  const movements: Movement[] = [];
  for (const slug of template.movementSlugs) {
    const m = catalog.get(slug);
    if (!m) {
      console.warn('[sessions] missing movement slug in catalog:', slug);
      return null;
    }
    movements.push(m);
  }
  return {
    id: template.slug,
    slug: template.slug,
    type: template.type,
    name: template.name,
    movements,
  };
}

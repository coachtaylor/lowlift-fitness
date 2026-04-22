import { SessionType } from '../components/SessionCard';

export type Movement = {
  id: string;
  name: string;
  category: 'move' | 'stretch';
  coachingText: string;
  duration: number;
};

export type Session = {
  id: string;
  type: SessionType;
  name: string;
  movements: Movement[];
};

const moveSession: Session = {
  id: 'move-1',
  type: 'move',
  name: 'Move',
  movements: [
    {
      id: 'standing-march',
      name: 'Standing March',
      category: 'move',
      coachingText:
        "Stand tall, lift one knee, then the other. Keep it light and rhythmic — you're just waking things up.",
      duration: 30,
    },
    {
      id: 'incline-push-up',
      name: 'Incline Push-Up',
      category: 'move',
      coachingText:
        "Hands on your desk, lower your chest toward the surface. Push back up, nice and steady. You're stronger than you think.",
      duration: 40,
    },
    {
      id: 'chair-sit-to-stand',
      name: 'Chair Sit-to-Stand',
      category: 'move',
      coachingText:
        'Stand up from your chair without using your hands, then sit back down slowly. Feel your legs do the work.',
      duration: 35,
    },
    {
      id: 'standing-calf-raises',
      name: 'Standing Calf Raises',
      category: 'move',
      coachingText:
        "Lift your heels off the ground, slow and steady. Feel your calves engage. You're already doing more than most people today.",
      duration: 30,
    },
  ],
};

const stretchSession: Session = {
  id: 'stretch-1',
  type: 'stretch',
  name: 'Stretch',
  movements: [
    {
      id: 'neck-stretch',
      name: 'Neck Stretch',
      category: 'stretch',
      coachingText:
        'Let your right ear drop toward your right shoulder. Breathe. Switch sides when you feel ready.',
      duration: 40,
    },
    {
      id: 'chest-opener',
      name: 'Chest Opener',
      category: 'stretch',
      coachingText:
        'Clasp your hands behind your back and lift gently. Feel your chest open up after all that sitting.',
      duration: 35,
    },
    {
      id: 'seated-spinal-twist',
      name: 'Seated Spinal Twist',
      category: 'stretch',
      coachingText:
        'Sit tall, rotate your torso to one side, rest a hand on the chair. Breathe into the twist. Repeat on the other side.',
      duration: 40,
    },
  ],
};

const bothSession: Session = {
  id: 'both-1',
  type: 'both',
  name: 'Move + Stretch',
  movements: [
    moveSession.movements[0],
    moveSession.movements[1],
    moveSession.movements[3],
    stretchSession.movements[0],
    stretchSession.movements[1],
    stretchSession.movements[2],
  ],
};

export function getSession(type: SessionType): Session {
  switch (type) {
    case 'move':
      return moveSession;
    case 'stretch':
      return stretchSession;
    case 'both':
      return bothSession;
  }
}

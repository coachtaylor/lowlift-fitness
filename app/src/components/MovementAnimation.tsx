import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

/**
 * Bundled looping movement animations, keyed by movement slug.
 *
 * INTERIM SOURCE: assets are bundled in the app for now. The no-rework path is to
 * swap this map for a remote URL read off `movements.animation_url` (Supabase Storage)
 * — this component already takes a slug, so only the resolver below changes.
 */
const ANIMATIONS: Record<string, number> = {
  'bodyweight-squat': require('../../assets/movements/bodyweight-squat.webp'),
  'chair-sit-to-stand': require('../../assets/movements/chair-sit-to-stand.webp'),
  'glute-bridge': require('../../assets/movements/glute-bridge.webp'),
  'incline-push-up': require('../../assets/movements/incline-push-up.webp'),
  'reverse-lunges': require('../../assets/movements/reverse-lunges.webp'),
  'seated-knee-extensions': require('../../assets/movements/seated-knee-extensions.webp'),
  'wall-sit': require('../../assets/movements/wall-sit.webp'),
  'wall-push-hold': require('../../assets/movements/wall-push-hold.webp'),
  'standing-side-leg-raises': require('../../assets/movements/standing-side-leg-raises.webp'),
  'standing-calf-raises': require('../../assets/movements/standing-calf-raises.webp'),
  'side-step-squats': require('../../assets/movements/side-step-squats.webp'),
  'knee-drive-hold': require('../../assets/movements/knee-drive-hold.webp'),
  'bear-plank-hold': require('../../assets/movements/bear-plank-hold.webp'),
  'plank-hold': require('../../assets/movements/plank-hold.webp'),
  'dead-bug': require('../../assets/movements/dead-bug.webp'),
  'chest-opener': require('../../assets/movements/chest-opener.webp'),
  'step-back-reach': require('../../assets/movements/step-back-reach.webp'),
  'standing-march': require('../../assets/movements/standing-march.webp'),
  'standing-arm-circles': require('../../assets/movements/standing-arm-circles.webp'),
  'heel-to-toe-rock': require('../../assets/movements/heel-to-toe-rock.webp'),
  'standing-cross-punches': require('../../assets/movements/standing-cross-punches.webp'),
  'neck-stretch': require('../../assets/movements/neck-stretch.webp'),
  'quad-stretch': require('../../assets/movements/quad-stretch.webp'),
  'seated-spinal-twist': require('../../assets/movements/seated-spinal-twist.webp'),
  'shoulder-stretch': require('../../assets/movements/shoulder-stretch.webp'),
  'side-body-stretch': require('../../assets/movements/side-body-stretch.webp'),
  'wrist-stretch': require('../../assets/movements/wrist-stretch.webp'),
  'cat-cow-stretch': require('../../assets/movements/cat-cow-stretch.webp'),
  'seated-shoulder-rolls': require('../../assets/movements/seated-shoulder-rolls.webp'),
  'forward-fold': require('../../assets/movements/forward-fold.webp'),
  'hamstring-stretch': require('../../assets/movements/hamstring-stretch.webp'),
  'hip-flexor-stretch': require('../../assets/movements/hip-flexor-stretch.webp'),
  'childs-pose': require('../../assets/movements/childs-pose.webp'),
  'push-up': require('../../assets/movements/push-up.webp'),
  'sit-up': require('../../assets/movements/sit-up.webp'),
  'burpee': require('../../assets/movements/burpee.webp'),
};

export function hasMovementAnimation(slug: string): boolean {
  return slug in ANIMATIONS;
}

type Props = {
  slug: string;
  /** Square edge length in px (the stage is square). */
  size: number;
  /** Visually de-emphasize (e.g. countdown / paused). */
  dimmed?: boolean;
};

/**
 * Renders a movement's looping illustration on the off-white stage.
 * expo-image plays animated WebP automatically and caches it.
 * Falls back to a calm figure placeholder for movements without art yet.
 */
function MovementAnimationBase({ slug, size, dimmed = false }: Props) {
  const source = ANIMATIONS[slug];
  const opacity = dimmed ? 0.32 : 1;

  if (source == null) {
    // Placeholder: a soft "person" silhouette so the stage still reads intentional.
    return (
      <View style={[styles.fill, { opacity }]} pointerEvents="none">
        <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 100 100">
          <Circle cx="50" cy="30" r="16" fill={colors.dustyBlueLight} />
          <Rect x="26" y="52" width="48" height="46" rx="22" fill={colors.dustyBlueLight} />
        </Svg>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[styles.fill, { width: size, height: size, opacity }]}
      contentFit="contain"
      transition={150}
      // animated WebP loops on its own; this just keeps decoding cheap
      cachePolicy="memory-disk"
      accessibilityLabel={`${slug} demonstration`}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Memoized so the per-second timer ticks in the player don't re-render the animation.
export const MovementAnimation = memo(MovementAnimationBase);

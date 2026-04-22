import { useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { PromiseScreen } from './PromiseScreen';
import { WelcomeScreen } from './WelcomeScreen';

type Props = {
  onComplete: () => void;
};

const { width: SCREEN_W } = Dimensions.get('window');

export function OnboardingFlow({ onComplete }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const goToPromise = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_W,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.track,
          {
            width: SCREEN_W * 2,
            transform: [{ translateX }],
            opacity,
          },
        ]}
      >
        <View style={[styles.screen, { width: SCREEN_W }]}>
          <WelcomeScreen onContinue={goToPromise} />
        </View>
        <View style={[styles.screen, { width: SCREEN_W }]}>
          <PromiseScreen onContinue={onComplete} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  screen: {
    flex: 1,
  },
});

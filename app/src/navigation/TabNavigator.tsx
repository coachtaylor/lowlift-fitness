import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, Home, Target } from 'lucide-react-native';
import { DailyChallenge } from '../data/dailyChallenge';
import { CompletedSession } from '../data/history';
import { Session } from '../data/sessions';
import { ChallengeScreen } from '../screens/ChallengeScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator();

type Props = {
  history: CompletedSession[];
  favoriteSlugs: Set<string>;
  favoriteSessions: Session[];
  onToggleFavorite: (sessionId: string) => void;
  onStartFavorite: (sessionId: string) => void;
  onStart: () => void;
  challenge: DailyChallenge | null;
  onSetupChallenge: () => void;
  onStartChallengeSession: () => void;
  onEditChallenge: () => void;
  onChallengeUpdated: (next: DailyChallenge) => void;
};

export default function TabNavigator({
  history,
  favoriteSlugs,
  favoriteSessions,
  onToggleFavorite,
  onStartFavorite,
  onStart,
  challenge,
  onSetupChallenge,
  onStartChallengeSession,
  onEditChallenge,
  onChallengeUpdated,
}: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      >
        {({ navigation }) => (
          <DashboardScreen
            history={history}
            favoriteSlugs={favoriteSlugs}
            favoriteSessions={favoriteSessions}
            onToggleFavorite={onToggleFavorite}
            onStartFavorite={onStartFavorite}
            onStart={onStart}
            challenge={challenge}
            onNavigateToChallenge={() => navigation.navigate('ChallengeTab')}
            onSetupChallenge={() => navigation.navigate('ChallengeTab')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="ChallengeTab"
        options={{
          tabBarLabel: 'Challenge',
          tabBarIcon: ({ color }) => <Target size={22} color={color} />,
        }}
      >
        {({ navigation }) => (
          <ChallengeScreen
            challenge={challenge}
            onSetupChallenge={onSetupChallenge}
            onStartChallengeSession={onStartChallengeSession}
            onEditChallenge={onEditChallenge}
            onSeeProgress={() => navigation.navigate('ProgressTab')}
            onChallengeUpdated={onChallengeUpdated}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="ProgressTab"
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
        }}
      >
        {({ navigation }) => (
          <ProgressScreen
            history={history}
            favoriteSlugs={favoriteSlugs}
            onToggleFavorite={onToggleFavorite}
            challenge={challenge}
            onStart={onStart}
            onNavigateToChallenge={() => navigation.navigate('ChallengeTab')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

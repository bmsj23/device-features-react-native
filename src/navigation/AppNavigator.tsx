import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AddTravelEntryScreen } from '../screens/AddTravelEntryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { StampDetailsScreen } from '../screens/StampDetailsScreen';
import { useAppTheme } from '../state/AppProvider';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontFamily: theme.typography.display,
          fontSize: 22,
          fontWeight: '700',
        },
        headerRight: () => <ThemeToggleButton />,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Travel Diary',
        }}
      />
      <Stack.Screen
        name="AddEntry"
        component={AddTravelEntryScreen}
        options={{
          title: 'Add Travel Entry',
        }}
      />
      <Stack.Screen
        name="StampDetails"
        component={StampDetailsScreen}
        options={{
          title: 'Stamp Details',
        }}
      />
    </Stack.Navigator>
  );
}

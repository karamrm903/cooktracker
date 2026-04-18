import 'react-native-url-polyfill/auto';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { GoogleSignin } from '@react-native-google-signin/google-signin';
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SavedMealsProvider } from './src/context/SavedMealsContext';
import { MealLogsProvider } from './src/context/MealLogsContext';

import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAuthSession,
  setOnboardingStatus,
  setHydrated,
  setPersistedAccessToken,
} from './src/store/slices/authSlice';
import { clearAuthAccessToken, readAuthAccessToken, saveAuthAccessToken } from './src/lib/authStorage';

import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import UserSetupScreen from './src/screens/UserSetupScreen';
import AppleHealthScreen from './src/screens/AppleHealthScreen';
import CalorieRolloverScreen from './src/screens/CalorieRolloverScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import SocialProofScreen from './src/screens/SocialProofScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import AccountCreationScreen from './src/screens/AccountCreationScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import SavedMealsScreen from './src/screens/SavedMealsScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendDetailScreen from './src/screens/FriendDetailScreen';
import CaloriesScreen from './src/screens/CaloriesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PlanScreen from './src/screens/PlanScreen';
import AnalyzingScreen from './src/screens/AnalyzingScreen';
import RecipeSummaryScreen from './src/screens/RecipeSummaryScreen';
import CookingModeScreen from './src/screens/CookingModeScreen';
import LogMealScreen from './src/screens/LogMealScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function AuthStateWrapper({ children }) {
  const dispatch = useDispatch();

  React.useEffect(() => {
    async function loadState() {
      try {
        const onboardingComplete = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (onboardingComplete === 'true') {
          dispatch(setOnboardingStatus(true));
        }

        const storedToken = await readAuthAccessToken();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          if (!storedToken) {
            await supabase.auth.signOut();
            dispatch(setAuthSession(null));
            dispatch(setPersistedAccessToken(null));
          } else if (storedToken !== session.access_token) {
            await saveAuthAccessToken(session.access_token);
            dispatch(setPersistedAccessToken(session.access_token));
            dispatch(setAuthSession({ user: session.user, session }));
          } else {
            dispatch(setPersistedAccessToken(storedToken));
            dispatch(setAuthSession({ user: session.user, session }));
          }
        } else {
          if (storedToken) {
            await clearAuthAccessToken();
          }
          dispatch(setPersistedAccessToken(null));
          dispatch(setAuthSession(null));
        }
      } catch (err) {
        console.error("Error hydrating auth state", err);
      } finally {
        dispatch(setHydrated());
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession) {
          await clearAuthAccessToken();
          dispatch(setPersistedAccessToken(null));
          dispatch(setAuthSession(null));
          dispatch(setOnboardingStatus(false));
          return;
        }

        dispatch(setAuthSession({ user: newSession.user, session: newSession }));

        if (event === 'TOKEN_REFRESHED' && newSession.access_token) {
          const existing = await readAuthAccessToken();
          if (existing) {
            await saveAuthAccessToken(newSession.access_token);
            dispatch(setPersistedAccessToken(newSession.access_token));
          }
        }
      });
    }
    loadState();
  }, []);

  return children;
}

// ── Screens where the theme toggle is visible ──────────────────────────────────
const TOGGLE_ALLOWED = new Set(['Welcome', 'Dashboard', 'Explore', 'Friends', 'Calories', 'Profile']);

// ── Theme toggle overlay — rendered OUTSIDE AppContent so LayoutAnimation
//    calls inside screens never affect its position ────────────────────────────
function FloatingThemeToggle({ routeName }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!TOGGLE_ALLOWED.has(routeName)) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[
          ftt.btn,
          {
            top: insets.top + 8,
            backgroundColor: colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.14)' : colors.border,
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={15} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const ftt = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
});

// ── Tab navigator ──────────────────────────────────────────────────────────────
function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom - 14, 4);
  const tabBarHeight = 56 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Explore: focused ? 'compass' : 'compass-outline',
            Friends: focused ? 'people' : 'people-outline',
            Calories: focused ? 'flame' : 'flame-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Calories" component={CaloriesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Navigation shell — conditonal routing ────────────────────────────
function AppContent({ onRouteChange }) {
  const { isDark } = useTheme();
  const { isHydrated, session, persistedAccessToken } = useSelector(
    (state) => state.auth
  );

  const canAccessMain =
    !!session?.access_token &&
    !!persistedAccessToken &&
    persistedAccessToken === session.access_token;

  if (!isHydrated) {
    return <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer key={canAccessMain ? 'main' : 'auth'} ref={navigationRef} onReady={onRouteChange} onStateChange={onRouteChange}>
        {canAccessMain ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="FriendDetail" component={FriendDetailScreen} />
            <Stack.Screen name="Plan" component={PlanScreen} />
            <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
            <Stack.Screen name="RecipeSummary" component={RecipeSummaryScreen} />
            <Stack.Screen name="LogMeal" component={LogMealScreen} />
            <Stack.Screen name="CookingMode" component={CookingModeScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="UserSetup" component={UserSetupScreen} />
            <Stack.Screen name="AppleHealth" component={AppleHealthScreen} />
            <Stack.Screen name="CalorieRollover" component={CalorieRolloverScreen} />
            <Stack.Screen name="Referral" component={ReferralScreen} />
            <Stack.Screen name="SocialProof" component={SocialProofScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </>
  );
}

// ── Root — routeName lives here so FloatingThemeToggle is a true sibling ──────
export default function App() {

  const [routeName, setRouteName] = useState('Welcome');

  const onRouteChange = useCallback(() => {
    const current = navigationRef.getCurrentRoute()?.name;
    if (current) setRouteName(current);
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SavedMealsProvider>
            <MealLogsProvider>
              <AuthStateWrapper>
                <AppContent onRouteChange={onRouteChange} />
                <FloatingThemeToggle routeName={routeName} />
              </AuthStateWrapper>
            </MealLogsProvider>
          </SavedMealsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
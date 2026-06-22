import "react-native-url-polyfill/auto";
import { enableScreens } from "react-native-screens";
enableScreens();

import { GoogleSignin } from "@react-native-google-signin/google-signin";
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

// RevenueCat: configure with the platform-specific public SDK key.
// iOS key starts with "appl_", Android key starts with "goog_".
// Skip init if the Android key hasn't been filled in yet (prevents SDK crash).
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
const RC_KEY = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
  : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
if (RC_KEY && !RC_KEY.startsWith('TODO')) {
  Purchases.configure({ apiKey: RC_KEY });
}

import React, { useState, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

const TAB_ICONS = {
  Dashboard: require("./assets/pngs/home.png"),
  Explore: require("./assets/pngs/compass.png"),
  Profile: require("./assets/pngs/profile.png"),
};
const TAB_ACTIVE = "#FF8A45";
const TAB_INACTIVE = "#7C6F64";
import { supabase } from "./src/lib/supabase";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./src/lib/navigationRef";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { LanguageProvider, useLanguage } from "./src/context/LanguageContext";
import { SavedMealsProvider } from "./src/context/SavedMealsContext";
import { MealLogsProvider } from "./src/context/MealLogsContext";
import { ExploreProvider } from "./src/context/ExploreContext";
import "./src/i18n";
import { profileService } from "./src/services/profile.service";
import { useSubscription, useSubscriptionSync } from "./src/hooks/useSubscription";
import { SUPPORTED_LANGUAGES } from "./src/i18n";

import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./src/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setAuthSession,
  setOnboardingStatus,
  setHydrated,
  setPersistedAccessToken,
} from "./src/store/slices/authSlice";
import {
  clearAuthAccessToken,
  readAuthAccessToken,
  saveAuthAccessToken,
} from "./src/lib/authStorage";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import UserSetupScreen from "./src/screens/UserSetupScreen";
import AppleHealthScreen from "./src/screens/AppleHealthScreen";
import CalorieRolloverScreen from "./src/screens/CalorieRolloverScreen";
import ReferralScreen from "./src/screens/ReferralScreen";
import SocialProofScreen from "./src/screens/SocialProofScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import AccountCreationScreen from "./src/screens/AccountCreationScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import OtpVerificationScreen from "./src/screens/OtpVerificationScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ExploreScreen from "./src/screens/ExploreScreen";
import RecipeListScreen from "./src/screens/RecipeListScreen";
import SavedMealsScreen from "./src/screens/SavedMealsScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import FriendDetailScreen from "./src/screens/FriendDetailScreen";
import CaloriesScreen from "./src/screens/CaloriesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PlanScreen from "./src/screens/PlanScreen";
import AnalyzingScreen from "./src/screens/AnalyzingScreen";
import RecipeSummaryScreen from "./src/screens/RecipeSummaryScreen";
import CookingModeScreen from "./src/screens/CookingModeScreen";
import LogMealScreen from "./src/screens/LogMealScreen";
import SearchFoodScreen from "./src/screens/SearchFoodScreen";
import FoodDetailScreen from "./src/screens/FoodDetailScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import ManageSubscriptionScreen from "./src/screens/ManageSubscriptionScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStateWrapper({ children }) {
  const dispatch = useDispatch();
  const { setLanguage } = useLanguage();

  React.useEffect(() => {
    async function loadState() {
      try {
        const onboardingComplete = await AsyncStorage.getItem(
          "hasCompletedOnboarding"
        );
        if (onboardingComplete === "true") {
          dispatch(setOnboardingStatus(true));
        }

        const storedToken = await readAuthAccessToken();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          if (!storedToken) {
            await supabase.auth.signOut();
            dispatch(setAuthSession(null));
            dispatch(setPersistedAccessToken(null));
          } else if (storedToken !== session.access_token) {
            await saveAuthAccessToken(session.access_token);
            dispatch(setPersistedAccessToken(session.access_token));
            dispatch(setAuthSession({ user: session.user, session }));
            syncLocaleFromProfile(session);
          } else {
            dispatch(setPersistedAccessToken(storedToken));
            dispatch(setAuthSession({ user: session.user, session }));
            syncLocaleFromProfile(session);
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
        if (event === "SIGNED_OUT" || !newSession) {
          await clearAuthAccessToken();
          dispatch(setPersistedAccessToken(null));
          dispatch(setAuthSession(null));
          dispatch(setOnboardingStatus(false));
          // Only log out of RC if user was actually logged in (has a named ID, not anonymous)
          try {
            const info = await Purchases.getCustomerInfo();
            if (!info.originalAppUserId.startsWith('$RCAnonymousID')) {
              await Purchases.logOut();
            }
          } catch { }
          return;
        }

        // Log RevenueCat in with the Supabase user ID so purchases are tied to the user
        if (event === 'SIGNED_IN' && newSession.user?.id) {
          await Purchases.logIn(newSession.user.id).catch(err => {
            console.warn('[RevenueCat] logIn failed:', err.message);
          });
        }

        // After verifying a password-recovery OTP, route the user to the
        // ResetPassword screen rather than the regular post-login destination.
        if (event === 'PASSWORD_RECOVERY' && navigationRef.isReady()) {
          navigationRef.reset({ index: 0, routes: [{ name: 'ResetPassword' }] });
        }

        dispatch(
          setAuthSession({ user: newSession.user, session: newSession })
        );

        // Keep Supabase Realtime authorized with the latest JWT so the
        // RLS-filtered subscription channel keeps receiving the user's row updates.
        if (newSession.access_token) {
          try {
            supabase.realtime.setAuth(newSession.access_token);
          } catch (err) {
            console.warn("[Realtime] setAuth failed:", err.message);
          }
        }

        if (event === "TOKEN_REFRESHED" && newSession.access_token) {
          const existing = await readAuthAccessToken();
          if (existing) {
            await saveAuthAccessToken(newSession.access_token);
            dispatch(setPersistedAccessToken(newSession.access_token));
          }
        }
      });
    }
    async function syncLocaleFromProfile(session) {
      try {
        const profile = await profileService.getProfile(session);
        if (profile?.locale && SUPPORTED_LANGUAGES.includes(profile.locale)) {
          await setLanguage(profile.locale);
        }
      } catch (err) {
        // Non-critical — local language preference stays
        console.warn("[AuthStateWrapper] locale sync failed:", err.message);
      }
    }

    loadState();
  }, []);

  return children;
}

// ── Screens where the theme toggle is visible ──────────────────────────────────
const TOGGLE_ALLOWED = new Set([
  "Dashboard",
  "Explore",
  "Friends",
  "Calories",
  "Profile",
]);

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
            borderColor: isDark ? "rgba(255,255,255,0.14)" : colors.border,
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isDark ? "sunny" : "moon"}
          size={15}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const ftt = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
});

// ── Custom floating tab bar ─────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tb.wrap,
        {
          backgroundColor: colors.background,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 10,
        },
      ]}
    >
      <View
        style={[
          tb.bar,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : "#FEEBDD",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.tabBarLabel ?? route.name;
          const color = focused ? TAB_ACTIVE : TAB_INACTIVE;
          const pngIcon = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={tb.tab}
              onPress={onPress}
              activeOpacity={0.75}
            >
              {pngIcon ? (
                <Image source={pngIcon} style={[tb.icon, { tintColor: color }]} resizeMode="contain" />
              ) : (
                <Ionicons
                  name={focused ? "diamond" : "diamond-outline"}
                  size={22}
                  color={color}
                />
              )}
              <Text style={[tb.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
              <View style={[tb.dot, focused && { backgroundColor: TAB_ACTIVE }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  icon: { width: 24, height: 24 },
  label: { fontSize: 12, fontWeight: "600" },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "transparent" },
});

// ── Tab navigator ──────────────────────────────────────────────────────────────
function MainTabs() {
  // Premium tab is only shown to users without an active subscription/trial.
  // Gated on hasResolved so it never flashes before the first real status sync
  // (avoids show-then-hide on relaunch). When a purchase lands, isSubscribed
  // flips and the tab unmounts automatically.
  const { isSubscribed, hasResolved } = useSubscription();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      {/* <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Calories" component={CaloriesScreen} /> */}
      {hasResolved && !isSubscribed && (
        <Tab.Screen
          name="Premium"
          component={SubscriptionScreen}
          options={{ tabBarLabel: "Premium" }}
        />
      )}
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

  // Single source of subscription syncing for the whole app (mount once here).
  // Every other consumer reads state via the read-only useSubscription().
  useSubscriptionSync();

  const canAccessMain =
    !!session?.access_token &&
    !!persistedAccessToken &&
    persistedAccessToken === session.access_token;

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer
        key={canAccessMain ? "main" : "auth"}
        ref={navigationRef}
        onReady={onRouteChange}
        onStateChange={onRouteChange}
      >
        {canAccessMain ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="FriendDetail" component={FriendDetailScreen} />
            <Stack.Screen name="Plan" component={PlanScreen} />
            <Stack.Screen name="RecipeList" component={RecipeListScreen} />
            <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
            <Stack.Screen
              name="RecipeSummary"
              component={RecipeSummaryScreen}
            />
            <Stack.Screen name="LogMeal" component={LogMealScreen} />
            <Stack.Screen name="SearchFood" component={SearchFoodScreen} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="CookingMode" component={CookingModeScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="UserSetup" component={UserSetupScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="UserSetup" component={UserSetupScreen} />
            <Stack.Screen name="AppleHealth" component={AppleHealthScreen} />
            <Stack.Screen
              name="CalorieRollover"
              component={CalorieRolloverScreen}
            />
            <Stack.Screen name="Referral" component={ReferralScreen} />
            <Stack.Screen name="SocialProof" component={SocialProofScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen
              name="AccountCreation"
              component={AccountCreationScreen}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </View>
  );
}

// ── Root — routeName lives here so FloatingThemeToggle is a true sibling ──────
export default function App() {
  const [routeName, setRouteName] = useState("Welcome");

  const onRouteChange = useCallback(() => {
    const current = navigationRef.getCurrentRoute()?.name;
    if (current) setRouteName(current);
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SavedMealsProvider>
              <MealLogsProvider>
                <ExploreProvider>
                  <AuthStateWrapper>
                    <AppContent onRouteChange={onRouteChange} />
                    {/* <FloatingThemeToggle routeName={routeName} /> */}
                  </AuthStateWrapper>
                </ExploreProvider>
              </MealLogsProvider>
            </SavedMealsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

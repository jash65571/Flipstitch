import { AtkinsonHyperlegibleNext_400Regular } from "@expo-google-fonts/atkinson-hyperlegible-next/400Regular";
import { AtkinsonHyperlegibleNext_500Medium } from "@expo-google-fonts/atkinson-hyperlegible-next/500Medium";
import { AtkinsonHyperlegibleNext_600SemiBold } from "@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold";
import { AtkinsonHyperlegibleNext_700Bold } from "@expo-google-fonts/atkinson-hyperlegible-next/700Bold";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { Fraunces_800ExtraBold } from "@expo-google-fonts/fraunces/800ExtraBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import { PlaytestGate } from "@/playtest/PlaytestGate";
import { PlaytestProvider } from "@/playtest/PlaytestProvider";
import { ProgressProvider } from "@/progress/ProgressProvider";
import { SettingsProvider } from "@/settings/SettingsProvider";
import { colors } from "@/theme/tokens";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.linen).catch(() => undefined);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SettingsProvider>
      <PlaytestProvider>
        <FeedbackProvider>
          <ProgressProvider>
            <StatusBar style="dark" />
            {/* Pass-through in the normal build; the consent gate only exists
                in a playtest build (src/playtest/PlaytestGate.tsx). */}
            <PlaytestGate>
              <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? "none" : "fade", contentStyle: { backgroundColor: colors.linen } }} />
            </PlaytestGate>
          </ProgressProvider>
        </FeedbackProvider>
      </PlaytestProvider>
    </SettingsProvider>
  );
}

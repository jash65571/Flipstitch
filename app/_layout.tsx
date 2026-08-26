import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.linen} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.linen } }} />
    </>
  );
}

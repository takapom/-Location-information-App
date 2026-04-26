import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
    </RepositoryProvider>
  );
}

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { PresenceProvider } from "@/lib/realtime/PresenceProvider";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RepositoryProvider>
        <PresenceProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
        </PresenceProvider>
      </RepositoryProvider>
    </AuthProvider>
  );
}

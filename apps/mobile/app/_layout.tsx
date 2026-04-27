import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RepositoryProvider } from "@/lib/repositories/RepositoryProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RepositoryProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
      </RepositoryProvider>
    </AuthProvider>
  );
}

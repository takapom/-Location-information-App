import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { HomeMapScreen } from "@/features/map/components/HomeMapScreen";

export default function MapRoute() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.enabled && !auth.loading && !auth.session) {
      router.replace("/login");
    }
  }, [auth.enabled, auth.loading, auth.session]);

  if (auth.enabled && (auth.loading || !auth.session)) {
    return null;
  }

  return <HomeMapScreen />;
}

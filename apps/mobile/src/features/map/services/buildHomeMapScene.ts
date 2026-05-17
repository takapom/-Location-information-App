import type { FriendPresence, FriendTerritory, GeoPoint, TerritoryColor, TerritoryGeometry, UserProfile } from "@terri/shared";
import { colors } from "@/theme/tokens";
import type { MapFriendMarker, MapPrivacyLabel, MapScene, MapTerritoryFeature } from "@/components/map/mapTypes";
import { friendTerritoryToMapFeature } from "@/components/map/scene/mapSceneDefaults";
import { formatPresenceUpdatedAt } from "@/features/friends/presence";

export type BuildHomeMapSceneInput = {
  profile?: UserProfile;
  friends: FriendPresence[];
  friendTerritories: FriendTerritory[];
  currentLocation?: GeoPoint;
  activeFriendCount: number;
  isLive: boolean;
  showRoute: boolean;
  attribution: string;
  livePreviewGeometry?: TerritoryGeometry;
  ownFinalTerritoryGeometries?: TerritoryGeometry[];
  trackingRoute?: GeoPoint[];
  privacyLabel?: MapPrivacyLabel;
  fallbackPlaceLabel?: string;
};

export function buildHomeMapScene(input: BuildHomeMapSceneInput): MapScene {
  const selfColor = input.profile?.territoryColor ?? colors.coral;

  return {
    viewport: {
      center: input.currentLocation,
      currentLocation: input.currentLocation,
      followMode: "autoUntilUserMoves"
    },
    user: {
      marker: {
        initials: input.profile?.initials ?? "U",
        color: selfColor
      }
    },
    layers: {
      ownFinalTerritories: (input.ownFinalTerritoryGeometries ?? []).map((geometry, index) => ({
        id: `own-final-${index}`,
        userId: input.profile?.id,
        displayName: input.profile?.name,
        color: selfColor,
        geometry
      })),
      friendFinalTerritories: input.friendTerritories.map(friendTerritoryToMapFeature),
      livePreview: buildLivePreviewLayer({
        isLive: input.isLive,
        currentLocation: input.currentLocation,
        color: selfColor,
        geometry: input.livePreviewGeometry
      }),
      trackingRoute:
        input.showRoute && input.trackingRoute && input.trackingRoute.length > 0
          ? {
              id: "tracking-route",
              color: selfColor,
              coordinates: input.trackingRoute
            }
          : undefined,
      friends: input.friends.flatMap(friendPresenceToMapMarker)
    },
    chrome: {
      placeLabel: input.currentLocation ? "現在地" : input.fallbackPlaceLabel ?? "Shibuya",
      activeFriendCount: input.activeFriendCount,
      privacyLabel: input.privacyLabel ?? "確認中",
      attribution: input.attribution
    }
  };
}

function buildLivePreviewLayer(input: {
  isLive: boolean;
  currentLocation?: GeoPoint;
  color: TerritoryColor;
  geometry?: TerritoryGeometry;
}): MapTerritoryFeature | undefined {
  if (!input.isLive) return undefined;
  if (input.geometry) {
    return {
      id: "live-preview",
      color: input.color,
      geometry: input.geometry
    };
  }

  return undefined;
}

function friendPresenceToMapMarker(friend: FriendPresence): MapFriendMarker[] {
  if (!friend.locationSharingEnabled || !friend.position) return [];

  return [
    {
      id: friend.id,
      displayName: friend.displayName,
      initials: friend.initials,
      color: friend.color,
      totalAreaKm2: friend.totalAreaKm2,
      isActive: friend.isActive,
      updatedLabel: formatPresenceUpdatedAt(friend),
      latitude: friend.position.latitude,
      longitude: friend.position.longitude
    }
  ];
}

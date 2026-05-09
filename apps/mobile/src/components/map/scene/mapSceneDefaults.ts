import type { FriendTerritory, GeoPoint } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { buildTrackingRoute, buildTerritoryPolygons, SHIBUYA_CENTER, type LatLngTuple } from "../mapGeometry";
import type { MapScene, MapSelfMarker, MapTerritoryFeature, MapRouteFeature } from "./mapSceneTypes";

const DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors";

export const defaultSelfMarker: MapSelfMarker = {
  initials: "U",
  color: colors.coral
};

export function buildMapSceneFromLegacyProps(input: {
  center?: GeoPoint;
  currentLocation?: GeoPoint;
  currentUser?: MapSelfMarker;
  friends?: MapScene["layers"]["friends"];
  friendTerritories?: FriendTerritory[];
  activeFriendCount?: number;
  live?: boolean;
  showRoute?: boolean;
  attribution?: string;
}): MapScene {
  const center = input.center ?? input.currentLocation;
  const currentUser = input.currentUser ?? defaultSelfMarker;

  return {
    viewport: {
      center,
      currentLocation: input.currentLocation,
      followMode: "autoUntilUserMoves"
    },
    user: {
      marker: currentUser
    },
    layers: {
      ownFinalTerritories: [],
      friendFinalTerritories: (input.friendTerritories ?? []).map(friendTerritoryToMapFeature),
      livePreview: input.live ? buildPlaceholderLivePreviewFeature(center, currentUser.color) : undefined,
      trackingRoute: input.showRoute ? buildPlaceholderTrackingRoute(center, currentUser.color) : undefined,
      friends: input.friends ?? []
    },
    chrome: {
      placeLabel: input.currentLocation ? "現在地" : "Shibuya",
      activeFriendCount: input.activeFriendCount ?? 0,
      privacyLabel: "FRIENDS ONLY",
      attribution: input.attribution ?? DEFAULT_ATTRIBUTION
    }
  };
}

export function friendTerritoryToMapFeature(territory: FriendTerritory): MapTerritoryFeature {
  return {
    id: territory.id,
    userId: territory.friendUserId,
    displayName: territory.displayName,
    color: territory.color,
    areaKm2: territory.areaKm2,
    geometry: territory.polygon
  };
}

export function buildPlaceholderLivePreviewFeature(center: GeoPoint | undefined, color = colors.coral): MapTerritoryFeature {
  const polygon = buildTerritoryPolygons(toLatLngTuple(center)).preview;
  const closedPolygon = closeRing(polygon);
  return {
    id: "live-preview-placeholder",
    color,
    geometry: {
      type: "Polygon",
      coordinates: [closedPolygon.map(([latitude, longitude]) => [longitude, latitude])]
    }
  };
}

export function buildPlaceholderTrackingRoute(center: GeoPoint | undefined, color = colors.coral): MapRouteFeature {
  return {
    id: "tracking-route-placeholder",
    color,
    coordinates: buildTrackingRoute(toLatLngTuple(center)).map(([latitude, longitude]) => ({ latitude, longitude }))
  };
}

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function closeRing(ring: LatLngTuple[]): LatLngTuple[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

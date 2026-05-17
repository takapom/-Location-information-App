import type { FriendTerritory, GeoPoint } from "@terri/shared";
import type { MapFriendMarker, MapScene, MapSelfMarker } from "./scene/mapSceneTypes";

export type { MapFriendMarker, MapPrivacyLabel, MapRouteFeature, MapScene, MapSelfMarker, MapTerritoryFeature } from "./scene/mapSceneTypes";

export type MapSurfaceProps = {
  scene?: MapScene;
  center?: GeoPoint;
  currentLocation?: GeoPoint;
  currentUser?: MapSelfMarker;
  friends?: MapFriendMarker[];
  friendTerritories?: FriendTerritory[];
  activeFriendCount?: number;
  live?: boolean;
  showRoute?: boolean;
  onFriendMarkerPress?: (friendId: string) => void;
};

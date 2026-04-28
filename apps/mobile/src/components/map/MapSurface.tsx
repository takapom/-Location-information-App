import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FriendTerritory, GeoPoint, TerritoryColor } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { colors, font } from "@/theme/tokens";
import { latLngToScreenPoint, projectTerritoryGeometryBounds, type LatLngTuple } from "./mapGeometry";
import type { MapFriendMarker, MapSelfMarker } from "./mapTypes";

type TerritoryLayer = {
  id: string;
  color: TerritoryColor;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: string;
};

const territoryLayers: TerritoryLayer[] = [
  { id: "mine-main", color: colors.coral, x: 8, y: 42, width: 68, height: 32, rotate: "-10deg" },
  { id: "mine-top", color: colors.coral, x: 45, y: 30, width: 42, height: 28, rotate: "20deg" }
];

const defaultSelfMarker: MapSelfMarker = {
  initials: "U",
  color: colors.coral
};

export const MapSurface = memo(function MapSurface({
  center,
  currentLocation,
  currentUser = defaultSelfMarker,
  friends = [],
  friendTerritories = [],
  activeFriendCount = 0,
  live = false,
  showRoute = false
}: {
  center?: GeoPoint;
  currentLocation?: GeoPoint;
  currentUser?: MapSelfMarker;
  friends?: MapFriendMarker[];
  friendTerritories?: FriendTerritory[];
  activeFriendCount?: number;
  live?: boolean;
  showRoute?: boolean;
}) {
  const mapCenter = toLatLngTuple(center);

  return (
    <View style={styles.map} testID="map-surface">
      <MapRoads />
      {territoryLayers.map((layer) => (
        <View
          key={layer.id}
          style={[
            styles.territory,
            {
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              backgroundColor: `${layer.color}55`,
              borderColor: layer.color,
              transform: [{ rotate: layer.rotate ?? "0deg" }]
            }
          ]}
        />
      ))}
      {friendTerritories.map((territory) => {
        const bounds = projectTerritoryGeometryBounds(territory.polygon, mapCenter);

        return (
          <View
            key={territory.id}
            style={[
              styles.friendTerritory,
              {
                left: `${bounds.left}%`,
                top: `${bounds.top}%`,
                width: `${bounds.width}%`,
                height: `${bounds.height}%`,
                backgroundColor: `${territory.color}33`,
                borderColor: territory.color
              }
            ]}
            testID={`friend-territory-${territory.id}`}
          />
        );
      })}
      {showRoute ? <View style={styles.route} /> : null}
      <Text style={styles.place}>{currentLocation ? "現在地" : "Shibuya"}</Text>
      {!live ? (
        <View style={styles.activePill}>
          <Text style={styles.activeText}>{`${activeFriendCount} 人が今アクティブ 🔥`}</Text>
        </View>
      ) : null}
      {currentLocation ? (
        <View style={[styles.currentLocationMarker, positionForPoint(currentLocation, mapCenter)]}>
          <Avatar initials={currentUser.initials} color={currentUser.color} size={58} active />
        </View>
      ) : null}
      {friends.map((friend) => {
        const point = latLngToScreenPoint({ latitude: friend.latitude, longitude: friend.longitude }, mapCenter);

        return (
          <View key={friend.id} style={[styles.marker, { left: `${point.x}%`, top: `${point.y}%` }]}>
            <Avatar initials={friend.initials} color={friend.color} size={friend.id === "taro" ? 74 : 58} active={friend.isActive} />
          </View>
        );
      })}
    </View>
  );
});

function toLatLngTuple(point?: GeoPoint): LatLngTuple | undefined {
  return point ? [point.latitude, point.longitude] : undefined;
}

function positionForPoint(point: GeoPoint, center?: LatLngTuple) {
  const screenPoint = latLngToScreenPoint(point, center);
  return { left: `${screenPoint.x}%` as const, top: `${screenPoint.y}%` as const };
}

function MapRoads() {
  const roads: Array<{ rotate: string; left: `${number}%`; top: `${number}%`; width: `${number}%` }> = [
    { rotate: "-18deg", left: "7%", top: "14%", width: "105%" },
    { rotate: "22deg", left: "-12%", top: "37%", width: "120%" },
    { rotate: "-35deg", left: "10%", top: "62%", width: "110%" },
    { rotate: "82deg", left: "48%", top: "3%", width: "90%" },
    { rotate: "0deg", left: "0%", top: "72%", width: "110%" }
  ];

  return (
    <>
      <View style={[styles.park, { left: "5%", top: "25%", width: "40%", height: "27%" }]} />
      <View style={[styles.park, { right: "-2%", top: "58%", width: "36%", height: "30%" }]} />
      <View style={[styles.water, { right: "7%", bottom: "10%", transform: [{ rotate: "-18deg" }] }]} />
      {roads.map((road, index) => (
        <View key={index} style={[styles.road, { left: road.left, top: road.top, width: road.width, transform: [{ rotate: road.rotate }] }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.mapBase
  },
  road: {
    position: "absolute",
    height: 24,
    borderRadius: 14,
    backgroundColor: colors.road,
    borderWidth: 2,
    borderColor: "#F8EBC7"
  },
  park: {
    position: "absolute",
    borderRadius: 24,
    backgroundColor: colors.park,
    opacity: 0.8
  },
  water: {
    position: "absolute",
    width: 42,
    height: 260,
    borderRadius: 22,
    backgroundColor: colors.water,
    opacity: 0.8
  },
  territory: {
    position: "absolute",
    borderWidth: 5,
    borderRadius: 18
  },
  friendTerritory: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 10,
    opacity: 0.82
  },
  route: {
    position: "absolute",
    left: "46%",
    top: "36%",
    width: "42%",
    height: "18%",
    borderRadius: 24,
    borderWidth: 10,
    borderColor: `${colors.coral}AA`,
    transform: [{ rotate: "-20deg" }]
  },
  place: {
    position: "absolute",
    left: 24,
    top: 86,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: font.heavy,
    color: colors.ink,
    letterSpacing: 0
  },
  activePill: {
    position: "absolute",
    top: 156,
    alignSelf: "center",
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFD5DF",
    alignItems: "center",
    justifyContent: "center"
  },
  activeText: {
    fontSize: 14,
    fontWeight: font.heavy,
    color: colors.ink
  },
  marker: {
    position: "absolute"
  },
  currentLocationMarker: {
    position: "absolute",
    marginLeft: -29,
    marginTop: -29
  }
});

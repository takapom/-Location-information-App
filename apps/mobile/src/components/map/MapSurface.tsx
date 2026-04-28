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

type MapBlock = {
  id: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: string;
};

type MapLabel = {
  id: string;
  label: string;
  x: number;
  y: number;
};

const territoryLayers: TerritoryLayer[] = [
  { id: "mine-main", color: colors.coral, x: 6, y: 40, width: 70, height: 34, rotate: "-10deg" },
  { id: "mine-top", color: colors.coral, x: 43, y: 28, width: 44, height: 30, rotate: "20deg" },
  { id: "mine-pocket", color: colors.yellow, x: 15, y: 20, width: 28, height: 18, rotate: "14deg" }
];

const mapBlocks: MapBlock[] = [
  { id: "miyashita", color: "#BFEBD7", x: 2, y: 20, width: 38, height: 24, rotate: "-7deg" },
  { id: "udagawa", color: "#FFE3A3", x: 53, y: 10, width: 34, height: 28, rotate: "15deg" },
  { id: "sakura", color: "#F8C9D7", x: 62, y: 58, width: 42, height: 24, rotate: "-12deg" },
  { id: "aoyama", color: "#CFE7FF", x: -6, y: 66, width: 34, height: 26, rotate: "12deg" },
  { id: "harajuku", color: "#DDD2FF", x: 24, y: 4, width: 24, height: 18, rotate: "-18deg" }
];

const mapLabels: MapLabel[] = [
  { id: "dogenzaka", label: "道玄坂", x: 18, y: 56 },
  { id: "miyashita", label: "宮下公園", x: 9, y: 29 },
  { id: "udagawa", label: "宇田川", x: 63, y: 21 }
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
  const mapCenter = toLatLngTuple(center ?? currentLocation);

  return (
    <View style={styles.map} testID="map-surface">
      <MapCanvas />
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
      <View style={styles.privacyPill}>
        <Text style={styles.privacyText}>FRIENDS ONLY</Text>
      </View>
      {!live ? (
        <View style={styles.activePill}>
          <Text style={styles.activeText}>{`${activeFriendCount} 人が今アクティブ 🔥`}</Text>
        </View>
      ) : null}
      {currentLocation ? (
        <View style={[styles.currentLocationMarker, positionForPoint(currentLocation, mapCenter)]}>
          <View style={styles.currentPulseOuter} />
          <View style={styles.currentPulseInner} />
          <Avatar initials={currentUser.initials} color={currentUser.color} size={58} active />
        </View>
      ) : null}
      {friends.map((friend) => {
        const point = latLngToScreenPoint({ latitude: friend.latitude, longitude: friend.longitude }, mapCenter);

        return (
          <View key={friend.id} style={[styles.marker, { left: `${point.x}%`, top: `${point.y}%` }]}>
            <View style={[styles.friendHalo, { borderColor: friend.color }]} />
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

function MapCanvas() {
  const roads: Array<{ rotate: string; left: `${number}%`; top: `${number}%`; width: `${number}%` }> = [
    { rotate: "-18deg", left: "7%", top: "14%", width: "105%" },
    { rotate: "22deg", left: "-12%", top: "37%", width: "120%" },
    { rotate: "-35deg", left: "10%", top: "62%", width: "110%" },
    { rotate: "82deg", left: "48%", top: "3%", width: "90%" },
    { rotate: "0deg", left: "0%", top: "72%", width: "110%" },
    { rotate: "42deg", left: "22%", top: "49%", width: "92%" },
    { rotate: "-62deg", left: "38%", top: "18%", width: "74%" }
  ];

  return (
    <>
      {mapBlocks.map((block) => (
        <View
          key={block.id}
          style={[
            styles.mapBlock,
            {
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: `${block.width}%`,
              height: `${block.height}%`,
              backgroundColor: block.color,
              transform: [{ rotate: block.rotate ?? "0deg" }]
            }
          ]}
        />
      ))}
      <View style={[styles.park, { left: "5%", top: "25%", width: "40%", height: "27%" }]} />
      <View style={[styles.park, { right: "-2%", top: "58%", width: "36%", height: "30%" }]} />
      <View style={[styles.water, { right: "7%", bottom: "10%", transform: [{ rotate: "-18deg" }] }]} />
      {roads.map((road, index) => (
        <View key={index} style={[styles.road, { left: road.left, top: road.top, width: road.width, transform: [{ rotate: road.rotate }] }]} />
      ))}
      {mapLabels.map((label) => (
        <Text key={label.id} style={[styles.mapLabel, { left: `${label.x}%`, top: `${label.y}%` }]}>
          {label.label}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFF1C8"
  },
  mapBlock: {
    position: "absolute",
    borderRadius: 22,
    opacity: 0.64
  },
  road: {
    position: "absolute",
    height: 30,
    borderRadius: 18,
    backgroundColor: "#FFF8E7",
    borderWidth: 3,
    borderColor: "#EFCF82",
    opacity: 0.92
  },
  park: {
    position: "absolute",
    borderRadius: 28,
    backgroundColor: "#82DEAE",
    opacity: 0.62,
    borderWidth: 2,
    borderColor: "#5FC58F"
  },
  water: {
    position: "absolute",
    width: 52,
    height: 260,
    borderRadius: 26,
    backgroundColor: "#76D4F5",
    opacity: 0.72
  },
  mapLabel: {
    position: "absolute",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: font.heavy,
    color: "#8E7C4D",
    letterSpacing: 0,
    opacity: 0.72
  },
  territory: {
    position: "absolute",
    borderWidth: 5,
    borderRadius: 18,
    opacity: 0.88
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
  privacyPill: {
    position: "absolute",
    right: 18,
    bottom: 22,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  privacyText: {
    fontSize: 12,
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
    position: "absolute",
    marginLeft: -29,
    marginTop: -29,
    alignItems: "center",
    justifyContent: "center"
  },
  friendHalo: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    opacity: 0.22,
    backgroundColor: "rgba(255,255,255,0.5)"
  },
  currentLocationMarker: {
    position: "absolute",
    width: 86,
    height: 86,
    marginLeft: -43,
    marginTop: -43,
    alignItems: "center",
    justifyContent: "center"
  },
  currentPulseOuter: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: `${colors.coral}22`
  },
  currentPulseInner: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${colors.coral}33`
  }
});

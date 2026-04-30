import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View, type NativeSyntheticEvent } from "react-native";
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { colors, font, shadow } from "@/theme/tokens";
import { MAP_INITIAL_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM, shouldAutoCenterMap, toLatLngKey } from "./mapCamera";
import {
  buildNativeBaseTerritoryFeatures,
  buildNativeFriendTerritoryFeatures,
  buildNativeLivePreviewFeatures,
  buildNativeRouteFeatures,
  MAPLIBRE_OSM_RASTER_STYLE,
  toNativeLngLat,
  toNativeMapCenter
} from "./mapNativeLayers";
import type { MapSelfMarker, MapSurfaceProps } from "./mapTypes";

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
}: MapSurfaceProps) {
  const cameraRef = useRef<CameraRef | null>(null);
  const userMovedMapRef = useRef(false);
  const mapCenter = useMemo(() => toNativeMapCenter(center ?? currentLocation), [center, currentLocation]);
  const mapCenterKey = useMemo(() => toLatLngKey([mapCenter[1], mapCenter[0]]), [mapCenter]);
  const currentCenterKeyRef = useRef(mapCenterKey);
  const baseTerritories = useMemo(() => buildNativeBaseTerritoryFeatures(center ?? currentLocation), [center, currentLocation]);
  const livePreview = useMemo(() => buildNativeLivePreviewFeatures(center ?? currentLocation, live), [center, currentLocation, live]);
  const trackingRoute = useMemo(() => buildNativeRouteFeatures(center ?? currentLocation, showRoute), [center, currentLocation, showRoute]);
  const friendTerritoryFeatures = useMemo(() => buildNativeFriendTerritoryFeatures(friendTerritories), [friendTerritories]);
  const handleRegionWillChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (event.nativeEvent?.userInteraction) {
      userMovedMapRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (
      !shouldAutoCenterMap({
        hasUserMovedMap: userMovedMapRef.current,
        previousCenterKey: currentCenterKeyRef.current,
        nextCenterKey: mapCenterKey
      })
    ) {
      return;
    }

    currentCenterKeyRef.current = mapCenterKey;
    cameraRef.current?.easeTo({ center: mapCenter, duration: 450 });
  }, [mapCenter, mapCenterKey]);

  return (
    <View style={styles.shell} testID="map-surface">
      <Map
        mapStyle={MAPLIBRE_OSM_RASTER_STYLE}
        style={StyleSheet.absoluteFillObject}
        attribution={false}
        compass={false}
        logo={false}
        scaleBar={false}
        androidView="surface"
        dragPan
        touchZoom
        doubleTapZoom
        doubleTapHoldZoom
        onRegionWillChange={handleRegionWillChange}
      >
        <Camera ref={cameraRef} initialViewState={{ center: mapCenter, zoom: MAP_INITIAL_ZOOM }} minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} />
        <GeoJSONSource id="terri-native-base-territories" data={baseTerritories}>
          <Layer
            id="terri-native-base-territory-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": 0.15,
              "fill-outline-color": ["get", "color"]
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="terri-native-friend-territories" data={friendTerritoryFeatures}>
          <Layer
            id="terri-native-friend-territory-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": 0.18,
              "fill-outline-color": ["get", "color"]
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="terri-native-live-preview" data={livePreview}>
          <Layer
            id="terri-native-live-preview-fill"
            type="fill"
            paint={{
              "fill-color": colors.coral,
              "fill-opacity": 0.1,
              "fill-outline-color": colors.coral
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="terri-native-tracking-route" data={trackingRoute}>
          <Layer
            id="terri-native-tracking-route-line"
            type="line"
            paint={{
              "line-color": colors.coral,
              "line-opacity": 0.7,
              "line-width": 6
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round"
            }}
          />
        </GeoJSONSource>
        {friends.map((friend) => (
          <Marker key={friend.id} id={`friend-${friend.id}`} lngLat={[friend.longitude, friend.latitude]} anchor="bottom">
            <View style={styles.friendMarker} testID={`friend-marker-${friend.id}`}>
              <View style={[styles.friendHalo, { borderColor: friend.color }]} />
              <Avatar initials={friend.initials} color={friend.color} size={friend.id === "taro" ? 74 : 58} active={friend.isActive} />
            </View>
          </Marker>
        ))}
        {currentLocation ? (
          <Marker id="current-user" lngLat={toNativeLngLat(currentLocation)} anchor="center">
            <View style={styles.currentLocationMarker}>
              <View style={[styles.currentPulseOuter, { backgroundColor: `${currentUser.color}26` }]} />
              <View style={[styles.currentPulseInner, { backgroundColor: `${currentUser.color}3D` }]} />
              <Avatar initials={currentUser.initials} color={currentUser.color} size={58} active />
            </View>
          </Marker>
        ) : null}
      </Map>
      <View pointerEvents="none" style={styles.mapWash} />
      <Text pointerEvents="none" style={styles.place}>
        {currentLocation ? "現在地" : "Shibuya"}
      </Text>
      {!live ? (
        <View pointerEvents="none" style={styles.activePill}>
          <Text style={styles.activeText}>{`${activeFriendCount} 人が今アクティブ 🔥`}</Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.privacyPill}>
        <Text style={styles.privacyText}>FRIENDS ONLY</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.mapBase
  },
  mapWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 238, 184, 0.06)"
  },
  place: {
    position: "absolute",
    left: 24,
    top: 86,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  },
  activePill: {
    position: "absolute",
    top: 156,
    alignSelf: "center",
    minWidth: 168,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: "#FFD5DF",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  activeText: {
    fontSize: 14,
    fontWeight: font.heavy,
    color: colors.ink
  },
  privacyPill: {
    position: "absolute",
    right: 18,
    top: 150,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  privacyText: {
    fontSize: 12,
    fontWeight: font.heavy,
    letterSpacing: 0,
    color: colors.ink
  },
  friendMarker: {
    width: 82,
    height: 94,
    alignItems: "center",
    justifyContent: "center"
  },
  friendHalo: {
    position: "absolute",
    top: 0,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 10,
    opacity: 0.22
  },
  currentLocationMarker: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center"
  },
  currentPulseOuter: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43
  },
  currentPulseInner: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35
  }
});

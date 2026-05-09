import { memo, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polygon, Polyline } from "react-native-maps";
import type { GeoPoint, TerritoryGeometry } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { colors } from "@/theme/tokens";
import { MapChrome } from "./chrome/MapChrome";
import { shouldAutoCenterMap, toLatLngKey } from "./mapCamera";
import { buildTrackingRoute, SHIBUYA_CENTER, type LatLngTuple } from "./mapGeometry";
import { buildMapSceneFromLegacyProps } from "./scene/mapSceneDefaults";
import type { MapRouteFeature, MapSelfMarker, MapSurfaceProps, MapTerritoryFeature } from "./mapTypes";

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type TerritoryPolygon = {
  id: string;
  color: string;
  coordinates: MapCoordinate[];
  holes?: MapCoordinate[][];
};

const INITIAL_REGION_DELTA = {
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export const MapSurface = memo(function MapSurface(props: MapSurfaceProps) {
  const scene = props.scene ?? buildMapSceneFromLegacyProps(props);
  const mapRef = useRef<MapView | null>(null);
  const userMovedMapRef = useRef(false);
  const mapCenter = useMemo(() => toLatLngTuple(scene.viewport.center ?? scene.viewport.currentLocation), [scene.viewport.center, scene.viewport.currentLocation]);
  const mapCenterKey = toLatLngKey(mapCenter);
  const currentCenterKeyRef = useRef(mapCenterKey);
  const initialRegion = useMemo(
    () => ({
      latitude: mapCenter[0],
      longitude: mapCenter[1],
      ...INITIAL_REGION_DELTA
    }),
    [mapCenter]
  );
  const ownTerritories = useMemo(() => scene.layers.ownFinalTerritories.flatMap(mapTerritoryToNativePolygons), [scene.layers.ownFinalTerritories]);
  const friendTerritories = useMemo(() => scene.layers.friendFinalTerritories.flatMap(mapTerritoryToNativePolygons), [scene.layers.friendFinalTerritories]);
  const livePreview = useMemo(() => (scene.layers.livePreview ? mapTerritoryToNativePolygons(scene.layers.livePreview) : []), [scene.layers.livePreview]);
  const trackingRoute = useMemo(() => mapRouteToCoordinates(scene.layers.trackingRoute, mapCenter), [scene.layers.trackingRoute, mapCenter]);

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
    mapRef.current?.animateToRegion(
      {
        latitude: mapCenter[0],
        longitude: mapCenter[1],
        ...INITIAL_REGION_DELTA
      },
      450
    );
  }, [mapCenter, mapCenterKey]);

  return (
    <View style={styles.shell} testID="map-surface">
      <MapView
        ref={mapRef}
        testID="native-standard-map"
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        initialRegion={initialRegion}
        showsCompass={false}
        showsScale={false}
        showsBuildings
        showsPointsOfInterest
        scrollEnabled
        zoomEnabled
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        onPanDrag={() => {
          userMovedMapRef.current = true;
        }}
      >
        {ownTerritories.map((territory) => (
          <Polygon
            key={territory.id}
            coordinates={territory.coordinates}
            holes={territory.holes}
            strokeColor={territory.color}
            fillColor={`${territory.color}33`}
            strokeWidth={4}
          />
        ))}
        {friendTerritories.map((territory) => (
          <Polygon
            key={territory.id}
            coordinates={territory.coordinates}
            holes={territory.holes}
            strokeColor={territory.color}
            fillColor={`${territory.color}2B`}
            strokeWidth={3}
          />
        ))}
        {livePreview.map((territory) => (
          <Polygon
            key={territory.id}
            coordinates={territory.coordinates}
            holes={territory.holes}
            strokeColor={territory.color}
            fillColor={`${territory.color}18`}
            strokeWidth={3}
            lineDashPattern={[10, 10]}
          />
        ))}
        {trackingRoute.length > 0 ? <Polyline coordinates={trackingRoute} strokeColor={`${colors.coral}CC`} strokeWidth={6} lineCap="round" lineJoin="round" /> : null}
        {scene.viewport.currentLocation && scene.user.marker ? <SelfMarker coordinate={scene.viewport.currentLocation} marker={scene.user.marker} /> : null}
        {scene.layers.friends.map((friend) => (
          <Marker key={friend.id} identifier={`friend-${friend.id}`} coordinate={{ latitude: friend.latitude, longitude: friend.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.friendMarker} testID={`friend-marker-${friend.id}`}>
              <View style={[styles.friendHalo, { borderColor: friend.color }]} />
              <Avatar initials={friend.initials} color={friend.color} size={friend.id === "taro" ? 74 : 58} active={friend.isActive} />
            </View>
          </Marker>
        ))}
      </MapView>
      <View pointerEvents="none" style={styles.mapWash} />
      <MapChrome {...scene.chrome} />
    </View>
  );
});

function SelfMarker({ coordinate, marker }: { coordinate: GeoPoint; marker: MapSelfMarker }) {
  return (
    <Marker identifier="current-user" coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.currentLocationMarker}>
        <View style={[styles.currentPulseOuter, { backgroundColor: `${marker.color}26` }]} />
        <View style={[styles.currentPulseInner, { backgroundColor: `${marker.color}3D` }]} />
        <Avatar initials={marker.initials} color={marker.color} size={58} active />
      </View>
    </Marker>
  );
}

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function mapTerritoryToNativePolygons(territory: MapTerritoryFeature): TerritoryPolygon[] {
  return territoryGeometryToNativePolygons(territory.geometry).map((polygon, index) => ({
    id: `${territory.id}-${index}`,
    color: territory.color,
    ...polygon
  }));
}

function territoryGeometryToNativePolygons(geometry: TerritoryGeometry): Array<{ coordinates: MapCoordinate[]; holes?: MapCoordinate[][] }> {
  if (geometry.type === "Polygon") {
    return [polygonCoordinatesToNativePolygon(geometry.coordinates)];
  }

  return geometry.coordinates.map(polygonCoordinatesToNativePolygon);
}

function polygonCoordinatesToNativePolygon(coordinates: number[][][]): { coordinates: MapCoordinate[]; holes?: MapCoordinate[][] } {
  const [outerRing, ...holes] = coordinates;

  return {
    coordinates: lngLatRingToCoordinates(outerRing ?? []),
    holes: holes.length > 0 ? holes.map(lngLatRingToCoordinates) : undefined
  };
}

function mapRouteToCoordinates(route: MapRouteFeature | undefined, center: LatLngTuple): MapCoordinate[] {
  if (!route) return [];
  const routePoints = route.coordinates.length > 0 ? route.coordinates : buildTrackingRoute(center).map(([latitude, longitude]) => ({ latitude, longitude }));
  return routePoints.map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
}

function lngLatRingToCoordinates(ring: number[][]): MapCoordinate[] {
  return ring.map(([longitude, latitude]) => ({ latitude, longitude }));
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.mapBase
  },
  mapWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 238, 184, 0.08)"
  },
  friendMarker: {
    width: 86,
    height: 86,
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

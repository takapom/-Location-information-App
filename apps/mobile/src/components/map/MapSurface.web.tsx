import { memo, useEffect, useMemo, useRef } from "react";
import type { GeoPoint, TerritoryGeometry } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { readMapStyleConfig } from "./config/mapStyleConfig";
import { resolveLeafletDevRasterTileUrl } from "./config/mapStyleFactory";
import { MAP_INITIAL_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM, shouldAutoCenterMap, toLatLngKey } from "./mapCamera";
import { SHIBUYA_CENTER, type LatLngTuple } from "./mapGeometry";
import { buildFriendLayerKey } from "./mapLayerKeys";
import { buildMapSceneFromLegacyProps, defaultSelfMarker } from "./scene/mapSceneDefaults";
import type { MapFriendMarker, MapRouteFeature, MapSelfMarker, MapSurfaceProps, MapTerritoryFeature } from "./mapTypes";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;

type MapLayerGroups = {
  ownTerritories: LeafletLayerGroup;
  friendTerritories: LeafletLayerGroup;
  friends: LeafletLayerGroup;
  live: LeafletLayerGroup;
  user: LeafletLayerGroup;
};

const leafletCssId = "terri-leaflet-css";
export const MapSurface = memo(function MapSurface(props: MapSurfaceProps) {
  const scene = props.scene ?? buildMapSceneFromLegacyProps(props);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupsRef = useRef<MapLayerGroups | null>(null);
  const mapStyleConfig = useMemo(() => readMapStyleConfig(), []);
  const friendsKey = useMemo(() => buildFriendLayerKey(scene.layers.friends), [scene.layers.friends]);
  const ownTerritoriesKey = useMemo(() => buildTerritoryLayerKey(scene.layers.ownFinalTerritories), [scene.layers.ownFinalTerritories]);
  const friendTerritoriesKey = useMemo(() => buildTerritoryLayerKey(scene.layers.friendFinalTerritories), [scene.layers.friendFinalTerritories]);
  const mapCenter = useMemo(() => toLatLngTuple(scene.viewport.center ?? scene.viewport.currentLocation), [scene.viewport.center, scene.viewport.currentLocation]);
  const mapCenterKey = toLatLngKey(mapCenter);
  const currentCenterKeyRef = useRef(mapCenterKey);
  const userMovedMapRef = useRef(false);
  const latestRenderInputRef = useRef({ mapCenter, scene });
  latestRenderInputRef.current = { mapCenter, scene };

  useEffect(() => {
    let cancelled = false;
    let resizeFrameId: number | undefined;

    async function boot() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const latest = latestRenderInputRef.current;

      injectLeafletCss();
      const map = L.map(containerRef.current, {
        center: latest.mapCenter,
        zoom: MAP_INITIAL_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        preferCanvas: true,
        zoomAnimation: true,
        markerZoomAnimation: false,
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true,
        keyboard: true
      });

      map.on("dragstart zoomstart", () => {
        userMovedMapRef.current = true;
      });

      const tileUrl = resolveLeafletDevRasterTileUrl(mapStyleConfig);
      if (tileUrl) {
        L.tileLayer(tileUrl, {
          maxZoom: MAP_MAX_ZOOM,
          updateWhenIdle: true,
          updateWhenZooming: false,
          keepBuffer: 2,
          attribution: latest.scene.chrome.attribution
        }).addTo(map);
      }

      const groups = {
        ownTerritories: L.layerGroup().addTo(map),
        friendTerritories: L.layerGroup().addTo(map),
        friends: L.layerGroup().addTo(map),
        live: L.layerGroup().addTo(map),
        user: L.layerGroup().addTo(map)
      };

      leafletRef.current = L;
      mapRef.current = map;
      groupsRef.current = groups;
      currentCenterKeyRef.current = toLatLngKey(latest.mapCenter);

      renderOwnTerritoryLayers(L, groups.ownTerritories, latest.scene.layers.ownFinalTerritories);
      renderFriendTerritoryLayers(L, groups.friendTerritories, latest.scene.layers.friendFinalTerritories);
      renderFriendLayers(L, groups.friends, latest.scene.layers.friends, props.onFriendMarkerPress);
      renderLiveLayers(L, groups.live, latest.scene.layers.livePreview, latest.scene.layers.trackingRoute, latest.mapCenter);
      renderCurrentLocationLayer(L, groups.user, latest.scene.viewport.currentLocation, latest.scene.user.marker);
      resizeFrameId = requestAnimationFrame(() => {
        if (!cancelled && mapRef.current === map) {
          map.invalidateSize();
        }
      });
    }

    boot();

    return () => {
      cancelled = true;
      if (resizeFrameId !== undefined) {
        cancelAnimationFrame(resizeFrameId);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        leafletRef.current = null;
        mapRef.current = null;
        groupsRef.current = null;
      }
    };
  }, [mapStyleConfig]);

  useEffect(() => {
    if (!mapRef.current) return;
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
    mapRef.current.setView(mapCenter, mapRef.current.getZoom(), { animate: true });
  }, [mapCenterKey]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderLiveLayers(leafletRef.current, groupsRef.current.live, scene.layers.livePreview, scene.layers.trackingRoute, mapCenter);
  }, [mapCenter, scene.layers.livePreview, scene.layers.trackingRoute]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderFriendLayers(leafletRef.current, groupsRef.current.friends, scene.layers.friends, props.onFriendMarkerPress);
  }, [scene.layers.friends, friendsKey, props.onFriendMarkerPress]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderOwnTerritoryLayers(leafletRef.current, groupsRef.current.ownTerritories, scene.layers.ownFinalTerritories);
  }, [scene.layers.ownFinalTerritories, ownTerritoriesKey]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderFriendTerritoryLayers(leafletRef.current, groupsRef.current.friendTerritories, scene.layers.friendFinalTerritories);
  }, [scene.layers.friendFinalTerritories, friendTerritoriesKey]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderCurrentLocationLayer(leafletRef.current, groupsRef.current.user, scene.viewport.currentLocation, scene.user.marker);
  }, [scene.viewport.currentLocation, scene.user.marker]);

  return (
    <div style={styles.shell} data-testid="map-surface">
      <div ref={containerRef} style={styles.map} aria-label="TERRI current location map" />
      <div style={styles.mapWash} />
      <div style={styles.place}>{scene.chrome.placeLabel}</div>
      <div style={styles.activePill}>{`${scene.chrome.activeFriendCount} 人が今アクティブ 🔥`}</div>
      <div style={styles.privacyPill}>{scene.chrome.privacyLabel}</div>
      <div style={styles.attribution} data-testid="map-attribution">
        {scene.chrome.attribution}
      </div>
    </div>
  );
});

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function renderOwnTerritoryLayers(L: LeafletModule, group: LeafletLayerGroup, ownTerritories: MapTerritoryFeature[]) {
  group.clearLayers();
  ownTerritories.forEach((territory) => {
    const polygons = territoryGeometryToLeafletPolygons(territory.geometry);
    polygons.forEach((polygon) => {
      group.addLayer(
        L.polygon(polygon as import("leaflet").LatLngExpression[][], {
          color: territory.color,
          fillColor: territory.color,
          fillOpacity: 0.2,
          opacity: 0.86,
          weight: 4,
          lineJoin: "round"
        }).bindPopup(`<strong>${escapeHtml(territory.displayName ?? "You")}</strong><br>確定済み陣地`)
      );
    });
  });
}

function renderFriendTerritoryLayers(L: LeafletModule, group: LeafletLayerGroup, friendTerritories: MapTerritoryFeature[]) {
  group.clearLayers();
  friendTerritories.forEach((territory) => {
    const polygons = territoryGeometryToLeafletPolygons(territory.geometry);
    polygons.forEach((polygon) => {
      group.addLayer(
        L.polygon(polygon as import("leaflet").LatLngExpression[][], {
          color: territory.color,
          fillColor: territory.color,
          fillOpacity: 0.12,
          opacity: 0.72,
          weight: 3,
          lineJoin: "round"
        }).bindPopup(
          `<strong>${escapeHtml(territory.displayName ?? "Friend")}</strong><br>確定済み陣地<br>${(territory.areaKm2 ?? 0).toFixed(2)} km²`
        )
      );
    });
  });
}

function renderLiveLayers(L: LeafletModule, group: LeafletLayerGroup, livePreview: MapTerritoryFeature | undefined, trackingRoute: MapRouteFeature | undefined, center: LatLngTuple) {
  group.clearLayers();
  if (livePreview) {
    territoryGeometryToLeafletPolygons(livePreview.geometry).forEach((polygon) => {
      group.addLayer(
        L.polygon(polygon as import("leaflet").LatLngExpression[][], {
          color: livePreview.color,
          fillColor: livePreview.color,
          fillOpacity: 0.18,
          opacity: 0.86,
          weight: 3,
          dashArray: "10 10",
          lineJoin: "round"
        })
      );
    });
  }

  if (trackingRoute && trackingRoute.coordinates.length > 0) {
    group.addLayer(
      L.polyline(
        trackingRoute.coordinates.map((point) => [point.latitude, point.longitude] as LatLngTuple),
        {
          color: trackingRoute.color,
          weight: 6,
          opacity: 0.68,
          lineCap: "round"
        }
      )
    );
  }
}

function renderCurrentLocationLayer(L: LeafletModule, group: LeafletLayerGroup, currentLocation?: GeoPoint, currentUser: MapSelfMarker = defaultSelfMarker) {
  group.clearLayers();
  if (!currentLocation) return;

  group.addLayer(
    L.marker([currentLocation.latitude, currentLocation.longitude], {
      icon: L.divIcon({
        html: currentLocationMarkerHtml(currentUser),
        className: "",
        iconSize: [64, 64],
        iconAnchor: [32, 32]
      })
    })
  );
}

function currentLocationMarkerHtml(currentUser: MapSelfMarker) {
  return `
    <div style="
      width:66px;height:66px;border-radius:33px;background:white;border:8px solid ${currentUser.color};
      display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#050505;
      box-shadow:0 14px 28px rgba(0,0,0,.24);position:relative;box-sizing:border-box;
    ">
      <div style="
        position:absolute;inset:-18px;border-radius:50%;background:${currentUser.color}26;
        box-shadow:0 0 0 10px ${currentUser.color}14;
      "></div>
      <div style="position:relative;z-index:1;">${escapeHtml(currentUser.initials)}</div>
      <div style="position:absolute;right:-2px;bottom:5px;width:20px;height:20px;border-radius:10px;background:#30D36F;border:4px solid white;box-sizing:border-box;z-index:2;"></div>
    </div>
  `;
}

function renderFriendLayers(L: LeafletModule, group: LeafletLayerGroup, friends: MapFriendMarker[], onFriendMarkerPress?: (friendId: string) => void) {
  group.clearLayers();
  friends.forEach((friend) => {
    const marker = L.marker([friend.latitude, friend.longitude], {
      icon: L.divIcon({
        html: friendMarkerHtml(friend),
        className: "",
        iconSize: [72, 84],
        iconAnchor: [36, 72]
      })
    }).bindPopup(`<strong>${escapeHtml(friend.displayName)}</strong><br>${escapeHtml(friend.updatedLabel)}<br>${friend.totalAreaKm2.toFixed(1)} km²`);
    marker.on("click", () => onFriendMarkerPress?.(friend.id));
    group.addLayer(marker);
  });
}

function buildTerritoryLayerKey(territories: MapTerritoryFeature[]) {
  return territories.map((territory) => `${territory.id}:${territory.areaKm2 ?? 0}`).join("|");
}

function territoryGeometryToLeafletPolygons(geometry: TerritoryGeometry): LatLngTuple[][][] {
  if (geometry.type === "Polygon") {
    return [territoryCoordinatesToLatLng(geometry.coordinates)];
  }

  return geometry.coordinates.map(territoryCoordinatesToLatLng);
}

function territoryCoordinatesToLatLng(coordinates: number[][][]): LatLngTuple[][] {
  return coordinates.map((ring) => ring.map(([longitude, latitude]) => [latitude, longitude] as LatLngTuple));
}

function friendMarkerHtml(friend: MapFriendMarker) {
  return `
    <div style="
      width:76px;height:86px;position:relative;filter:drop-shadow(0 12px 18px rgba(0,0,0,.22));
      transform:translateY(-2px);
    ">
      <div style="
        position:absolute;left:-8px;top:-8px;width:76px;height:76px;border-radius:38px;background:${friend.color}24;
      "></div>
      <div style="
        width:62px;height:62px;border-radius:35px;background:white;border:7px solid ${friend.color};
        display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#050505;
      ">${escapeHtml(friend.initials)}</div>
      <div style="
        position:absolute;left:23px;top:57px;width:17px;height:17px;background:white;
        border-right:7px solid ${friend.color};border-bottom:7px solid ${friend.color};
        transform:rotate(45deg);border-radius:2px;
      "></div>
      ${
        friend.isActive
          ? `<div style="position:absolute;right:4px;bottom:15px;width:20px;height:20px;border-radius:10px;background:#30D36F;border:4px solid white;"></div>`
          : ""
      }
    </div>
  `;
}

function injectLeafletCss() {
  const cssText = `
    .leaflet-container{height:100%;width:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff0bf;outline:none;touch-action:none;}
    .leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0;}
    .leaflet-container{overflow:hidden;}
    .leaflet-map-pane{z-index:0;}
    .leaflet-tile-pane{z-index:200;}
    .leaflet-overlay-pane{z-index:430;}
    .leaflet-shadow-pane{z-index:500;}
    .leaflet-marker-pane{z-index:650;}
    .leaflet-tooltip-pane{z-index:650;}
    .leaflet-popup-pane{z-index:700;}
    .leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{user-select:none;-webkit-user-drag:none;}
    .leaflet-tile{filter:saturate(.5) sepia(.12) hue-rotate(-10deg) brightness(1.1) contrast(.82);will-change:transform;}
    .leaflet-marker-icon{will-change:transform;}
    .leaflet-grab{cursor:grab;}
    .leaflet-dragging .leaflet-grab{cursor:grabbing;}
    .leaflet-control-container .leaflet-top,.leaflet-control-container .leaflet-bottom{position:absolute;z-index:1000;pointer-events:none;}
    .leaflet-top{top:16px}.leaflet-right{right:16px}.leaflet-bottom{bottom:16px}.leaflet-left{left:16px}
    .leaflet-control{pointer-events:auto;float:left;clear:both;}
    .leaflet-control-zoom{display:none;}
    .leaflet-control-attribution{display:none;}
    .leaflet-popup-content-wrapper{border-radius:18px;box-shadow:0 10px 24px rgba(0,0,0,.22);font-weight:800;}
  `;

  const existingStyle = document.getElementById(leafletCssId);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    return;
  }

  const style = document.createElement("style");
  style.id = leafletCssId;
  style.textContent = cssText;
  document.head.appendChild(style);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: colors.mapBase
  },
  map: {
    position: "absolute",
    inset: 0,
    zIndex: 0
  },
  mapWash: {
    position: "absolute",
    inset: 0,
    zIndex: 120,
    background: "linear-gradient(180deg, rgba(255,238,184,.18) 0%, rgba(255,255,255,.02) 42%, rgba(184,160,232,.07) 100%)",
    mixBlendMode: "multiply",
    pointerEvents: "none"
  },
  place: {
    position: "absolute",
    left: 24,
    top: 86,
    zIndex: 520,
    fontSize: 42,
    lineHeight: "48px",
    fontWeight: 900,
    letterSpacing: 0,
    color: colors.ink,
    pointerEvents: "none"
  },
  activePill: {
    position: "absolute",
    top: 156,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 520,
    minWidth: 168,
    height: 34,
    padding: "0 14px",
    borderRadius: 17,
    background: "#FFD5DF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 900,
    color: colors.ink,
    boxShadow: "0 8px 18px rgba(0,0,0,.16)",
    pointerEvents: "none"
  },
  privacyPill: {
    position: "absolute",
    right: 18,
    top: 150,
    zIndex: 520,
    height: 32,
    padding: "0 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    color: colors.ink,
    boxShadow: "0 8px 18px rgba(0,0,0,.16)",
    pointerEvents: "none"
  },
  attribution: {
    position: "absolute",
    left: 12,
    bottom: 88,
    zIndex: 520,
    maxWidth: "64%",
    padding: "4px 8px",
    borderRadius: 8,
    background: "rgba(255,255,255,.82)",
    fontSize: 10,
    lineHeight: "13px",
    fontWeight: 700,
    letterSpacing: 0,
    color: colors.ink,
    pointerEvents: "none"
  }
};

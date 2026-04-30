import { memo, useEffect, useMemo, useRef } from "react";
import type { FriendTerritory, GeoPoint, TerritoryGeometry } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { MAP_INITIAL_ZOOM, MAP_MAX_ZOOM, MAP_MIN_ZOOM, shouldAutoCenterMap, toLatLngKey } from "./mapCamera";
import { buildTerritoryPolygons, buildTrackingRoute, offsetLatLng, SHIBUYA_CENTER, type LatLngTuple } from "./mapGeometry";
import { buildFriendLayerKey } from "./mapLayerKeys";
import type { MapFriendMarker, MapSelfMarker } from "./mapTypes";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;

type MapLayerGroups = {
  base: LeafletLayerGroup;
  friendTerritories: LeafletLayerGroup;
  friends: LeafletLayerGroup;
  live: LeafletLayerGroup;
  user: LeafletLayerGroup;
};

const leafletCssId = "terri-leaflet-css";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupsRef = useRef<MapLayerGroups | null>(null);
  const friendsKey = useMemo(() => buildFriendLayerKey(friends), [friends]);
  const friendTerritoriesKey = useMemo(() => buildFriendTerritoryLayerKey(friendTerritories), [friendTerritories]);
  const mapCenter = useMemo(() => toLatLngTuple(center ?? currentLocation), [center, currentLocation]);
  const mapCenterKey = toLatLngKey(mapCenter);
  const currentCenterKeyRef = useRef(mapCenterKey);
  const userMovedMapRef = useRef(false);
  const latestRenderInputRef = useRef({ mapCenter, currentLocation, currentUser, friends, friendTerritories, live, showRoute });
  latestRenderInputRef.current = { mapCenter, currentLocation, currentUser, friends, friendTerritories, live, showRoute };

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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: MAP_MAX_ZOOM,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      const groups = {
        base: L.layerGroup().addTo(map),
        friendTerritories: L.layerGroup().addTo(map),
        friends: L.layerGroup().addTo(map),
        live: L.layerGroup().addTo(map),
        user: L.layerGroup().addTo(map)
      };

      leafletRef.current = L;
      mapRef.current = map;
      groupsRef.current = groups;
      currentCenterKeyRef.current = toLatLngKey(latest.mapCenter);

      renderBaseLayers(L, groups.base, latest.mapCenter);
      renderFriendTerritoryLayers(L, groups.friendTerritories, latest.friendTerritories);
      renderFriendLayers(L, groups.friends, latest.friends);
      renderLiveLayers(L, groups.live, latest.live, latest.showRoute, latest.mapCenter);
      renderCurrentLocationLayer(L, groups.user, latest.currentLocation, latest.currentUser);
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
  }, []);

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
    renderBaseLayers(leafletRef.current, groupsRef.current.base, mapCenter);
    renderLiveLayers(leafletRef.current, groupsRef.current.live, live, showRoute, mapCenter);
  }, [mapCenter, live, showRoute]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderFriendLayers(leafletRef.current, groupsRef.current.friends, friends);
  }, [friends, friendsKey]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderFriendTerritoryLayers(leafletRef.current, groupsRef.current.friendTerritories, friendTerritories);
  }, [friendTerritories, friendTerritoriesKey]);

  useEffect(() => {
    if (!leafletRef.current || !groupsRef.current) return;
    renderCurrentLocationLayer(leafletRef.current, groupsRef.current.user, currentLocation, currentUser);
  }, [currentLocation, currentUser]);

  return (
    <div style={styles.shell} data-testid="map-surface">
      <div ref={containerRef} style={styles.map} aria-label="TERRI current location map" />
      <div style={styles.mapWash} />
      <div style={styles.place}>{currentLocation ? "現在地" : "Shibuya"}</div>
      {!live ? <div style={styles.activePill}>{`${activeFriendCount} 人が今アクティブ 🔥`}</div> : null}
      <div style={styles.privacyPill}>FRIENDS ONLY</div>
    </div>
  );
});

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function renderBaseLayers(L: LeafletModule, group: LeafletLayerGroup, center: LatLngTuple) {
  group.clearLayers();
  const polygons = buildTerritoryPolygons(center);
  buildZenlyDistricts(center).forEach((district) => {
    group.addLayer(
      L.polygon(district.points, {
        color: district.color,
        fillColor: district.color,
        fillOpacity: 0.12,
        opacity: 0.3,
        weight: 2,
        lineJoin: "round"
      })
    );
  });
  group.addLayer(
    L.polygon(polygons.current, {
      color: colors.coral,
      fillColor: colors.coral,
      fillOpacity: 0.16,
      opacity: 0.82,
      weight: 5,
      lineJoin: "round"
    })
  );
  group.addLayer(
    L.polygon(polygons.friend, {
      color: colors.mint,
      fillColor: colors.mint,
      fillOpacity: 0.14,
      opacity: 0.72,
      weight: 4,
      lineJoin: "round"
    })
  );
}

function buildZenlyDistricts(center: LatLngTuple) {
  return [
    {
      color: "#FFD95C",
      points: [
        offsetLatLng(center, 0.0052, -0.0063),
        offsetLatLng(center, 0.0044, -0.0028),
        offsetLatLng(center, 0.0014, -0.0036),
        offsetLatLng(center, 0.0002, -0.0075),
        offsetLatLng(center, 0.0029, -0.0092)
      ]
    },
    {
      color: "#6DCFB0",
      points: [
        offsetLatLng(center, 0.0052, 0.0022),
        offsetLatLng(center, 0.0039, 0.0075),
        offsetLatLng(center, 0.0007, 0.0083),
        offsetLatLng(center, -0.0004, 0.0042),
        offsetLatLng(center, 0.0025, 0.0011)
      ]
    },
    {
      color: "#B8A0E8",
      points: [
        offsetLatLng(center, -0.0013, -0.0055),
        offsetLatLng(center, -0.0035, -0.0015),
        offsetLatLng(center, -0.0061, -0.0037),
        offsetLatLng(center, -0.0054, -0.0088),
        offsetLatLng(center, -0.0025, -0.0098)
      ]
    },
    {
      color: "#6BBBEF",
      points: [
        offsetLatLng(center, -0.0014, 0.0031),
        offsetLatLng(center, -0.0036, 0.0086),
        offsetLatLng(center, -0.0067, 0.0069),
        offsetLatLng(center, -0.0058, 0.0017),
        offsetLatLng(center, -0.0032, 0.0001)
      ]
    }
  ];
}

function renderFriendTerritoryLayers(L: LeafletModule, group: LeafletLayerGroup, friendTerritories: FriendTerritory[]) {
  group.clearLayers();
  friendTerritories.forEach((territory) => {
    const polygons = territoryGeometryToLeafletPolygons(territory.polygon);
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
          `<strong>${escapeHtml(territory.displayName)}</strong><br>確定済み陣地<br>${territory.areaKm2.toFixed(2)} km²`
        )
      );
    });
  });
}

function renderLiveLayers(L: LeafletModule, group: LeafletLayerGroup, live: boolean, showRoute: boolean, center: LatLngTuple) {
  group.clearLayers();
  const polygons = buildTerritoryPolygons(center);
  if (live) {
    group.addLayer(
      L.polygon(polygons.preview, {
        color: colors.coral,
        fillColor: colors.coral,
        fillOpacity: 0.08,
        opacity: 0.72,
        weight: 3,
        dashArray: "10 10"
      })
    );
  }

  if (showRoute) {
    group.addLayer(
      L.polyline(buildTrackingRoute(center), {
        color: colors.coral,
        weight: 6,
        opacity: 0.68,
        lineCap: "round"
      })
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

function renderFriendLayers(L: LeafletModule, group: LeafletLayerGroup, friends: MapFriendMarker[]) {
  group.clearLayers();
  friends.forEach((friend) => {
    group.addLayer(
      L.marker([friend.latitude, friend.longitude], {
        icon: L.divIcon({
          html: friendMarkerHtml(friend),
          className: "",
          iconSize: [72, 84],
          iconAnchor: [36, 72]
        })
      })
        .bindPopup(`<strong>${escapeHtml(friend.displayName)}</strong><br>${escapeHtml(friend.updatedLabel)}<br>${friend.totalAreaKm2.toFixed(1)} km²`)
    );
  });
}

function buildFriendTerritoryLayerKey(friendTerritories: FriendTerritory[]) {
  return friendTerritories.map((territory) => `${territory.id}:${territory.calculatedAt}:${territory.areaKm2}`).join("|");
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
  }
};

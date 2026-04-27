import { memo, useEffect, useMemo, useRef } from "react";
import type { GeoPoint } from "@terri/shared";
import { colors } from "@/theme/tokens";
import { buildTerritoryPolygons, buildTrackingRoute, SHIBUYA_CENTER, type LatLngTuple } from "./mapGeometry";
import { buildFriendLayerKey } from "./mapLayerKeys";
import type { MapFriendMarker, MapSelfMarker } from "./mapTypes";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletLayer = import("leaflet").Layer;
type LeafletLayerGroup = import("leaflet").LayerGroup;

type MapLayerGroups = {
  base: LeafletLayerGroup;
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
  activeFriendCount = 0,
  live = false,
  showRoute = false
}: {
  center?: GeoPoint;
  currentLocation?: GeoPoint;
  currentUser?: MapSelfMarker;
  friends?: MapFriendMarker[];
  activeFriendCount?: number;
  live?: boolean;
  showRoute?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupsRef = useRef<MapLayerGroups | null>(null);
  const friendsKey = useMemo(() => buildFriendLayerKey(friends), [friends]);
  const mapCenter = useMemo(() => toLatLngTuple(center), [center]);
  const latestRenderInputRef = useRef({ mapCenter, currentLocation, currentUser, friends, live, showRoute });
  latestRenderInputRef.current = { mapCenter, currentLocation, currentUser, friends, live, showRoute };

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
        zoom: 16,
        minZoom: 13,
        maxZoom: 19,
        preferCanvas: true,
        zoomAnimation: true,
        markerZoomAnimation: false,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      const groups = {
        base: L.layerGroup().addTo(map),
        friends: L.layerGroup().addTo(map),
        live: L.layerGroup().addTo(map),
        user: L.layerGroup().addTo(map)
      };

      leafletRef.current = L;
      mapRef.current = map;
      groupsRef.current = groups;

      renderBaseLayers(L, groups.base, latest.mapCenter);
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
    mapRef.current.setView(mapCenter, Math.max(mapRef.current.getZoom(), 16), { animate: true });
  }, [mapCenter]);

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
    renderCurrentLocationLayer(leafletRef.current, groupsRef.current.user, currentLocation, currentUser);
  }, [currentLocation, currentUser]);

  return (
    <div style={styles.shell} data-testid="map-surface">
      <div ref={containerRef} style={styles.map} aria-label="TERRI interactive map" />
      <div style={styles.place}>{currentLocation ? "現在地" : "Shibuya"}</div>
      {!live ? <div style={styles.activePill}>{`${activeFriendCount} 人が今アクティブ 🔥`}</div> : null}
    </div>
  );
});

function toLatLngTuple(point?: GeoPoint): LatLngTuple {
  return point ? [point.latitude, point.longitude] : SHIBUYA_CENTER;
}

function renderBaseLayers(L: LeafletModule, group: LeafletLayerGroup, center: LatLngTuple) {
  group.clearLayers();
  const polygons = buildTerritoryPolygons(center);
  group.addLayer(
    L.polygon(polygons.current, {
      color: colors.coral,
      fillColor: colors.coral,
      fillOpacity: 0.32,
      weight: 5
    })
  );
  group.addLayer(
    L.polygon(polygons.friend, {
      color: colors.mint,
      fillColor: colors.mint,
      fillOpacity: 0.24,
      weight: 5
    })
  );
}

function renderLiveLayers(L: LeafletModule, group: LeafletLayerGroup, live: boolean, showRoute: boolean, center: LatLngTuple) {
  group.clearLayers();
  const polygons = buildTerritoryPolygons(center);
  if (live) {
    group.addLayer(
      L.polygon(polygons.preview, {
        color: colors.coral,
        fillColor: colors.coral,
        fillOpacity: 0.2,
        weight: 4,
        dashArray: "8 8"
      })
    );
  }

  if (showRoute) {
    group.addLayer(
      L.polyline(buildTrackingRoute(center), {
        color: colors.coral,
        weight: 8,
        opacity: 0.82,
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
      width:58px;height:58px;border-radius:29px;background:white;border:6px solid ${currentUser.color};
      display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#050505;
      box-shadow:0 8px 16px rgba(0,0,0,.24);position:relative;box-sizing:border-box;
    ">
      ${escapeHtml(currentUser.initials)}
      <div style="position:absolute;right:-2px;bottom:5px;width:18px;height:18px;border-radius:9px;background:#30D36F;border:3px solid white;box-sizing:border-box;"></div>
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

function friendMarkerHtml(friend: MapFriendMarker) {
  return `
    <div style="
      width:64px;height:74px;position:relative;filter:drop-shadow(0 8px 12px rgba(0,0,0,.22));
      transform:translateY(-2px);
    ">
      <div style="
        width:56px;height:56px;border-radius:32px;background:white;border:6px solid ${friend.color};
        display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#050505;
      ">${escapeHtml(friend.initials)}</div>
      <div style="
        position:absolute;left:21px;top:52px;width:16px;height:16px;background:white;
        border-right:6px solid ${friend.color};border-bottom:6px solid ${friend.color};
        transform:rotate(45deg);border-radius:2px;
      "></div>
      ${
        friend.isActive
          ? `<div style="position:absolute;right:0;bottom:14px;width:18px;height:18px;border-radius:9px;background:#30D36F;border:3px solid white;"></div>`
          : ""
      }
    </div>
  `;
}

function injectLeafletCss() {
  if (document.getElementById(leafletCssId)) return;

  const style = document.createElement("style");
  style.id = leafletCssId;
  style.textContent = `
    .leaflet-container{height:100%;width:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff7ea;outline:none;}
    .leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0;}
    .leaflet-container{overflow:hidden;}
    .leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{user-select:none;-webkit-user-drag:none;}
    .leaflet-tile{filter:saturate(.82) brightness(1.06) contrast(.92);will-change:transform;}
    .leaflet-marker-icon{will-change:transform;}
    .leaflet-control-container .leaflet-top,.leaflet-control-container .leaflet-bottom{position:absolute;z-index:1000;pointer-events:none;}
    .leaflet-top{top:16px}.leaflet-right{right:16px}.leaflet-bottom{bottom:16px}.leaflet-left{left:16px}
    .leaflet-control{pointer-events:auto;float:left;clear:both;}
    .leaflet-control-zoom{border:none;border-radius:18px;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,.18);}
    .leaflet-control-zoom a{display:block;width:38px;height:38px;line-height:38px;text-align:center;background:#fff;color:#050505;text-decoration:none;font-size:24px;font-weight:900;}
    .leaflet-control-attribution{display:none;}
    .leaflet-popup-content-wrapper{border-radius:18px;box-shadow:0 10px 24px rgba(0,0,0,.22);font-weight:800;}
  `;
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
    inset: 0
  },
  place: {
    position: "absolute",
    left: 24,
    top: 86,
    zIndex: 500,
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
    zIndex: 500,
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
  }
};

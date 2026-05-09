import { colors } from "@/theme/tokens";
import type { FillLayerSpecification, LineLayerSpecification } from "@maplibre/maplibre-react-native";

const featureColorExpression: ["get", string] = ["get", "color"];

export const ownFinalTerritoryFillLayerStyle: FillLayerSpecification["paint"] = {
  "fill-color": featureColorExpression,
  "fill-opacity": 0.18,
  "fill-outline-color": featureColorExpression
};

export const friendFinalTerritoryFillLayerStyle: FillLayerSpecification["paint"] = {
  "fill-color": featureColorExpression,
  "fill-opacity": 0.18,
  "fill-outline-color": featureColorExpression
};

export const livePreviewFillLayerStyle: FillLayerSpecification["paint"] = {
  "fill-color": featureColorExpression,
  "fill-opacity": 0.1,
  "fill-outline-color": featureColorExpression
};

export const trackingRouteLineLayerStyle: LineLayerSpecification["paint"] = {
  "line-color": featureColorExpression,
  "line-opacity": 0.7,
  "line-width": 6
};

export const trackingRouteLineLayerLayout: LineLayerSpecification["layout"] = {
  "line-cap": "round",
  "line-join": "round"
};

export const fallbackLivePreviewColor = colors.coral;

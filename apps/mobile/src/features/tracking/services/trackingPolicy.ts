import type { CurrentLocation } from "./locationReader";

const earthRadiusM = 6_371_000;
const maxAcceptedAccuracyM = 50;
const defaultSendIntervalSeconds = 5;
const defaultSendDistanceM = 10;

export function isAcceptedLocationPoint(location: Pick<CurrentLocation, "accuracyM">) {
  return location.accuracyM < maxAcceptedAccuracyM;
}

export function getDistanceMeters(from: Pick<CurrentLocation, "latitude" | "longitude">, to: Pick<CurrentLocation, "latitude" | "longitude">) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function shouldSendTrackedLocation(input: {
  currentLocation: CurrentLocation;
  lastSentLocation?: CurrentLocation;
  minSecondsSinceLastSend?: number;
  minDistanceMeters?: number;
}) {
  if (!isAcceptedLocationPoint(input.currentLocation)) return false;
  if (!input.lastSentLocation) return true;

  const secondsSinceLastSend = Math.max(0, (Date.parse(input.currentLocation.recordedAt) - Date.parse(input.lastSentLocation.recordedAt)) / 1000);
  const metersSinceLastSend = getDistanceMeters(input.lastSentLocation, input.currentLocation);

  return secondsSinceLastSend >= (input.minSecondsSinceLastSend ?? defaultSendIntervalSeconds) || metersSinceLastSend >= (input.minDistanceMeters ?? defaultSendDistanceM);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

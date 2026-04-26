export function formatAverageSpeed(distanceKm: number, duration: string) {
  const durationHours = parseDurationHours(duration);
  if (durationHours <= 0) {
    return "-- km/h";
  }

  return `${(distanceKm / durationHours).toFixed(1)} km/h`;
}

function parseDurationHours(duration: string) {
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part) || part < 0)) {
    return 0;
  }

  const [first = 0, second = 0, third] = parts;
  const seconds = third === undefined ? first * 60 + second : first * 3600 + second * 60 + third;
  return seconds / 3600;
}

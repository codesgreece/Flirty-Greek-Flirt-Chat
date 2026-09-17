export const PASSPORT_CITIES = [
  { city: "Athens", country: "Greece", latitude: 37.9838, longitude: 23.7275 },
  { city: "Thessaloniki", country: "Greece", latitude: 40.6401, longitude: 22.9444 },
  { city: "Patras", country: "Greece", latitude: 38.2466, longitude: 21.7346 },
  { city: "Heraklion", country: "Greece", latitude: 35.3387, longitude: 25.1442 },
  { city: "Larissa", country: "Greece", latitude: 39.639, longitude: 22.4191 },
  { city: "Volos", country: "Greece", latitude: 39.3666, longitude: 22.9507 },
  { city: "Ioannina", country: "Greece", latitude: 39.665, longitude: 20.8537 },
  { city: "Chania", country: "Greece", latitude: 35.5138, longitude: 24.018 },
  { city: "Rhodes", country: "Greece", latitude: 36.4349, longitude: 28.2176 },
  { city: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { city: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405 },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { city: "Rome", country: "Italy", latitude: 41.9028, longitude: 12.4964 },
  { city: "Barcelona", country: "Spain", latitude: 41.3874, longitude: 2.1686 },
  { city: "Amsterdam", country: "Netherlands", latitude: 52.3676, longitude: 4.9041 },
  { city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
] as const;

export function findPassportCity(city: string) {
  const needle = city.trim().toLowerCase();
  return PASSPORT_CITIES.find((row) => row.city.toLowerCase() === needle) ?? null;
}

import proj4 from "proj4";

proj4.defs(
  "EPSG:2056",
  "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs",
);

export function wgsToLv95(lat: number, lng: number): { e: number; n: number } {
  const [e, n] = proj4("EPSG:4326", "EPSG:2056", [lng, lat]);
  return { e, n };
}

export function lv95ToWgs(e: number, n: number): { lat: number; lng: number } {
  const [lng, lat] = proj4("EPSG:2056", "EPSG:4326", [e, n]);
  return { lat, lng };
}

export function inSwitzerland(e: number, n: number): boolean {
  return e >= 2_485_000 && e <= 2_835_000 && n >= 1_075_000 && n <= 1_296_000;
}

export function groupDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

export function parseCoord(value: string): number | null {
  const digits = value.replace(/[^\d.-]/g, "");
  if (!digits) return null;
  const number = Number(digits);
  return Number.isFinite(number) ? number : null;
}

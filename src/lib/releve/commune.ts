interface IdentifyResponse {
  results?: Array<{
    attributes?: {
      gemname?: string;
      is_current_jahr?: boolean;
    };
  }>;
}

export async function communeFromLv95(e: number, n: number): Promise<string | null> {
  const pad = 80;
  const url = new URL("https://api3.geo.admin.ch/rest/services/api/MapServer/identify");
  url.searchParams.set("geometry", `${e},${n}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("sr", "2056");
  url.searchParams.set("layers", "all:ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill");
  url.searchParams.set("tolerance", "0");
  url.searchParams.set("mapExtent", `${e - pad},${n - pad},${e + pad},${n + pad}`);
  url.searchParams.set("imageDisplay", "100,100,96");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("lang", "fr");

  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as IdentifyResponse;
  const current = data.results?.find((item) => item.attributes?.is_current_jahr && item.attributes.gemname);
  return current?.attributes?.gemname ?? null;
}

import { NextRequest, NextResponse } from "next/server";
import {
  collectHeroPlaceTypes,
  fetchGooglePlaceForHero,
  fetchStaticNatureBytesFromList,
  fetchUnsplashNatureImageBytes,
  getTripImageSearchQueries,
  pickNatureBiasedGooglePhotoName,
  resolvePlaceResourceFromSearchHierarchy,
  resolveTripImageCleanLabel,
  tryUnsplashQueryList,
} from "@/lib/trip-card-photo-nature";

export const runtime = "nodejs";

const PHOTO_MAX_PX = 1400;

function getGoogleApiKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}

function getUnsplashAccessKey(): string | undefined {
  const k = process.env.UNSPLASH_ACCESS_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}

function imageResponse(buf: Buffer, contentType: string) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

async function fetchGooglePhotoMedia(
  apiKey: string,
  photoName: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  let mediaUrl: string;
  try {
    mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${PHOTO_MAX_PX}`;
    new URL(mediaUrl);
  } catch {
    return null;
  }
  try {
    const photoRes = await fetch(mediaUrl, {
      headers: { "X-Goog-Api-Key": apiKey },
    });
    if (!photoRes.ok) return null;
    const buf = Buffer.from(await photoRes.arrayBuffer());
    const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";
    return { buf, contentType };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tid")?.trim() ?? "";
  const titleParam = req.nextUrl.searchParams.get("title")?.trim() ?? "";

  try {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return new NextResponse("Missing API key", { status: 404 });
    }

    const placeIdRaw = req.nextUrl.searchParams.get("placeId");
    const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";

    let placeResourceName: string | null = null;

    if (placeIdRaw && placeIdRaw.trim()) {
      const pid = placeIdRaw.trim();
      placeResourceName = pid.startsWith("places/") ? pid : `places/${pid}`;
    } else if (address) {
      const preLabel = resolveTripImageCleanLabel(titleParam, "", address);
      const textQueries = getTripImageSearchQueries(preLabel, address);
      placeResourceName = await resolvePlaceResourceFromSearchHierarchy(
        apiKey,
        textQueries,
      );
    } else {
      return new NextResponse("Expected placeId or address", { status: 400 });
    }

    if (!placeResourceName) {
      return new NextResponse("Place not found", { status: 404 });
    }

    const place = await fetchGooglePlaceForHero(apiKey, placeResourceName);
    if (!place) {
      return new NextResponse("Place details failed", { status: 404 });
    }

    const types = collectHeroPlaceTypes(place);
    const googlePhotoName = pickNatureBiasedGooglePhotoName(place.photos, types);
    if (googlePhotoName) {
      const googleBytes = await fetchGooglePhotoMedia(apiKey, googlePhotoName);
      if (googleBytes) {
        return imageResponse(googleBytes.buf, googleBytes.contentType);
      }
    }

    const cleanLabel = resolveTripImageCleanLabel(
      titleParam,
      place.displayName?.text ?? "",
      address,
    );
    const regionSource =
      place.formattedAddress?.trim() || address || cleanLabel;
    const unsplashQueries = getTripImageSearchQueries(cleanLabel, regionSource);

    const unsplashKey = getUnsplashAccessKey();
    if (unsplashKey && unsplashQueries.length > 0) {
      const unsplash = await tryUnsplashQueryList(
        unsplashKey,
        unsplashQueries,
        tripId || cleanLabel || "trip",
      );
      if (unsplash) return imageResponse(unsplash.buf, unsplash.contentType);
    }

    console.log("Trip image: using generic nature stock (final fallback)");
    const staticBytes = await fetchStaticNatureBytesFromList(
      cleanLabel || "wilderness",
      tripId,
    );
    if (staticBytes) return imageResponse(staticBytes.buf, staticBytes.contentType);

    return new NextResponse("No image", { status: 404 });
  } catch {
    console.log("Trip image: using generic nature stock (final fallback)");
    const fallback = await fetchStaticNatureBytesFromList(
      "wilderness-fallback",
      tripId,
    );
    if (fallback) return imageResponse(fallback.buf, fallback.contentType);
    return new NextResponse("No image", { status: 404 });
  }
}

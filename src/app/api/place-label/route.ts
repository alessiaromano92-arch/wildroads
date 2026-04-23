import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getApiKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}

/**
 * Returns a short place label (Google `displayName.text`) for a place id.
 * Used by the journal daily summary when saved data only has a street address.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return NextResponse.json({ label: null }, { status: 400 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ label: null, formattedAddress: null });
  }

  const resource = placeId.startsWith("places/") ? placeId : `places/${placeId}`;
  const url = `https://places.googleapis.com/v1/${resource}`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,formattedAddress",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ label: null, formattedAddress: null });
    }

    const data = (await res.json()) as {
      displayName?: { text?: string };
      formattedAddress?: string;
    };

    const displayText = data.displayName?.text?.trim() ?? "";
    const formatted = data.formattedAddress?.trim() ?? "";

    let label: string | null = null;
    if (displayText) {
      if (
        formatted &&
        displayText.toLowerCase() === formatted.toLowerCase()
      ) {
        label = null;
      } else {
        label = displayText;
      }
    }

    return NextResponse.json({
      label,
      formattedAddress: formatted || null,
    });
  } catch {
    return NextResponse.json({ label: null, formattedAddress: null });
  }
}

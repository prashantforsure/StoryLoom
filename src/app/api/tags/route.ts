// app/api/tags/route.ts

import { NextResponse } from "next/server";

const TAGS = [
  "action",
  "adventure",
  "comedy",
  "drama",
  "thriller",
  "horror",
  "romance",
  "sci-fi",
  "fantasy",
  "documentary",
  "biography",
  "mystery",
  "crime",
  "historical",
  "musical",
  "war",
  "western",
  "family",
  "animation",
  "sport",
];

export async function GET(request: Request) {
  // Parse the query string for an optional search term "q"
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() || "";

  // Filter the TAGS based on the query parameter
  const suggestions = q
    ? TAGS.filter((tag) => tag.toLowerCase().includes(q))
    : TAGS;

  return NextResponse.json({ suggestions });
}

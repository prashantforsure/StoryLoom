// app/api/preferences/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth/auth";

type PreferenceData = {
  genres: string[];
  tones: string[];
  styles: string[];
  referenceWorks: string[];
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preferences = await prisma.preference.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json(preferences, { status: 200 });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return await handleUpsert(request);
}

export async function POST(request: Request) {
  return await handleUpsert(request);
}

// A helper function to handle both POST and PUT updates
async function handleUpsert(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: PreferenceData = await request.json();

    // Validate the provided fields
    if (!body.genres || !Array.isArray(body.genres)) {
      return NextResponse.json({ error: "Invalid or missing genres" }, { status: 400 });
    }
    if (!body.tones || !Array.isArray(body.tones)) {
      return NextResponse.json({ error: "Invalid or missing tones" }, { status: 400 });
    }
    if (!body.styles || !Array.isArray(body.styles)) {
      return NextResponse.json({ error: "Invalid or missing styles" }, { status: 400 });
    }
    if (!body.referenceWorks || !Array.isArray(body.referenceWorks)) {
      return NextResponse.json({ error: "Invalid or missing referenceWorks" }, { status: 400 });
    }

    // Check if preferences already exist
    const existingPreference = await prisma.preference.findUnique({
      where: { userId: session.user.id },
    });

    if (existingPreference) {
      // Update the existing preferences
      const updatedPreference = await prisma.preference.update({
        where: { userId: session.user.id },
        data: {
          genres: body.genres,
          tones: body.tones,
          styles: body.styles,
          referenceWorks: body.referenceWorks,
        },
      });
      return NextResponse.json(updatedPreference, { status: 200 });
    } else {
      // Create new preferences for the user
      const newPreference = await prisma.preference.create({
        data: {
          user: { connect: { id: session.user.id } },
          genres: body.genres,
          tones: body.tones,
          styles: body.styles,
          referenceWorks: body.referenceWorks,
        },
      });
      return NextResponse.json(newPreference, { status: 201 });
    }
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

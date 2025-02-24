// app/api/onboarding/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth/auth";

type OnboardingData = {
  contentType?: string; // optional field if you want to store it
  genres: string[];
  tones: string[];
  styles: string[];
  referenceWorks: string[];
};

export async function POST(request: Request) {
  // Verify the user session
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: OnboardingData = await request.json();

    // Basic validation of required array fields
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

    // Check if a Preference record already exists for this user
    const existingPreference = await prisma.preference.findUnique({
      where: { userId: session.user.id },
    });

    if (existingPreference) {
      // Update existing record
      const updatedPreference = await prisma.preference.update({
        where: { userId: session.user.id },
        data: {
          // Optionally you can store contentType if your model supports it
          genres: body.genres,
          tones: body.tones,
          styles: body.styles,
          referenceWorks: body.referenceWorks,
        },
      });
      return NextResponse.json(updatedPreference, { status: 200 });
    } else {
      // Create a new Preference record
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
    console.error("Error processing onboarding data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

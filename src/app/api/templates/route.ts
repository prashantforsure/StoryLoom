// app/api/templates/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Adjust the import path if necessary

export async function GET(request: Request) {
  try {
    // Retrieve all available templates from the database
    const templates = await prisma.template.findMany();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

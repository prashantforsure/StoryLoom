// app/api/projects/[projectId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
 // adjust path as needed
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth/auth";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  // Verify the user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = params;

  try {
    // Query the project with all related data: briefing, scripts, messages
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      include: {
        briefing: true,
        scripts: true,
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    // Check if the project exists and belongs to the authenticated user
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

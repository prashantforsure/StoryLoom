

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
 // Adjust the path as needed
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth/auth";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  // Validate user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = params;

  try {
    // First, verify that the project belongs to the authenticated user
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch conversation messages for this project, ordered by creation time
    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  // Verify user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = params;

  try {
    const body = await request.json();
    const { content } = body;

    // Validate message content
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 });
    }

    // Verify that the project exists and belongs to the authenticated user
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create new message; by default, new messages from the client are from the user
    const newMessage = await prisma.message.create({
      data: {
        projectId,
        content,
        role: "USER", // Enum value from MessageRole ("USER" or "AI")
      },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error storing message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

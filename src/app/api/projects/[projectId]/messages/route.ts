import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params to get projectId
    const { projectId } = await params

    // Check project ownership
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ messages }, { status: 200 })
  } catch (error) {
    console.error("Error fetching messages:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params to get projectId
    const { projectId } = await params

    // Validate request body
    const body = await request.json()
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { content, role } = body

    // Validate message content
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 })
    }

    // Validate role
    if (!role || (role !== "USER" && role !== "AI")) {
      return NextResponse.json({ error: "Invalid role. Must be 'USER' or 'AI'" }, { status: 400 })
    }

    // Verify project ownership
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const newMessage = await prisma.message.create({
      data: {
        projectId,
        content,
        role,
      },
    })

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    console.error("Error storing message:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

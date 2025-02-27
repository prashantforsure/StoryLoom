// app/api/projects/[projectId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request,  { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Await the params object
    const projectId = (await params).projectId
    
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      include: {
        briefing: true,
        scripts: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request,  { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Await params correctly
    // const resolvedParams = await Promise.resolve(params);
    // const { projectId } = resolvedParams;
    const projectId = (await params).projectId
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Verify that the project exists and belongs to the authenticated user
    const existingProject = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    
    if (!existingProject || existingProject.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Separate data: remove scripts and messages if present
    const { briefing, scripts, messages, ...projectData } = body;
    
    const updateData: any = {};
    
    // Update title if provided
    if (projectData.title) {
      updateData.title = projectData.title;
    }
    
    // Handle briefing update: map fields and convert stylisticReferences if needed.
    if (briefing) {
      const {
        overview,
        objectives,
        targetAudience,
        distributionPlatform,
        overallTone,
        mood,
        genre,
        subGenres,
        // Use "scriptFormat" instead of "style"
        scriptFormat,
        stylisticReferences,
        logline,
        plotOutline,
        theme,
        setting,
        pacing,
        characters,
        research,
        revisionDetails,
        budget,
        timeline,
      } = briefing;
      
      const validBriefingData: any = {};
      
      if (overview !== undefined) validBriefingData.overview = overview;
      if (objectives !== undefined) validBriefingData.objectives = objectives;
      if (targetAudience !== undefined) validBriefingData.targetAudience = targetAudience;
      if (distributionPlatform !== undefined) validBriefingData.distributionPlatform = distributionPlatform;
      if (overallTone !== undefined) validBriefingData.overallTone = overallTone;
      if (mood !== undefined) validBriefingData.mood = mood;
      if (genre !== undefined) validBriefingData.genre = genre;
      if (subGenres !== undefined) validBriefingData.subGenres = subGenres;
      if (scriptFormat !== undefined) validBriefingData.scriptFormat = scriptFormat;
      if (stylisticReferences !== undefined) {
        // Convert array to comma-separated string if needed
        validBriefingData.stylisticReferences = Array.isArray(stylisticReferences)
          ? stylisticReferences.join(", ")
          : stylisticReferences;
      }
      if (logline !== undefined) validBriefingData.logline = logline;
      if (plotOutline !== undefined) validBriefingData.plotOutline = plotOutline;
      if (theme !== undefined) validBriefingData.theme = theme;
      if (setting !== undefined) validBriefingData.setting = setting;
      if (pacing !== undefined) validBriefingData.pacing = pacing;
      if (characters !== undefined) validBriefingData.characters = characters;
      if (research !== undefined) validBriefingData.research = research;
      if (revisionDetails !== undefined) validBriefingData.revisionDetails = revisionDetails;
      if (budget !== undefined) validBriefingData.budget = budget;
      if (timeline !== undefined) validBriefingData.timeline = timeline;
      
      if (Object.keys(validBriefingData).length > 0) {
        updateData.briefing = {
          upsert: {
            create: validBriefingData,
            update: validBriefingData,
          },
        };
      }
    }
    
    // Optionally handle scripts and messages if provided
    if (scripts && Array.isArray(scripts)) {
      const processedScripts = scripts.map(script => {
        const { content, status } = script;
        return { content, status };
      });
      if (processedScripts.length > 0) {
        updateData.scripts = { create: processedScripts };
      }
    }
    
    if (messages && Array.isArray(messages)) {
      const processedMessages = messages.map(message => {
        const { role, content } = message;
        return { role, content };
      });
      if (processedMessages.length > 0) {
        updateData.messages = { create: processedMessages };
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No valid update data provided" }, { status: 400 });
    }
    
    const updatedProject = await prisma.scriptProject.update({
      where: { id: projectId },
      data: updateData,
      include: {
        briefing: true,
        scripts: true,
        messages: true,
      },
    });
    
    return NextResponse.json({ project: updatedProject }, { status: 200 });
  } catch (error) {
    console.error("Error updating project:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

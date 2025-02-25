// app/dashboard/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authOptions } from "@/lib/auth/auth";
import CreateProjectButton from "./CreateProjectButton"; 
// We define a type for the Project
type Project = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export const metadata: Metadata = {
  title: "Dashboard - AI Scriptwriter",
  description: "View and manage your AI-generated script projects.",
};

async function fetchProjects(): Promise<Project[]> {
  // Replace with your actual domain or use an environment variable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/projects`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.projects || [];
}


export default async function DashboardPage() {
  // Check user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // If no user, redirect to sign in or home
    redirect("/api/auth/signin");
  }

  // Fetch the user's projects from the API
  const projects = await fetchProjects();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {session.user?.name || "Creator"}! Below are all your script projects.
        </p>
        <div className="mt-4 sm:mt-0">
          <CreateProjectButton />
        </div>
      </header>

      {/* Projects Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white rounded shadow p-4">
            <p className="text-gray-500">No projects found. Create a new project to get started!</p>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800 truncate">
                  {project.title}
                </h2>
                {/* Example icon or image */}
                <Image
                  src="/assets/script-icon.png" // Replace with your own icon path
                  alt="Script Icon"
                  width={24}
                  height={24}
                />
              </div>
              <p className="text-sm text-gray-500">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                Last Update: {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

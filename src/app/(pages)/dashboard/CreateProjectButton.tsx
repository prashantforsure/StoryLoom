"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProjectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      // Call your API to create a new project.
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Project" }), // you may customize initial project data
      });
      if (!res.ok) {
        console.error("Error creating project");
        setLoading(false);
        return;
      }
      const data = await res.json();
      // Assuming your response is { project: { id: string, ... } }
      const projectId = data.project.id;
      // Navigate to the project conversation page.
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error during project creation:", error);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleCreateProject}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
    >
      {loading ? "Creating..." : "Create New Project"}
    </button>
  );
}

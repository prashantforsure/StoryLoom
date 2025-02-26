"use client"

import type { RefObject } from "react"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Plus,
  FileText,
  Clock,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  Loader2,
  FolderPlus,
  Zap,
  Star,
  MoreHorizontal,
  X,
} from "lucide-react"

// We define a type for the Project
type Project = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

// Custom hook for intersection observer (animations)
const useIntersectionObserver = (options = {}): [RefObject<HTMLDivElement>, boolean] => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);
//@ts-expect-error there is some type error
  return [ref, isVisible];
};

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingProject, setCreatingProject] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState("updatedAt")
  const [projectsRef, projectsVisible] = useIntersectionObserver({ threshold: 0.1 })
  const [headerRef, headerVisible] = useIntersectionObserver({ threshold: 0.1 })
  const [isHoveringCard, setIsHoveringCard] = useState<string | null>(null)

  // Fetch projects on component mount
  useEffect(() => {
    async function fetchProjects() {
      if (status === "loading") return

      if (!session?.user) {
        router.push("/api/auth/signin")
        return
      }

      try {
        const res = await fetch("/api/projects", {
          cache: "no-store",
        })

        if (!res.ok) {
          console.error(`Error fetching projects: ${res.status} ${res.statusText}`)
          setProjects([])
        } else {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [session, status, router])

  // Handle creating a new project
  const handleCreateProject = async () => {
    setCreatingProject(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Project" }),
      })

      if (!res.ok) {
        console.error("Error creating project")
        return
      }

      const data = await res.json()
      router.push(`/projects/${data.project.id}`)
    } catch (error) {
      console.error("Error during project creation:", error)
    } finally {
      setCreatingProject(false)
    }
  }

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) => project.title.toLowerCase().includes(searchQuery.toLowerCase()))

  // Sort projects based on selected sort option
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title)
    } else if (sortBy === "createdAt") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
  })

  // Generate a random pastel color for project cards
  const getProjectColor = (id: string) => {
    const colors = [
      "from-purple-100 to-purple-50 border-purple-200",
      "from-blue-100 to-blue-50 border-blue-200",
      "from-indigo-100 to-indigo-50 border-indigo-200",
      "from-pink-100 to-pink-50 border-pink-200",
      "from-green-100 to-green-50 border-green-200",
      "from-amber-100 to-amber-50 border-amber-200",
    ]

    // Use the project ID to deterministically select a color
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  // If loading or not authenticated
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={40} className="text-purple-600 animate-spin mb-4" />
          <p className="text-slate-600 text-lg">Loading your creative workspace...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Header */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-500 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                ScriptAI
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-md border ${showFilters ? "bg-purple-50 border-purple-200 text-purple-600" : "border-slate-200 text-slate-600 hover:border-purple-200 hover:text-purple-600"} transition-colors`}
              >
                <Filter size={18} />
              </button>

              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                {session?.user?.name?.[0] || "U"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent mb-2">
                Your Creative Projects
              </h1>
              <p className="text-slate-600">
                Welcome back, {session?.user?.name || "Creator"}! Continue crafting your scripts.
              </p>
            </div>

            <button
              onClick={handleCreateProject}
              disabled={creatingProject}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-md hover:shadow-lg"
            >
              {creatingProject ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} className="mr-2" />
                  New Project
                </>
              )}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-slate-200 animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-slate-800">Filter & Sort</h3>
                <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSortBy("updatedAt")}
                  className={`px-3 py-1 text-sm rounded-full ${sortBy === "updatedAt" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700 hover:bg-purple-50"}`}
                >
                  Recently Updated
                </button>
                <button
                  onClick={() => setSortBy("createdAt")}
                  className={`px-3 py-1 text-sm rounded-full ${sortBy === "createdAt" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700 hover:bg-purple-50"}`}
                >
                  Recently Created
                </button>
                <button
                  onClick={() => setSortBy("title")}
                  className={`px-3 py-1 text-sm rounded-full ${sortBy === "title" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700 hover:bg-purple-50"}`}
                >
                  Alphabetical
                </button>
              </div>
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute -z-10 top-0 right-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -z-10 -bottom-8 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        {/* Projects Grid */}
        <div
          ref={projectsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Create New Project Card */}
          <div
            onClick={handleCreateProject}
            className={`cursor-pointer bg-gradient-to-br from-purple-50 to-white border-2 border-dashed border-purple-200 rounded-xl p-6 flex flex-col items-center justify-center text-center h-64 transition-all duration-300 hover:shadow-md hover:border-purple-400 group ${
              projectsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FolderPlus size={28} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Create New Project</h3>
            <p className="text-slate-500 text-sm mb-4">Start crafting your next masterpiece</p>
            <div className="inline-flex items-center text-purple-600 text-sm font-medium">
              {creatingProject ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              {creatingProject ? "Creating..." : "Get Started"}
            </div>
          </div>

          {/* Project Cards */}
          {sortedProjects.length > 0 ? (
            sortedProjects.map((project, index) => (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className={`block bg-gradient-to-br ${getProjectColor(project.id)} border rounded-xl p-6 transition-all duration-300 relative overflow-hidden ${
                  projectsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${(index + 1) * 100 + 100}ms` }}
                onMouseEnter={() => setIsHoveringCard(project.id)}
                onMouseLeave={() => setIsHoveringCard(null)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                    <FileText size={20} className="text-purple-600" />
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <h2 className="text-lg font-semibold text-slate-800 mb-2 truncate">{project.title}</h2>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-slate-500">
                    <Calendar size={14} className="mr-1" />
                    <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <Clock size={14} className="mr-1" />
                    <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center text-purple-600 text-sm font-medium">
                    Continue
                    <ChevronRight
                      size={16}
                      className={`ml-1 transition-transform duration-300 ${isHoveringCard === project.id ? "translate-x-1" : ""}`}
                    />
                  </div>

                  {/* Random "last edited" indicator */}
                  {Math.random() > 0.5 && (
                    <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-slate-600 flex items-center">
                      <Zap size={12} className="mr-1 text-amber-500" />
                      Active
                    </div>
                  )}
                </div>

                {/* Decorative corner effect */}
                <div
                  className={`absolute -bottom-12 -right-12 w-24 h-24 bg-white/10 rounded-full transition-all duration-300 ${isHoveringCard === project.id ? "scale-150" : "scale-100"}`}
                ></div>
              </Link>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-xl shadow-md p-8 text-center border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No projects found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery ? "No projects match your search query." : "You haven't created any projects yet."}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors inline-flex items-center"
                >
                  <X size={16} className="mr-2" />
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleCreateProject}
                  disabled={creatingProject}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-md hover:shadow-lg inline-flex items-center"
                >
                  {creatingProject ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Create Your First Project
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Tips Section */}
        <div className="mt-12 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <h2 className="text-white text-lg font-semibold flex items-center">
              <Star size={18} className="mr-2" fill="white" />
              Quick Tips for Better Scripts
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">Character Development</h3>
                <p className="text-sm text-slate-600">
                  Use the AI to generate detailed character backstories that inform their dialogue and actions.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">Scene Transitions</h3>
                <p className="text-sm text-slate-600">
                  Create smoother scene transitions by using the "Suggest Transition" feature in the editor.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h3 className="font-medium text-slate-800 mb-2">Dialogue Enhancement</h3>
                <p className="text-sm text-slate-600">
                  Try different tone settings to make your dialogue more natural and character-specific.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add custom styles for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}


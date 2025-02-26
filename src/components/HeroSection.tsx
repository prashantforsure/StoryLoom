"use client"

import { useState, useEffect, useRef, type RefObject } from "react"
import {
  Play,
  CheckCircle,
  Users,
  History,
  Zap,
  Layers,
  Monitor,
  Smartphone,
  Tablet,
  Star,
  ArrowRight,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { UserAccountNav } from "./UserAccountNav"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/router"

// Animation utility for typing effect
const useTypingEffect = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return displayText
}

// Custom hook for intersection observer (animations)
const useIntersectionObserver = (options = {}): [RefObject<HTMLDivElement>, boolean] => {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, options)

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [options])
//@ts-expect-error there is some type error 
  return [ref, isVisible]
}

export default function HeroSection() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("film")
  const [featureRef, featureVisible] = useIntersectionObserver({ threshold: 0.1 })
  const [workflowRef, workflowVisible] = useIntersectionObserver({ threshold: 0.1 })
  const [testimonialsRef, testimonialsVisible] = useIntersectionObserver({ threshold: 0.1 })
  const { data: session, status } = useSession()
  

 

  const handleAuthAction = () => {
    if (session) {
      signOut()
    } else {
      signIn()
    }
  }

  // Typing effect for the hero section
  const typedText = useTypingEffect(
    "INT. COFFEE SHOP - DAY\n\nA WRITER sits at a table, typing furiously on a laptop. The screen shows an AI assistant helping craft the perfect scene.",
    30,
  )

  // Sample script formats for the tabs
  const scriptFormats = {
    film: `INT. APARTMENT - NIGHT

ALEX (30s) stares at the computer screen, the blue light illuminating their tired face.

ALEX
(whispering)
This is exactly what I needed.

The AI assistant highlights a section of dialogue and suggests an alternative that perfectly captures Alex's character voice.`,

    tv: `FADE IN:

INT. POLICE STATION - BULLPEN - DAY

DETECTIVE MORGAN (40s) pins evidence photos to a board while CAPTAIN RIVERA (50s) approaches.

CAPTAIN RIVERA
The commissioner wants an update by noon.

DETECTIVE MORGAN
(without looking up)
Tell him to join the queue.`,

    podcast: `HOST
Welcome to "Tech Horizons" where we explore the cutting edge of innovation. Today we're discussing AI in creative industries.

GUEST
It's fascinating how AI tools are now helping writers develop scripts and storylines without replacing the human creative element.

HOST
Exactly! It's augmentation rather than automation.`,

    commercial: `FADE IN:

EXT. MOUNTAIN VISTA - SUNRISE

A runner crests the hill as golden light bathes the landscape.

VOICEOVER
Every journey begins with a single step.

The runner stops, checks their watch - it's the new TimeX Pro.

VOICEOVER
TimeX Pro. For those who make every second count.`,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                ScriptAI
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-slate-700 hover:text-purple-600 transition-colors">
                Features
              </Link>
              <Link href="#workflow" className="text-slate-700 hover:text-purple-600 transition-colors">
                Workflow
              </Link>
              <Link href="#testimonials" className="text-slate-700 hover:text-purple-600 transition-colors">
                Testimonials
              </Link>
              <Link href="#pricing" className="text-slate-700 hover:text-purple-600 transition-colors">
                Pricing
              </Link>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
            <div className='flex items-center gap-4'>
          {session?.user ? (
            <>
              <div className="hidden md:flex items-center gap-4">
               
               
              </div>
              
              <UserAccountNav user={{
                ...session.user,
                image: session.user.image ?? "",
                name: session.user.name ?? "",   
                email: session.user.email ?? ""  
              }} />
            </>
          ) : (
            <Link href='/auth/signin'>
              <Button
                variant="ghost" 
                className='rounded-md px-6 py-2 text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:-translate-y-0.5'
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-md hover:shadow-lg">
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-slate-700 hover:text-purple-600 hover:bg-slate-100"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="#features"
                className="block px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-100 rounded-md"
              >
                Features
              </Link>
              <Link
                href="#workflow"
                className="block px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-100 rounded-md"
              >
                Workflow
              </Link>
              <Link
                href="#testimonials"
                className="block px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-100 rounded-md"
              >
                Testimonials
              </Link>
              <Link
                href="#pricing"
                className="block px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-100 rounded-md"
              >
                Pricing
              </Link>
              <div className="pt-4 pb-3 border-t border-slate-200">
              <div className='flex items-center gap-4'>
          {session?.user ? (
            <>
              <div className="hidden md:flex items-center gap-4">
               
               
              </div>
              
              <UserAccountNav user={{
                ...session.user,
                image: session.user.image ?? "",
                name: session.user.name ?? "",   
                email: session.user.email ?? ""  
              }} />
            </>
          ) : (
            <Link href='/auth/signin'>
              <Button 
                variant="ghost" 
                className='rounded-md px-6 py-2 text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:-translate-y-0.5'
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
                <button className="w-full mt-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 md:pt-20 lg:pt-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full mb-6">
                  AI-POWERED SCRIPTWRITING ASSISTANT
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Transform Your{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                    Ideas
                  </span>{" "}
                  Into Professional Scripts
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                  Craft compelling scripts with AI assistance that adapts to your style, helps you brainstorm, and
                  streamlines your creative workflow.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-md hover:shadow-lg text-lg font-medium">
                    Start Free Trial
                  </button>
                  <button className="px-8 py-3 border border-slate-300 hover:border-purple-600 hover:text-purple-600 rounded-md transition-colors text-lg font-medium flex items-center justify-center">
                    <Play size={18} className="mr-2" /> Watch Demo
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="text-slate-400 text-sm ml-2">ScriptAI Editor</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5">
                    <div className="bg-slate-900 text-slate-300 p-4 col-span-3 font-mono text-sm h-[400px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{typedText}</pre>
                    </div>
                    <div className="bg-slate-100 p-4 col-span-2 border-l border-slate-300">
                      <div className="text-sm font-medium text-slate-700 mb-3">AI Assistant</div>
                      <div className="space-y-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                          <div className="text-xs text-purple-600 font-medium mb-1">SUGGESTION</div>
                          <p className="text-sm text-slate-700">
                            Consider adding more sensory details about the coffee shop environment to establish the
                            mood.
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                          <div className="text-xs text-blue-600 font-medium mb-1">CHARACTER DEVELOPMENT</div>
                          <p className="text-sm text-slate-700">
                            The WRITER character could benefit from a brief description to help the reader visualize
                            them.
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg shadow-sm border border-purple-200">
                          <div className="text-xs text-purple-600 font-medium mb-1">STYLE ANALYSIS</div>
                          <p className="text-sm text-slate-700">
                            Your writing style is concise and visual. I'll maintain this approach in my suggestions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -z-10 top-1/2 right-0 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -z-10 top-1/3 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
              <path
                fill="#f8fafc"
                fillOpacity="1"
                d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ></path>
            </svg>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-slate-50" ref={featureRef}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Modern Scriptwriters</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Our AI-powered platform provides all the tools you need to craft compelling scripts, from initial
                concept to final draft.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "100ms" }}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap size={24} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Generation</h3>
                <p className="text-slate-600 mb-4">
                  Generate script content based on your inputs, with advanced options to control tone, style, and
                  format.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Personalized content generation</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Multiple script formats supported</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Character voice consistency</span>
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "200ms" }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Layers size={24} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Advanced Customization</h3>
                <p className="text-slate-600 mb-4">
                  Fine-tune your script with intuitive controls for tone, style imitation, and formatting templates.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Tone sliders for precise control</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Style imitation from examples</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Industry-standard templates</span>
                  </li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "300ms" }}
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users size={24} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Collaboration Tools</h3>
                <p className="text-slate-600 mb-4">
                  Work seamlessly with your team, share drafts, and manage feedback in one centralized platform.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Real-time collaborative editing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Comment and feedback system</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Role-based permissions</span>
                  </li>
                </ul>
              </div>

              {/* Feature 4 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "400ms" }}
              >
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <History size={24} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Version History</h3>
                <p className="text-slate-600 mb-4">
                  Track changes, compare versions, and restore previous drafts with comprehensive version control.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Unlimited version history</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Visual diff comparison</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">One-click restoration</span>
                  </li>
                </ul>
              </div>

              {/* Feature 5 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "500ms" }}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap size={24} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Creative Brainstorming</h3>
                <p className="text-slate-600 mb-4">
                  Generate ideas, explore plot directions, and overcome writer's block with AI-powered brainstorming.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Plot development assistance</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Character backstory generation</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Scene setting suggestions</span>
                  </li>
                </ul>
              </div>

              {/* Feature 6 */}
              <div
                className={`bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-500 ${featureVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "600ms" }}
              >
                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                  <Monitor size={24} className="text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cross-Platform Access</h3>
                <p className="text-slate-600 mb-4">
                  Access your scripts from any device with seamless synchronization across desktop, tablet, and mobile.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Desktop application (Mac & Windows)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Mobile apps (iOS & Android)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Web-based editor</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Script Format Showcase */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Create Any Script Format</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Whether you're writing for film, TV, podcasts, or commercials, our AI adapts to the specific format you
                need.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="flex flex-wrap border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("film")}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === "film" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-600 hover:text-purple-600"}`}
                >
                  Film Script
                </button>
                <button
                  onClick={() => setActiveTab("tv")}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === "tv" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-600 hover:text-purple-600"}`}
                >
                  TV Script
                </button>
                <button
                  onClick={() => setActiveTab("podcast")}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === "podcast" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-600 hover:text-purple-600"}`}
                >
                  Podcast Script
                </button>
                <button
                  onClick={() => setActiveTab("commercial")}
                  className={`px-6 py-3 text-sm font-medium ${activeTab === "commercial" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-600 hover:text-purple-600"}`}
                >
                  Commercial
                </button>
              </div>

              <div className="p-6 bg-white">
                <pre className="font-mono text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                  {scriptFormats[activeTab as keyof typeof scriptFormats]}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-20 bg-gradient-to-b from-slate-50 to-white" ref={workflowRef}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">From Idea to Finished Script</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Our streamlined workflow helps you transform your creative concepts into polished, production-ready
                scripts.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>

              {/* Workflow steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                {/* Step 1 */}
                <div
                  className={`transition-all duration-500 ${workflowVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: "100ms" }}
                >
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 h-full">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                      1
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-center">Ideation</h3>
                    <p className="text-slate-600 text-center mb-4">
                      Start with a concept or use AI-powered brainstorming to generate ideas for your script.
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center mb-2">
                        <Zap size={16} className="text-purple-600 mr-2" />
                        <span className="text-sm font-medium">AI Suggestion</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        "How about a story about a detective who can only solve crimes while sleepwalking?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  className={`transition-all duration-500 ${workflowVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: "200ms" }}
                >
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 h-full">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                      2
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-center">Outline</h3>
                    <p className="text-slate-600 text-center mb-4">
                      Structure your story with scene breakdowns, character arcs, and plot points.
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <ul className="text-xs text-slate-600 space-y-2">
                        <li className="flex items-start">
                          <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 flex-shrink-0 mt-0.5 mr-2"></div>
                          <span>Act 1: Detective discovers his ability</span>
                        </li>
                        <li className="flex items-start">
                          <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 flex-shrink-0 mt-0.5 mr-2"></div>
                          <span>Act 2: Struggles to control sleepwalking</span>
                        </li>
                        <li className="flex items-start">
                          <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 flex-shrink-0 mt-0.5 mr-2"></div>
                          <span>Act 3: Solves major case while asleep</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  className={`transition-all duration-500 ${workflowVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: "300ms" }}
                >
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 h-full">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                      3
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-center">Draft</h3>
                    <p className="text-slate-600 text-center mb-4">
                      Write your script with AI assistance, generating dialogue and scene descriptions.
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs">
                      <p className="text-slate-600">
                        INT. POLICE STATION - NIGHT
                        <br />
                        <br />
                        DETECTIVE MORGAN sits at his desk, surrounded by case files. His eyes are heavy.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  className={`transition-all duration-500 ${workflowVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: "400ms" }}
                >
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 h-full">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                      4
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-center">Polish</h3>
                    <p className="text-slate-600 text-center mb-4">
                      Refine your script with feedback, revisions, and professional formatting.
                    </p>
                    <div className="flex justify-center">
                      <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-200 transition-colors">
                        Export Final Draft
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-slate-900 text-white" ref={testimonialsRef}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Writers Love Our Platform</h2>
              <p className="text-lg text-slate-300 max-w-3xl mx-auto">
                See how ScriptAI has helped writers across the industry create better scripts in less time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div
                className={`bg-slate-800 rounded-xl p-6 border border-slate-700 transition-all duration-500 ${testimonialsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "100ms" }}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold mr-4">
                    JD
                  </div>
                  <div>
                    <h4 className="font-medium">James Donovan</h4>
                    <p className="text-sm text-slate-400">TV Writer, "Dark Horizons"</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300">
                  "ScriptAI has completely transformed my writing process. The AI suggestions help me overcome writer's
                  block, and the collaboration tools make working with my team seamless."
                </p>
              </div>

              {/* Testimonial 2 */}
              <div
                className={`bg-slate-800 rounded-xl p-6 border border-slate-700 transition-all duration-500 ${testimonialsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "200ms" }}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold mr-4">
                    SR
                  </div>
                  <div>
                    <h4 className="font-medium">Sarah Rodriguez</h4>
                    <p className="text-sm text-slate-400">Screenwriter</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < 4 ? "text-yellow-400 fill-yellow-400" : "text-yellow-400"}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300">
                  "The style imitation feature is incredible. I uploaded samples of my favorite writers, and the AI
                  helped me craft dialogue that matched their voice while still feeling authentic to my story."
                </p>
              </div>

              {/* Testimonial 3 */}
              <div
                className={`bg-slate-800 rounded-xl p-6 border border-slate-700 transition-all duration-500 ${testimonialsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{ transitionDelay: "300ms" }}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-700 flex items-center justify-center text-white font-bold mr-4">
                    MT
                  </div>
                  <div>
                    <h4 className="font-medium">Michael Torres</h4>
                    <p className="text-sm text-slate-400">Indie Filmmaker</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300">
                  "As an independent filmmaker, I need tools that are powerful but affordable. ScriptAI gives me
                  everything I need to write professional scripts without breaking the bank."
                </p>
              </div>
            </div>

            {/* Example Script */}
            <div className="mt-16 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 max-w-4xl mx-auto">
              <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                <div className="text-sm font-medium">Example Script: "The Midnight Detective"</div>
                <div className="flex items-center">
                  <span className="text-xs text-slate-300 mr-2">Created with ScriptAI</span>
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                </div>
              </div>
              <div className="p-6 font-mono text-sm">
                <pre className="whitespace-pre-wrap text-slate-300">
                  {`FADE IN:

EXT. CITY STREETS - NIGHT

Rain falls on empty streets. A lone figure walks under a flickering streetlight.

DETECTIVE MORGAN (V.O.)
They say the night holds secrets. But for me,
it's when the truth comes out to play.

INT. APARTMENT - NIGHT

DETECTIVE MORGAN (40s), disheveled but sharp-eyed, stares at a wall covered in photos, notes, and red string.

DETECTIVE MORGAN
It's here somewhere. The connection.

His phone RINGS. He answers.

DETECTIVE MORGAN
Morgan.

CAPTAIN RIVERA (V.O.)
(through phone)
We've got another one. Same signature.

Morgan's eyes narrow. He touches a photo on the wall.

DETECTIVE MORGAN
I'll be right there.`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Cross-Platform Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Write Anywhere, Anytime</h2>
                <p className="text-lg text-slate-600 mb-8">
                  Access your scripts from any device with our cross-platform applications. Your work syncs
                  automatically, so you can start writing on your desktop and continue on your phone.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <Monitor size={32} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-sm font-medium">Desktop App</p>
                    <p className="text-xs text-slate-500">Windows & Mac</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <Tablet size={32} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-sm font-medium">Tablet App</p>
                    <p className="text-xs text-slate-500">iPad & Android</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <Smartphone size={32} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-sm font-medium">Mobile App</p>
                    <p className="text-xs text-slate-500">iOS & Android</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-slate-100 rounded-xl p-8 relative z-10">
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="absolute -top-6 -left-6">
                        <div className="w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center">
                          <Monitor size={24} className="text-purple-600" />
                        </div>
                      </div>
                      <div className="absolute -top-6 -right-6">
                        <div className="w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center">
                          <Smartphone size={24} className="text-purple-600" />
                        </div>
                      </div>
                      <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Seamless Synchronization</h3>
                    <p className="text-slate-600">
                      Your scripts are automatically synced across all your devices in real-time.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-md hover:shadow-lg text-sm font-medium flex items-center">
                      Download Apps <ArrowRight size={16} className="ml-2" />
                    </button>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
                <div className="absolute -z-10 -top-10 -left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {/* <section className="py-20 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Scriptwriting?</h2>
              <p className="text-xl mb-8">
                Join thousands of writers who are creating professional scripts faster and easier than ever before.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-3 bg-white text-purple-600 hover:bg-slate-100 rounded-md transition-colors shadow-md hover:shadow-lg text-lg font-medium">
                  Start Free Trial
                </button>
                <button className="px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-md transition-colors shadow-md hover:shadow-lg text-lg font-medium border border-purple-500">
                  View Pricing
                </button>
              </div>
              <p className="mt-6 text-sm text-purple-200">No credit card required. 14-day free trial.</p>
            </div>
          </div>
        </section> */}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                ScriptAI
              </div>
              <p className="mb-4">
                AI-powered scriptwriting assistant that helps you create professional scripts with ease.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Tutorials
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 mt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} ScriptAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

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
        
        .animate-blob {
          animation: blob 7s infinite;
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


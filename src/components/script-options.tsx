"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const predefinedTones = ["Dramatic", "Comedic", "Sarcastic", "Serious", "Lighthearted"]
const predefinedStyles = ["Narrative", "Dialogic", "Cinematic", "Descriptive", "Minimalist"]
const predefinedTemplates = [
  { id: "template-1", name: "Movie Script" },
  { id: "template-2", name: "Stage Play" },
  { id: "template-3", name: "Web Series Script" },
]

interface ScriptOptionsProps {
  tone: string
  setTone: (tone: string) => void
  style: string
  setStyle: (style: string) => void
  template: string
  setTemplate: (template: string) => void
}

export function ScriptOptions({ tone, setTone, style, setStyle, template, setTemplate }: ScriptOptionsProps) {
  const [openTone, setOpenTone] = useState(false)
  const [openStyle, setOpenStyle] = useState(false)
  const [openTemplate, setOpenTemplate] = useState(false)
  const [searchTone, setSearchTone] = useState("")
  const [searchStyle, setSearchStyle] = useState("")
  const [searchTemplate, setSearchTemplate] = useState("")

  const toneRef = useRef<HTMLDivElement | null>(null)
  const styleRef = useRef<HTMLDivElement | null>(null)
  const templateRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toneRef.current && !toneRef.current.contains(event.target as Node)) {
        setOpenTone(false)
      }
      if (styleRef.current && !styleRef.current.contains(event.target as Node)) {
        setOpenStyle(false)
      }
      if (templateRef.current && !templateRef.current.contains(event.target as Node)) {
        setOpenTemplate(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const filteredTones = predefinedTones.filter((t) => t.toLowerCase().includes(searchTone.toLowerCase()))

  const filteredStyles = predefinedStyles.filter((s) => s.toLowerCase().includes(searchStyle.toLowerCase()))

  const filteredTemplates = predefinedTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchTemplate.toLowerCase()),
  )

  const CustomDropdown = ({
    open,
    setOpen,
    value,
    setValue,
    options,
    placeholder,
    searchValue,
    setSearchValue,
    ref,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    value: string
    setValue: (value: string) => void
    options: string[] | { id: string; name: string }[]
    placeholder: string
    searchValue: string
    setSearchValue: (value: string) => void
    ref: React.MutableRefObject<HTMLDivElement | null>
  }) => (
    <div ref={ref} className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {(options as any[]).map((option, index) => (
              <div
                key={index}
                className={cn(
                  "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  (typeof option === "string" ? option : option.name) === value
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground",
                )}
                onClick={() => {
                  setValue(typeof option === "string" ? option : option.id)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    (typeof option === "string" ? option : option.name) === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {typeof option === "string" ? option : option.name}
              </div>
            ))}
            {(options as any[]).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">No results found.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tone</Label>
        <CustomDropdown
          open={openTone}
          setOpen={setOpenTone}
          value={tone}
          setValue={setTone}
          options={filteredTones}
          placeholder="Select tone..."
          searchValue={searchTone}
          setSearchValue={setSearchTone}
          ref={toneRef}
        />
        <Input
          placeholder="Or enter custom tone..."
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="mt-2"
        />
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <CustomDropdown
          open={openStyle}
          setOpen={setOpenStyle}
          value={style}
          setValue={setStyle}
          options={filteredStyles}
          placeholder="Select style..."
          searchValue={searchStyle}
          setSearchValue={setSearchStyle}
          ref={styleRef}
        />
        <Input
          placeholder="Or enter custom style..."
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="mt-2"
        />
      </div>
      <div className="space-y-2">
        <Label>Template</Label>
        <CustomDropdown
          open={openTemplate}
          setOpen={setOpenTemplate}
          value={template}
          setValue={setTemplate}
          options={filteredTemplates}
          placeholder="Select template..."
          searchValue={searchTemplate}
          setSearchValue={setSearchTemplate}
          ref={templateRef}
        />
        <Input
          placeholder="Or enter custom template..."
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="mt-2"
        />
      </div>
    </div>
  )
}

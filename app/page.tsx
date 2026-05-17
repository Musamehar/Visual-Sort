"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart3,
  Terminal,
  Cpu,
  HardDrive,
  UploadCloud,
  ChevronDown,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  AlertTriangle,
  Flag,
  Zap,
  AlertCircle,
} from "lucide-react"
import { sortWithAssemblyBackend, checkApiHealth, type SortResponse } from "@/lib/assembly-service"

// ---------- helpers ----------
type Frame = number[]

type SortEvent = {
  type: "init" | "compare" | "swap" | "done"
  indices: number[]
  values?: number[]
}

type AlgorithmKey = "Bubble Sort" | "Selection Sort" | "Insertion Sort" | "Quick Sort" | "Merge Sort"

function generateBubbleSortFrames(arr: number[]): { frames: Frame[]; events: SortEvent[] } {
  const frames: Frame[] = []
  const events: SortEvent[] = []
  const a = [...arr]
  frames.push([...a])
  events.push({ type: "init", indices: [] })

  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      frames.push([...a])
      events.push({ type: "compare", indices: [j, j + 1], values: [a[j], a[j + 1]] })
      if (a[j] > a[j + 1]) {
        const tmp = a[j]
        a[j] = a[j + 1]
        a[j + 1] = tmp
        frames.push([...a])
        events.push({ type: "swap", indices: [j, j + 1], values: [a[j], a[j + 1]] })
      }
    }
  }
  frames.push([...a])
  events.push({ type: "done", indices: [] })
  return { frames, events }
}

function generateSelectionSortFrames(arr: number[]): { frames: Frame[]; events: SortEvent[] } {
  const frames: Frame[] = []
  const events: SortEvent[] = []
  const a = [...arr]
  frames.push([...a])
  events.push({ type: "init", indices: [] })

  for (let i = 0; i < a.length - 1; i++) {
    let min = i
    for (let j = i + 1; j < a.length; j++) {
      frames.push([...a])
      events.push({ type: "compare", indices: [min, j], values: [a[min], a[j]] })
      if (a[j] < a[min]) min = j
    }
    if (min !== i) {
      const tmp = a[i]
      a[i] = a[min]
      a[min] = tmp
      frames.push([...a])
      events.push({ type: "swap", indices: [i, min], values: [a[i], a[min]] })
    }
  }
  frames.push([...a])
  events.push({ type: "done", indices: [] })
  return { frames, events }
}

function generateInsertionSortFrames(arr: number[]): { frames: Frame[]; events: SortEvent[] } {
  const frames: Frame[] = []
  const events: SortEvent[] = []
  const a = [...arr]
  frames.push([...a])
  events.push({ type: "init", indices: [] })

  for (let i = 1; i < a.length; i++) {
    let j = i
    while (j > 0) {
      frames.push([...a])
      events.push({ type: "compare", indices: [j - 1, j], values: [a[j - 1], a[j]] })
      if (a[j - 1] > a[j]) {
        const tmp = a[j - 1]
        a[j - 1] = a[j]
        a[j] = tmp
        frames.push([...a])
        events.push({ type: "swap", indices: [j - 1, j], values: [a[j - 1], a[j]] })
        j--
      } else {
        break
      }
    }
  }
  frames.push([...a])
  events.push({ type: "done", indices: [] })
  return { frames, events }
}

function generateQuickSortFrames(arr: number[]): { frames: Frame[]; events: SortEvent[] } {
  const frames: Frame[] = []
  const events: SortEvent[] = []
  const a = [...arr]
  frames.push([...a])
  events.push({ type: "init", indices: [] })

  const partition = (low: number, high: number): number => {
    const pivot = a[high]
    let i = low - 1
    for (let j = low; j < high; j++) {
      frames.push([...a])
      events.push({ type: "compare", indices: [j, high], values: [a[j], pivot] })
      if (a[j] <= pivot) {
        i++
        if (i !== j) {
          const tmp = a[i]
          a[i] = a[j]
          a[j] = tmp
          frames.push([...a])
          events.push({ type: "swap", indices: [i, j], values: [a[i], a[j]] })
        }
      }
    }
    if (i + 1 !== high) {
      const tmp = a[i + 1]
      a[i + 1] = a[high]
      a[high] = tmp
      frames.push([...a])
      events.push({ type: "swap", indices: [i + 1, high], values: [a[i + 1], a[high]] })
    }
    return i + 1
  }

  const quick = (low: number, high: number) => {
    if (low < high) {
      const p = partition(low, high)
      quick(low, p - 1)
      quick(p + 1, high)
    }
  }

  quick(0, a.length - 1)
  frames.push([...a])
  events.push({ type: "done", indices: [] })
  return { frames, events }
}

function generateMergeSortFrames(arr: number[]): { frames: Frame[]; events: SortEvent[] } {
  const frames: Frame[] = []
  const events: SortEvent[] = []
  const a = [...arr]
  frames.push([...a])
  events.push({ type: "init", indices: [] })

  const merge = (l: number, m: number, r: number) => {
    const left = a.slice(l, m + 1)
    const right = a.slice(m + 1, r + 1)
    let i = 0
    let j = 0
    let k = l
    while (i < left.length && j < right.length) {
      frames.push([...a])
      events.push({ type: "compare", indices: [l + i, m + 1 + j], values: [left[i], right[j]] })
      if (left[i] <= right[j]) {
        a[k++] = left[i++]
      } else {
        a[k++] = right[j++]
      }
      frames.push([...a])
      events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] })
    }
    while (i < left.length) {
      a[k++] = left[i++]
      frames.push([...a])
      events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] })
    }
    while (j < right.length) {
      a[k++] = right[j++]
      frames.push([...a])
      events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] })
    }
  }

  const mergeSort = (l: number, r: number) => {
    if (l >= r) return
    const m = Math.floor((l + r) / 2)
    mergeSort(l, m)
    mergeSort(m + 1, r)
    merge(l, m, r)
  }

  mergeSort(0, a.length - 1)
  frames.push([...a])
  events.push({ type: "done", indices: [] })
  return { frames, events }
}

function generateFrames(
  algorithm: AlgorithmKey,
  arr: number[],
): { frames: Frame[]; events: SortEvent[] } {
  switch (algorithm) {
    case "Selection Sort":
      return generateSelectionSortFrames(arr)
    case "Insertion Sort":
      return generateInsertionSortFrames(arr)
    case "Quick Sort":
      return generateQuickSortFrames(arr)
    case "Merge Sort":
      return generateMergeSortFrames(arr)
    case "Bubble Sort":
    default:
      return generateBubbleSortFrames(arr)
  }
}

const ALGORITHMS: Array<{
  key: AlgorithmKey
  short: string
  description: string
  best: string
  avg: string
  worst: string
  space: string
  stable: boolean
  code: string
}> = [
  {
    key: "Bubble Sort",
    short: "BUBBLE_SORT",
    description:
      "Repeatedly steps through the list, compares adjacent pairs, and swaps them if they are in the wrong order. The largest element bubbles to the end on each pass.",
    best: "O(n)",
    avg: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: `for i in 0..n-1:
  for j in 0..n-1-i:
    if a[j] > a[j+1]:
      swap(a[j], a[j+1])`,
  },
  {
    key: "Selection Sort",
    short: "SELECTION_SORT",
    description:
      "Divides the array into a sorted and unsorted region. Repeatedly selects the minimum element from the unsorted region and moves it to the boundary.",
    best: "O(n²)",
    avg: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: false,
    code: `for i in 0..n-1:
  min = i
  for j in i+1..n:
    if a[j] < a[min]:
      min = j
  swap(a[i], a[min])`,
  },
  {
    key: "Insertion Sort",
    short: "INSERTION_SORT",
    description:
      "Builds the sorted array one element at a time by inserting each new element into its correct position relative to the already-sorted prefix.",
    best: "O(n)",
    avg: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: `for i in 1..n:
  j = i
  while j > 0 and a[j-1] > a[j]:
    swap(a[j-1], a[j])
    j -= 1`,
  },
  {
    key: "Quick Sort",
    short: "QUICK_SORT",
    description:
      "Divide-and-conquer routine that picks a pivot, partitions the array into elements less than and greater than the pivot, then recursively sorts the two partitions.",
    best: "O(n log n)",
    avg: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n)",
    stable: false,
    code: `quick(lo, hi):
  if lo < hi:
    p = partition(lo, hi)
    quick(lo, p-1)
    quick(p+1, hi)`,
  },
  {
    key: "Merge Sort",
    short: "MERGE_SORT",
    description:
      "Recursively splits the array in half, sorts each half, and merges the two sorted halves back into a single sorted sequence.",
    best: "O(n log n)",
    avg: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
    stable: true,
    code: `merge_sort(l, r):
  if l >= r: return
  m = (l + r) / 2
  merge_sort(l, m)
  merge_sort(m+1, r)
  merge(l, m, r)`,
  },
]

const DEFAULT_DATA = [12, 34, 5, 89, 21, 45, 67, 78, 42, 92, 12, 56, 30, 71, 19, 84, 61, 23, 95, 48, 73, 25, 88, 52, 31]

// ---------- top nav ----------
function TopNav() {
  const tabs = ["Dashboard"]
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-lowest border-b border-border-line flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[15px] font-bold tracking-tight text-primary-soft">Visual Sort v1.0</span>
      </div>
      <nav className="hidden md:flex items-center h-full gap-8">
        {tabs.map((t, i) => (
          <a
            key={t}
            href="#"
            className={`h-full flex items-center font-mono text-[13px] transition-colors ${
              i === 0
                ? "text-primary border-b-2 border-primary"
                : "text-muted-fg hover:text-primary"
            }`}
          >
            {t}
          </a>
        ))}
      </nav>
    </header>
  )
}

// ---------- sidebar ----------
type ViewKey = "Visualizer" | "Algorithms" | "Memory Map" | "Registers"

type SidebarProps = {
  algorithm: AlgorithmKey
  setAlgorithm: (v: AlgorithmKey) => void
  speed: number
  setSpeed: (n: number) => void
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onStepBack: () => void
  onStepForward: () => void
  onUpload: (file: File) => void
  fileName: string | null
  onExecute: () => void
  view: ViewKey
  setView: (v: ViewKey) => void
  useAssemblyBackend: boolean
  setUseAssemblyBackend: (v: boolean) => void
  apiHealthy: boolean | null
  isBackendProcessing: boolean
  backendError: string | null
}

function Sidebar({
  algorithm,
  setAlgorithm,
  speed,
  setSpeed,
  isPlaying,
  onPlay,
  onPause,
  onStepBack,
  onStepForward,
  onUpload,
  fileName,
  onExecute,
  view,
  setView,
  useAssemblyBackend,
  setUseAssemblyBackend,
  apiHealthy,
  isBackendProcessing,
  backendError,
}: SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const navItems: Array<{ label: ViewKey; icon: typeof BarChart3 }> = [
    { label: "Visualizer", icon: BarChart3 },
    { label: "Algorithms", icon: Terminal },
    { label: "Memory Map", icon: Cpu },
    { label: "Registers", icon: HardDrive },
  ]

  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-[320px] z-40 bg-surface-low border-r border-border-line flex-col pt-4">
      <div className="px-4 mb-6">
        <h2 className="font-mono text-[15px] font-bold text-primary-soft uppercase tracking-wider">CONTROL CENTER</h2>
        <p className="font-mono text-[12px] text-muted-fg mt-1">X86_64_ENGINE</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.label === view
          return (
            <button
              key={item.label}
              onClick={() => setView(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all text-left ${
                active
                  ? "bg-primary text-on-primary font-semibold border-l-4 border-primary-soft"
                  : "text-muted-fg hover:bg-surface-high hover:text-foreground border-l-4 border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-mono text-[13px]">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border-line space-y-4">
        {/* Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-outline-variant rounded-sm p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-surface-high transition-all"
        >
          <UploadCloud className="w-5 h-5 text-outline mb-2" />
          <span className="font-mono text-[12px] text-muted-fg">
            {fileName ? `Upload ${fileName}` : "Upload sort_data.txt"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
            }}
          />
        </div>

        {/* Algorithm dropdown */}
        <div>
          <label className="block font-mono text-[11px] text-muted-fg uppercase mb-1.5 tracking-wider">
            Algorithm Type
          </label>
          <div className="relative">
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmKey)}
              className="w-full bg-surface-lowest text-foreground border border-outline-variant rounded-sm px-3 py-2 font-mono text-[13px] focus:border-primary focus:ring-1 focus:ring-primary appearance-none outline-none transition-colors"
            >
              <option>Bubble Sort</option>
              <option>Selection Sort</option>
              <option>Insertion Sort</option>
              <option>Quick Sort</option>
              <option>Merge Sort</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline" />
          </div>
        </div>

        {/* Media controls */}
        <div className="flex justify-between items-center gap-1 bg-surface-container rounded-sm p-1 border border-outline-variant">
          <button
            onClick={onStepBack}
            className="flex-1 py-1.5 rounded-sm hover:bg-surface-high text-foreground flex justify-center items-center transition-all active:scale-90"
            aria-label="Step back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlay}
            className={`flex-1 py-1.5 rounded-sm hover:bg-surface-high flex justify-center items-center transition-all active:scale-90 ${
              isPlaying ? "text-primary" : "text-foreground"
            }`}
            aria-label="Play"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={onPause}
            className="flex-1 py-1.5 rounded-sm hover:bg-surface-high text-foreground flex justify-center items-center transition-all active:scale-90"
            aria-label="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={onStepForward}
            className="flex-1 py-1.5 rounded-sm hover:bg-surface-high text-foreground flex justify-center items-center transition-all active:scale-90"
            aria-label="Step forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed */}
        <div>
          <label className="block font-mono text-[11px] text-muted-fg uppercase mb-3 tracking-wider">
            Animation Speed
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={speed}
            onChange={(e) => setSpeed(Number.parseInt(e.target.value, 10))}
            aria-label="Animation speed"
            className="speed-slider w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${speed}%, var(--outline-variant) ${speed}%, var(--outline-variant) 100%)`,
            }}
          />
        </div>

        {/* Assembly Backend Toggle */}
        {apiHealthy !== null && (
          <div className="border border-outline-variant rounded-sm p-3 bg-surface-container">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-mono text-[11px] text-muted-fg uppercase mb-0 tracking-wider">
                Backend Mode
              </label>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-mono tracking-widest ${
                  apiHealthy
                    ? "bg-primary/20 text-primary-soft"
                    : "bg-outline-variant/20 text-outline"
                }`}
              >
                {apiHealthy ? "✓ API Ready" : "✗ API Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseAssemblyBackend(false)}
                className={`flex-1 py-1.5 px-2 rounded-sm text-[11px] font-mono font-semibold transition-all ${
                  !useAssemblyBackend
                    ? "bg-primary text-on-primary"
                    : "bg-surface-lowest text-muted-fg hover:text-foreground border border-outline-variant"
                }`}
              >
                JS
              </button>
              <button
                onClick={() => setUseAssemblyBackend(true)}
                disabled={!apiHealthy}
                className={`flex-1 py-1.5 px-2 rounded-sm text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1 ${
                  useAssemblyBackend && apiHealthy
                    ? "bg-accent-orange text-on-primary"
                    : "bg-surface-lowest text-muted-fg border border-outline-variant"
                } ${!apiHealthy ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Zap className="w-3 h-3" />
                ASM
              </button>
            </div>
            {backendError && (
              <div className="mt-2 p-2 bg-accent-orange/10 border border-accent-orange/30 rounded-sm flex gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-accent-orange flex-shrink-0 mt-0.5" />
                <span className="font-mono text-[10px] text-accent-orange leading-tight">
                  {backendError}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Execute */}
        <button
          onClick={onExecute}
          disabled={isBackendProcessing}
          className={`w-full bg-primary text-on-primary font-mono text-[13px] py-2.5 rounded-sm hover:bg-primary-soft transition-all active:scale-[0.98] uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(77,148,255,0.25)] hover:shadow-[0_0_18px_rgba(77,148,255,0.45)] ${
            isBackendProcessing ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isBackendProcessing ? "PROCESSING..." : "EXECUTE_SORT"}
        </button>
      </div>
    </aside>
  )
}

// ---------- visualizer bars ----------
function Visualizer({
  frame,
  compareIdx,
  swapIdx,
  pivotIdx,
  maxValue,
  transitionMs,
}: {
  frame: Frame
  compareIdx: number[]
  swapIdx: number[]
  pivotIdx: number | null
  maxValue: number
  transitionMs: number
}) {
  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40 grid-bg" aria-hidden />
      <div className="w-full max-w-5xl h-full flex items-end justify-center gap-1 z-10 pt-8">
        {frame.map((value, idx) => {
          const isCompare = compareIdx.includes(idx)
          const isSwap = swapIdx.includes(idx)
          const isPivot = pivotIdx === idx
          const isOrange = isCompare || isSwap
          const heightPct = Math.max(2, (value / maxValue) * 100)

          return (
            <div
              key={idx}
              className={`relative w-full rounded-t-[2px] ease-out ${
                isOrange
                  ? "bg-accent-orange active-bar border-t-2 border-accent-orange-soft"
                  : isPivot
                    ? "bg-primary border-t-2 border-primary-soft shadow-[0_0_10px_rgba(77,148,255,0.45)]"
                    : "bg-slate"
              }`}
              style={{
                height: `${heightPct}%`,
                transition: `height ${transitionMs}ms ease-out, background-color ${transitionMs}ms ease-out`,
              }}
            >
              {isOrange && (
                <span
                  className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-accent-orange-soft leading-none select-none"
                  aria-hidden
                >
                  |
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- console ----------
type LogLine = { id: number; kind: "SYS" | "RUN" | "CMP" | "MEM" | "OK"; text: string; highlight?: boolean }

function Console({
  logs,
  frameIdx,
  totalFrames,
  execTime,
  swaps,
  isMinimized,
  onMinimizeChange,
}: {
  logs: LogLine[]
  frameIdx: number
  totalFrames: number
  execTime: number
  swaps: number
  isMinimized: boolean
  onMinimizeChange: (minimized: boolean) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"Logs">("Logs")
  const [originalHeight] = useState(220)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length])

  const tabs: Array<typeof activeTab> = ["Logs"]

  return (
    <footer className={`fixed bottom-0 right-0 left-0 md:left-[320px] z-30 flex flex-col transition-all duration-300 ${
      isMinimized ? "pointer-events-none" : "bg-surface-lowest border-t border-border-line"
    }`} style={{ height: isMinimized ? "40px" : `${originalHeight}px` }}>
      <div className={`flex items-center justify-between px-4 py-2 ${
        isMinimized ? "bg-surface-container border-t border-border-line pointer-events-auto" : "bg-surface-container border-b border-border-line"
      }`}>
        <div className="flex items-center gap-5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative font-mono text-[13px] pb-1 transition-colors ${
                activeTab === t
                  ? "text-accent-orange font-bold"
                  : "text-outline hover:text-accent-orange-soft"
              }`}
            >
              {t}
              {activeTab === t && (
                <span className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-accent-orange" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[12px] text-outline tracking-wider">
            SYSTEM_STABLE // KERNEL_0.4.2
          </span>
          <button
            onClick={() => onMinimizeChange(!isMinimized)}
            className="text-outline hover:text-primary transition-colors"
            aria-label={isMinimized ? "Expand logs" : "Minimize logs"}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8V4m0 0L13 8m4-4l-4-4m-6 16v4m0 0l4-4m-4 4l4 4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: logs */}
          <div
            ref={scrollRef}
            className="flex-1 border-r border-border-line p-3 overflow-y-auto terminal-scroll bg-[#08090c] font-mono text-[12.5px] text-muted-fg flex flex-col gap-1 leading-relaxed"
          >
            {activeTab === "Logs" &&
              logs.map((l, i) => (
                <div key={l.id} className={l.kind === "CMP" ? "text-accent-orange" : "text-muted-fg"}>
                  {l.kind === "RUN" ? (
                    <span className="text-foreground font-bold">{l.text}</span>
                  ) : l.kind === "MEM" ? (
                    <MemLine text={l.text} />
                  ) : (
                    <span>{l.text}</span>
                  )}
                  {i === logs.length - 1 && <span className="cursor-blink" />}
                </div>
              ))}
            {activeTab !== "Logs" && (
              <div className="text-outline italic">[{activeTab.toUpperCase()}] stream idle…</div>
            )}
          </div>

          {/* Right: metrics */}
          <div className="w-[280px] p-4 flex flex-col gap-3 bg-surface-low">
            <MetricRow label="FRAME" value={`${frameIdx} / ${totalFrames}`} />
            <MetricRow label="EXEC TIME" value={`${execTime}ms`} />
            <MetricRow label="SWAPS" value={`${swaps}`} highlight />
          </div>
        </div>
      )}
    </footer>
  )
}

function MemLine({ text }: { text: string }) {
  // Handle original/sorted array display
  if (text.startsWith("[ORIGINAL]") || text.startsWith("[SORTED]")) {
    const isOriginal = text.startsWith("[ORIGINAL]")
    const label = isOriginal ? "Original Array" : "Sorted Array"
    const arrayStr = text.split(":").slice(1).join(":").trim()
    return (
      <span>
        <span className={isOriginal ? "text-outline" : "text-primary-soft font-bold"}>{label} : </span>
        <span className="text-muted-fg">{arrayStr}</span>
      </span>
    )
  }

  // highlight first two integers in array dump as accent
  const m = text.match(/^(\[MEM\] Array state: )(\[)(.*)(\])$/)
  if (!m) return <span>{text}</span>
  const items = m[3].split(",").map((s) => s.trim())
  return (
    <span>
      <span className="text-muted-fg">{m[1]}</span>
      <span className="text-outline">[</span>
      {items.map((it, i) => (
        <span key={i} className={i < 2 ? "text-accent-orange font-bold" : "text-muted-fg"}>
          {it}
          {i < items.length - 1 ? ", " : ""}
        </span>
      ))}
      <span className="text-outline">]</span>
    </span>
  )
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border-line pb-2">
      <span className="font-mono text-[11px] text-muted-fg uppercase tracking-widest">{label}</span>
      <span
        className={`font-mono text-[18px] font-bold ${
          highlight ? "text-accent-orange drop-shadow-[0_0_8px_rgba(255,107,26,0.6)]" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ---------- algorithms page ----------
function AlgorithmsPage({
  algorithm,
  setAlgorithm,
  goToVisualizer,
}: {
  algorithm: AlgorithmKey
  setAlgorithm: (k: AlgorithmKey) => void
  goToVisualizer: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto terminal-scroll p-8 relative">
      <div className="absolute inset-0 z-0 opacity-20 grid-bg pointer-events-none" aria-hidden />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="font-mono text-[11px] text-muted-fg uppercase tracking-widest mb-2">
            // Visual Sort :: KERNEL_0.4.2
          </p>
          <h1 className="font-mono text-[28px] font-bold text-foreground tracking-tight">
            Algorithm Registry
          </h1>
          <p className="font-mono text-[13px] text-muted-fg mt-2 max-w-2xl">
            Three sort routines are loaded into the runtime. Select one to load it into the
            visualizer pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ALGORITHMS.map((algo) => {
            const active = algo.key === algorithm
            return (
              <article
                key={algo.key}
                className={`rounded-sm border bg-surface-low p-5 flex flex-col gap-4 transition-all ${
                  active
                    ? "border-primary shadow-[0_0_20px_rgba(77,148,255,0.18)]"
                    : "border-border-line hover:border-outline"
                }`}
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] text-muted-fg uppercase tracking-widest">
                      ROUTINE
                    </p>
                    <h2 className="font-mono text-[15px] font-bold text-primary-soft">
                      {algo.short}
                    </h2>
                  </div>
                  {active ? (
                    <span className="font-mono text-[10px] text-on-primary bg-primary px-2 py-0.5 rounded-sm uppercase tracking-widest">
                      Active
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-outline border border-outline-variant px-2 py-0.5 rounded-sm uppercase tracking-widest">
                      Idle
                    </span>
                  )}
                </header>

                <p className="font-mono text-[12.5px] text-muted-fg leading-relaxed">
                  {algo.description}
                </p>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[12px]">
                  <ComplexityRow label="BEST" value={algo.best} />
                  <ComplexityRow label="AVG" value={algo.avg} />
                  <ComplexityRow label="WORST" value={algo.worst} highlight />
                  <ComplexityRow label="SPACE" value={algo.space} />
                  <ComplexityRow
                    label="STABLE"
                    value={algo.stable ? "YES" : "NO"}
                  />
                </dl>

                <pre className="bg-[#08090c] border border-border-line rounded-sm p-3 font-mono text-[11.5px] text-muted-fg leading-relaxed overflow-x-auto">
                  <code>{algo.code}</code>
                </pre>

                <button
                  onClick={() => {
                    setAlgorithm(algo.key)
                    goToVisualizer()
                  }}
                  className={`mt-auto w-full font-mono text-[12px] py-2 rounded-sm uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
                    active
                      ? "bg-primary text-on-primary shadow-[0_0_14px_rgba(77,148,255,0.35)]"
                      : "bg-surface-container text-foreground border border-outline-variant hover:border-primary hover:text-primary-soft"
                  }`}
                >
                  {active ? "RELOAD_INTO_PIPELINE" : "LOAD_INTO_PIPELINE"}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ComplexityRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-line/60 pb-1">
      <dt className="text-muted-fg uppercase tracking-widest text-[10px]">{label}</dt>
      <dd
        className={`font-bold ${
          highlight ? "text-accent-orange" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

// ---------- memory map page ----------
function MemoryMapPage({
  frame,
  compareIdx,
  swaps,
  totalFrames,
  frameIdx,
}: {
  frame: Frame
  compareIdx: number[]
  swaps: number
  totalFrames: number
  frameIdx: number
}) {
  // Build a deterministic 256-cell allocation map seeded by current frame state.
  const cells = useMemo(() => {
    const out: { allocated: boolean; hot: boolean }[] = []
    for (let i = 0; i < 256; i++) {
      const seed = frame[i % Math.max(frame.length, 1)] ?? 0
      const allocated = ((seed + i * 7 + (i >> 2)) % 5) > 1
      const hot = compareIdx.length > 0 && i % Math.max(frame.length, 1) === compareIdx[0]
      out.push({ allocated, hot })
    }
    return out
  }, [frame, compareIdx])

  const allocatedCount = cells.filter((c) => c.allocated).length
  const usagePct = (allocatedCount / 256) * 100
  const heapHex = "0x" + (0x00a4f200 + frameIdx * 4).toString(16).toUpperCase().padStart(8, "0").replace(/^/, "").slice(0, 8) + "_F200".slice(0, 0)
  const heapDisplay = `0x${(0x00a4f200 + frameIdx * 4).toString(16).toUpperCase()}`
  const stackDepth = 256 + (compareIdx[0] ?? 0)
  const freeBlocks = 256 - allocatedCount + 600

  const colHeaders = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"]

  return (
    <div className="flex-1 overflow-y-auto terminal-scroll p-8 relative">
      <div className="absolute inset-0 z-0 opacity-20 grid-bg pointer-events-none" aria-hidden />
      <div className="relative z-10 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: grid */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border-line pb-3">
              <div>
                <h1 className="font-mono text-[24px] font-bold text-primary-soft tracking-tight">
                  SYSTEM_MEM_VIEW
                </h1>
                <p className="font-mono text-[11px] text-muted-fg uppercase tracking-widest mt-1">
                  ADDR_RANGE: 0x0000 - 0x0FFF
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px] text-muted-fg uppercase">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-outline-variant inline-block" /> FREE
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-accent-orange inline-block shadow-[0_0_6px_rgba(255,138,38,0.6)]" />
                  ALLOCATED
                </span>
              </div>
            </div>

            <div className="bg-surface-low border border-border-line rounded-sm p-4">
              {/* Column headers */}
              <div className="grid grid-cols-[40px_repeat(16,1fr)] gap-1 mb-1">
                <div />
                {colHeaders.map((h) => (
                  <div
                    key={h}
                    className="text-center font-mono text-[10px] text-outline uppercase"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {/* Rows */}
              <div className="space-y-1">
                {Array.from({ length: 16 }, (_, row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[40px_repeat(16,1fr)] gap-1 items-center"
                  >
                    <div className="font-mono text-[10px] text-outline">
                      0x00{row.toString(16).toUpperCase().padStart(1, "0")}0
                    </div>
                    {Array.from({ length: 16 }, (_, col) => {
                      const i = row * 16 + col
                      const cell = cells[i]
                      return (
                        <div
                          key={col}
                          className={`aspect-square border ${
                            cell.allocated
                              ? cell.hot
                                ? "bg-primary border-primary shadow-[0_0_8px_rgba(77,148,255,0.7)]"
                                : "bg-accent-orange border-accent-orange-soft shadow-[0_0_5px_rgba(255,138,38,0.55)]"
                              : "bg-surface-lowest border-border-line"
                          }`}
                          title={`0x0${row.toString(16).toUpperCase()}${col.toString(16).toUpperCase()}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoTile label="PAGE_SIZE" value="4096 BYTES" />
              <InfoTile label="MMU_STATUS" value="ACTIVE" valueClass="text-primary-soft" />
              <InfoTile label="CACHE_LEVEL" value="L1_DYNAMIC" />
            </div>
          </div>

          {/* Right: stats */}
          <div className="space-y-4">
            <div className="bg-surface-low border border-border-line rounded-sm p-5">
              <h3 className="font-mono text-[13px] text-primary-soft uppercase tracking-widest mb-4">
                Memory Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between font-mono text-[11px] text-muted-fg uppercase mb-1.5 tracking-wider">
                    <span>Total_Usage</span>
                    <span className="text-primary-soft">{usagePct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-outline-variant rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>
                <StatRow label="HEAP_SIZE" value={heapDisplay} mono />
                <StatRow label="STACK_DEPTH" value={`${stackDepth}_CALLS`} mono />
                <StatRow
                  label="FREE_BLOCKS"
                  value={`${freeBlocks}_UNIT`}
                  valueClass="text-accent-orange"
                  mono
                />
                <StatRow label="VIRTUAL_MEM" value="DISABLED" valueClass="text-outline" mono />
              </div>
            </div>

            <div className="bg-surface-low border border-accent-orange-soft/40 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-orange" />
                <h4 className="font-mono text-[12px] text-accent-orange uppercase tracking-widest font-bold">
                  Fragmentation Alert
                </h4>
              </div>
              <p className="font-mono text-[11.5px] text-muted-fg leading-relaxed">
                High fragmentation detected in upper heap regions. Recommend garbage collection or
                manual defragmentation.
              </p>
            </div>

            <div className="bg-surface-low border border-border-line rounded-sm p-5">
              <h3 className="font-mono text-[13px] text-primary-soft uppercase tracking-widest mb-3">
                Segmentation_Map
              </h3>
              <div className="space-y-1.5">
                <SegmentRow label=".text section (Code)" tone="primary" />
                <SegmentRow label=".data section (Init)" tone="orange" />
                <SegmentRow label=".bss section (Uninit)" tone="muted" />
                <SegmentRow label=".heap (Dynamic)" tone="muted" />
              </div>
              <p className="font-mono text-[10.5px] text-outline mt-4 uppercase tracking-widest">
                FRAME {frameIdx} / {totalFrames - 1} // SWAPS {swaps}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoTile({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="bg-surface-low border border-border-line rounded-sm px-4 py-3">
      <p className="font-mono text-[10.5px] text-muted-fg uppercase tracking-widest">{label}</p>
      <p className={`font-mono text-[15px] font-bold mt-1 ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}

function StatRow({
  label,
  value,
  valueClass,
  mono,
}: {
  label: string
  value: string
  valueClass?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border-line/70 pb-2">
      <span className="font-mono text-[11px] text-muted-fg uppercase tracking-widest">
        {label}
      </span>
      <span
        className={`text-[12px] font-bold ${mono ? "font-mono" : ""} ${
          valueClass ?? "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function SegmentRow({
  label,
  tone,
}: {
  label: string
  tone: "primary" | "orange" | "muted"
}) {
  const toneClass =
    tone === "primary"
      ? "border-l-4 border-primary bg-primary/10 text-primary-soft"
      : tone === "orange"
        ? "border-l-4 border-accent-orange bg-accent-orange/10 text-accent-orange"
        : "border-l-4 border-outline-variant text-muted-fg"
  return (
    <div className={`px-3 py-2 font-mono text-[12px] rounded-sm ${toneClass}`}>{label}</div>
  )
}

// ---------- registers page ----------
function RegistersPage({
  frame,
  currentEvent,
  frameIdx,
  swaps,
}: {
  frame: Frame
  currentEvent: SortEvent | undefined
  frameIdx: number
  swaps: number
}) {
  const compareA = currentEvent?.type === "compare" ? currentEvent.values?.[0] ?? 0 : 0
  const compareB = currentEvent?.type === "compare" ? currentEvent.values?.[1] ?? 0 : 0
  const isSwap = currentEvent?.type === "swap"
  const isCompare = currentEvent?.type === "compare"

  const toHex = (n: number, width = 16) =>
    "0x" + (n >>> 0).toString(16).toUpperCase().padStart(width, "0")

  const rax = (frame[0] ?? 0) * 13 + 673
  const rcx = 0x7ffee4561000 + frameIdx
  const rsp = 0x7ffee4560fc0 + (swaps & 0xff)
  const rbp = 0x7ffee4560fe0
  const rdi = isSwap ? 1 : 0

  const registers: Array<{
    name: string
    hex: string
    dec: string
    status: string
    statusTone: "primary" | "muted" | "orange"
    highlight?: boolean
  }> = [
    {
      name: "RAX",
      hex: toHex(rax),
      dec: rax.toString(),
      status: "DIRTY",
      statusTone: "primary",
    },
    {
      name: "RBX",
      hex: "0xFFFFFFFFFFFFFFFF",
      dec: "-1",
      status: "STABLE",
      statusTone: "muted",
    },
    {
      name: "RCX",
      hex: toHex(rcx),
      dec: rcx.toString(),
      status: "STABLE",
      statusTone: "muted",
    },
    {
      name: "RDX",
      hex: toHex(compareA),
      dec: compareA.toString(),
      status: isCompare ? "COMPARE" : "STABLE",
      statusTone: isCompare ? "orange" : "muted",
      highlight: isCompare,
    },
    {
      name: "RSP",
      hex: toHex(rsp),
      dec: rsp.toString(),
      status: "STACK_PTR",
      statusTone: "muted",
    },
    {
      name: "RBP",
      hex: toHex(rbp),
      dec: rbp.toString(),
      status: "BASE_PTR",
      statusTone: "muted",
    },
    {
      name: "RSI",
      hex: toHex(compareB),
      dec: compareB.toString(),
      status: compareB === 0 ? "NULL" : "STABLE",
      statusTone: "muted",
    },
    {
      name: "RDI",
      hex: toHex(rdi),
      dec: rdi.toString(),
      status: "STABLE",
      statusTone: "muted",
    },
  ]

  // EFLAGS
  const zf = isCompare && compareA === compareB ? 1 : 0
  const cf = 0
  const sf = isCompare && compareA < compareB ? 1 : 0
  const of = isSwap ? 1 : 0
  const lowBits = [zf, 0, 0, sf, 0, of, 0, cf]

  return (
    <div className="flex-1 overflow-y-auto terminal-scroll p-8 relative">
      <div className="absolute inset-0 z-0 opacity-20 grid-bg pointer-events-none" aria-hidden />
      <div className="relative z-10 max-w-[1280px] mx-auto space-y-6">
        <div className="flex justify-between items-end border-b border-border-line pb-4 flex-wrap gap-3">
          <div>
            <h1 className="font-mono text-[24px] font-bold text-primary-soft tracking-tight">
              CPU REGISTER STATE
            </h1>
            <p className="font-mono text-[11px] text-muted-fg uppercase tracking-widest mt-1">
              CURRENT_THREAD_ID: 0x4A2F // ARCH: X86_64
            </p>
          </div>
          <div className="px-3 py-1 bg-surface-container border border-outline-variant flex items-center gap-2 rounded-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">
              LIVE_SYNC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Register table */}
          <div className="xl:col-span-2">
            <div className="bg-surface-low border border-border-line rounded-sm overflow-hidden">
              <table className="w-full text-left font-mono text-[12.5px]">
                <thead>
                  <tr className="bg-surface-container text-outline uppercase">
                    <th className="px-4 py-3 border-b border-border-line font-medium tracking-widest text-[10.5px]">
                      Register
                    </th>
                    <th className="px-4 py-3 border-b border-border-line font-medium tracking-widest text-[10.5px]">
                      Hex Value
                    </th>
                    <th className="px-4 py-3 border-b border-border-line font-medium tracking-widest text-[10.5px]">
                      Decimal Value
                    </th>
                    <th className="px-4 py-3 border-b border-border-line font-medium tracking-widest text-[10.5px] text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registers.map((r) => (
                    <tr
                      key={r.name}
                      className={`border-b border-border-line/70 transition-colors ${
                        r.highlight ? "bg-accent-orange/5" : "hover:bg-primary/5"
                      }`}
                    >
                      <td
                        className={`px-4 py-3 font-bold ${
                          r.highlight ? "text-accent-orange" : "text-primary-soft"
                        }`}
                      >
                        {r.name}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          r.highlight ? "text-accent-orange" : "text-foreground"
                        }`}
                      >
                        {r.hex}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          r.highlight ? "text-accent-orange" : "text-muted-fg"
                        }`}
                      >
                        {r.dec}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusPill label={r.status} tone={r.statusTone} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* EFLAGS + topology */}
          <div className="space-y-4">
            <div className="bg-surface-low border border-border-line p-5 rounded-sm">
              <h3 className="font-mono text-[13px] text-primary-soft uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5" />
                EFLAGS Register
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <FlagBit name="ZF (Zero)" value={zf} />
                <FlagBit name="CF (Carry)" value={cf} />
                <FlagBit name="SF (Sign)" value={sf} />
                <FlagBit name="OF (Overflow)" value={of} accent="orange" />
              </div>
              <div className="mt-5 pt-4 border-t border-border-line">
                <h4 className="font-mono text-[10.5px] text-outline mb-2 uppercase tracking-widest">
                  Raw Binary (Low Bits)
                </h4>
                <div className="flex gap-1">
                  {lowBits.map((b, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-6 flex items-center justify-center border font-mono text-[10px] ${
                        b
                          ? "bg-primary/15 border-primary text-primary-soft"
                          : "bg-surface-container border-outline-variant text-outline"
                      }`}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface-low border border-border-line p-5 rounded-sm">
              <h3 className="font-mono text-[13px] text-primary-soft uppercase tracking-widest mb-3">
                System Topology
              </h3>
              <div className="relative h-32 bg-surface-lowest border border-border-line overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-12 border border-primary/40 flex items-center justify-center relative">
                    <span className="absolute -top-1 -left-1 w-2 h-2 bg-primary" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary" />
                    <span className="font-mono text-[11px] text-primary-soft tracking-widest">
                      ALU_ACTIVE
                    </span>
                  </div>
                </div>
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(173,199,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "100% 4px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: "primary" | "muted" | "orange"
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/15 text-primary-soft border-primary/40"
      : tone === "orange"
        ? "bg-accent-orange/15 text-accent-orange border-accent-orange/50"
        : "text-outline border-transparent"
  return (
    <span
      className={`text-[10px] px-2 py-0.5 border font-mono uppercase tracking-widest ${cls}`}
    >
      {label}
    </span>
  )
}

function FlagBit({
  name,
  value,
  accent,
}: {
  name: string
  value: number
  accent?: "orange"
}) {
  const active = value === 1
  const onColor =
    accent === "orange"
      ? "border-accent-orange bg-accent-orange/15 text-accent-orange shadow-[0_0_10px_rgba(255,138,38,0.45)]"
      : "border-primary bg-primary/15 text-primary-soft shadow-[0_0_10px_rgba(77,148,255,0.45)]"
  return (
    <div className="p-3 border border-outline-variant bg-surface-lowest flex flex-col items-center justify-center rounded-sm">
      <span className="font-mono text-[10.5px] text-outline mb-2 uppercase tracking-widest">
        {name}
      </span>
      <div
        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono font-bold text-[13px] ${
          active ? onColor : "border-outline-variant bg-surface-container text-outline opacity-60"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

// ---------- main page ----------
export default function Page() {
  const [data, setData] = useState<number[]>(DEFAULT_DATA)
  const [fileName, setFileName] = useState<string | null>("sort_data.txt")
  const [algorithm, setAlgorithm] = useState<AlgorithmKey>("Bubble Sort")
  const [view, setView] = useState<ViewKey>("Visualizer")
  const [speed, setSpeed] = useState(50)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameIdx, setFrameIdx] = useState(0)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [swaps, setSwaps] = useState(0)
  const [execTime, setExecTime] = useState(0)
  const [isLogsMinimized, setIsLogsMinimized] = useState(false)
  const logIdRef = useRef(0)

  // Assembly Backend Integration
  const [useAssemblyBackend, setUseAssemblyBackend] = useState(false)
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null)
  const [isBackendProcessing, setIsBackendProcessing] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)

  const { frames, events } = useMemo(() => generateFrames(algorithm, data), [algorithm, data])
  const totalFrames = frames.length
  const currentFrame = frames[Math.min(frameIdx, totalFrames - 1)] ?? data
  const currentEvent = events[Math.min(frameIdx, events.length - 1)]
  const maxValue = useMemo(() => Math.max(...data, 1), [data])

  const compareIdx = currentEvent?.type === "compare" ? currentEvent.indices : []
  const swapIdx = currentEvent?.type === "swap" ? currentEvent.indices : []
  const pivotIdx =
    currentEvent && (currentEvent.type === "compare" || currentEvent.type === "swap")
      ? currentEvent.indices[1] ?? null
      : null

  // Check API health and load data on mount
  useEffect(() => {
    const checkHealth = async () => {
      const isHealthy = await checkApiHealth()
      setApiHealthy(isHealthy)
      if (!isHealthy) {
        console.warn('[Page] Assembly API is not available')
        return
      }

      // Load actual data from sort_data.txt
      try {
        const response = await fetch('http://localhost:3001/api/data')
        if (response.ok) {
          const result = await response.json()
          if (result.initialArray && result.initialArray.length > 0) {
            setData(result.initialArray)
            console.log('[Page] Loaded data from sort_data.txt:', result.initialArray)
          }
        }
      } catch (error) {
        console.warn('[Page] Failed to load data from API:', error)
      }
    }
    checkHealth()
  }, [])

  // Initialize boot logs whenever data or algorithm changes
  useEffect(() => {
    const short =
      ALGORITHMS.find((a) => a.key === algorithm)?.short ?? "BUBBLE_SORT"
    const backend = useAssemblyBackend && apiHealthy ? "[ASSEMBLY]" : "[JAVASCRIPT]"
    const boot: LogLine[] = [
      { id: ++logIdRef.current, kind: "SYS", text: "[SYS] Initializing memory mapping... OK" },
      {
        id: ++logIdRef.current,
        kind: "SYS",
        text: `[SYS] Loading sort_data.txt (${data.length} integers)... OK`,
      },
      { id: ++logIdRef.current, kind: "RUN", text: `[RUN] ${short} executing... ${backend}` },
    ]
    setLogs(boot)
    setFrameIdx(0)
    setSwaps(0)
    setExecTime(0)
    setIsPlaying(false)
    setBackendError(null)
  }, [data, algorithm, useAssemblyBackend, apiHealthy])

  // Push log when frame changes
  const pushLogForEvent = useCallback((evt: SortEvent, frame: Frame) => {
    if (!evt) return
    if (evt.type === "compare" && evt.values) {
      const [a, b] = evt.values
      const willSwap = a > b
      setLogs((prev) => [
        ...prev,
        {
          id: ++logIdRef.current,
          kind: "CMP",
          text: `[CMP] Compare idx_${evt.indices[0]} (${a}) with idx_${evt.indices[1]} (${b}) → ${
            willSwap ? "SWAP_REQUIRED" : "NO_SWAP"
          }`,
        },
      ])
    } else if (evt.type === "swap") {
      const preview = frame.slice(0, 11).join(", ")
      setLogs((prev) => [
        ...prev,
        {
          id: ++logIdRef.current,
          kind: "MEM",
          text: `[MEM] Array state: [${preview}${frame.length > 11 ? "..." : ""}]`,
        },
      ])
      setSwaps((s) => s + 1)
    } else if (evt.type === "done") {
      setLogs((prev) => [
        ...prev,
        { id: ++logIdRef.current, kind: "SYS", text: "[SYS] Sort complete. Returning to idle." },
        { id: ++logIdRef.current, kind: "MEM", text: `[ORIGINAL] Original Array : ${data.join(", ")}` },
        { id: ++logIdRef.current, kind: "MEM", text: `[SORTED]   Sorted Array   : ${frame.join(", ")}` },
      ])
    }
  }, [data])

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return
    if (frameIdx >= totalFrames - 1) {
      setIsPlaying(false)
      return
    }
    // speed slider: 1 (slowest) -> 100 (fastest). Exponential mapping: ~800ms -> ~8ms.
    const delay = Math.round(800 * Math.pow(0.955, speed - 1))
    const t = setTimeout(() => {
      const next = frameIdx + 1
      setFrameIdx(next)
      pushLogForEvent(events[next], frames[next])
      setExecTime((e) => e + Math.round(delay / 10))
    }, delay)
    return () => clearTimeout(t)
  }, [isPlaying, frameIdx, totalFrames, speed, events, frames, pushLogForEvent])

  const onPlay = () => {
    if (frameIdx >= totalFrames - 1) setFrameIdx(0)
    setIsPlaying(true)
  }
  const onPause = () => setIsPlaying(false)
  const onStepBack = () => {
    setIsPlaying(false)
    setFrameIdx((i) => Math.max(0, i - 1))
  }
  const onStepForward = () => {
    setIsPlaying(false)
    setFrameIdx((i) => {
      const next = Math.min(totalFrames - 1, i + 1)
      pushLogForEvent(events[next], frames[next])
      return next
    })
  }
  const onExecute = async () => {
    setBackendError(null)

    // Use Assembly Backend if enabled and available
    if (useAssemblyBackend && apiHealthy) {
      setIsBackendProcessing(true)
      try {
        const response: SortResponse = await sortWithAssemblyBackend(algorithm, data)

        // Update data with actual array from backend
        setData(response.initialArray)

        // Add backend success log
        setLogs((prev) => [
          ...prev,
          {
            id: ++logIdRef.current,
            kind: "OK",
            text: `[OK] Assembly backend completed: ${response.totalFrames} frames`,
          },
        ])

        // Convert assembly frames to internal format and play
        setFrameIdx(0)
        setSwaps(0)
        setExecTime(0)

        // Store frames for playback
        // Note: We'll use the frames directly from the response
        sessionStorage.setItem('assemblyFrames', JSON.stringify(response.frames))
        sessionStorage.setItem('useAssemblyFrames', 'true')

        setIsPlaying(true)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        setBackendError(errorMsg)
        setLogs((prev) => [
          ...prev,
          {
            id: ++logIdRef.current,
            kind: "SYS",
            text: `[ERROR] ${errorMsg}`,
          },
        ])
        console.error('[Page] Assembly backend error:', errorMsg)
      } finally {
        setIsBackendProcessing(false)
      }
    } else {
      // Use JavaScript implementation (original behavior)
      setFrameIdx(0)
      setSwaps(0)
      setExecTime(0)
      setIsPlaying(true)
    }
  }

  const onUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const nums = text
        .split(/[\s,\n]+/)
        .map((s) => s.replace(/[^\d-]/g, ""))
        .filter(Boolean)
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => !Number.isNaN(n))
        .slice(0, 25)
      if (nums.length >= 2) {
        setData(nums)
        setFileName(file.name)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <TopNav />
      <Sidebar
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        speed={speed}
        setSpeed={setSpeed}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onPause={onPause}
        onStepBack={onStepBack}
        onStepForward={onStepForward}
        onUpload={onUpload}
        fileName={fileName}
        onExecute={onExecute}
        view={view}
        setView={setView}
        useAssemblyBackend={useAssemblyBackend}
        setUseAssemblyBackend={setUseAssemblyBackend}
        apiHealthy={apiHealthy}
        isBackendProcessing={isBackendProcessing}
        backendError={backendError}
      />
      <main className={`md:pl-[320px] pt-16 h-screen w-full flex flex-col relative transition-all duration-300 ${
        isLogsMinimized ? "pb-10" : "pb-[220px]"
      }`}>
        {view === "Visualizer" && (
          <Visualizer
            frame={currentFrame}
            compareIdx={compareIdx}
            swapIdx={swapIdx}
            pivotIdx={pivotIdx}
            maxValue={maxValue}
            transitionMs={Math.min(400, Math.round(800 * Math.pow(0.955, speed - 1) * 0.7))}
          />
        )}
        {view === "Algorithms" && (
          <AlgorithmsPage
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            goToVisualizer={() => setView("Visualizer")}
          />
        )}
        {view === "Memory Map" && (
          <MemoryMapPage
            frame={currentFrame}
            compareIdx={compareIdx}
            swaps={swaps}
            totalFrames={totalFrames}
            frameIdx={frameIdx}
          />
        )}
        {view === "Registers" && (
          <RegistersPage
            frame={currentFrame}
            currentEvent={currentEvent}
            frameIdx={frameIdx}
            swaps={swaps}
          />
        )}
      </main>
      <Console
        logs={logs}
        frameIdx={frameIdx}
        totalFrames={totalFrames}
        execTime={execTime}
        swaps={swaps}
        isMinimized={isLogsMinimized}
        onMinimizeChange={setIsLogsMinimized}
      />
    </div>
  )
}

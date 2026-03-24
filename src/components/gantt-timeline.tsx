'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPriorityBand } from '@/types'
import { toast } from 'sonner'

const DAY_MS = 86400000
const COL_WIDTH = 48
const ROW_HEIGHT = 56
const LABEL_WIDTH = 220
const HANDLE_WIDTH = 10

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function formatShort(d: Date) {
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}
function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function diffDays(a: Date, b: Date) {
  const aNoon = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12)
  const bNoon = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12)
  return Math.round((aNoon.getTime() - bNoon.getTime()) / DAY_MS)
}

function getTaskStart(task: any): Date | null {
  if (task.startDate) return startOfDay(new Date(task.startDate))
  const end = getTaskEnd(task)
  if (end) return addDays(end, -2)
  return null
}
function getTaskEnd(task: any): Date | null {
  const raw = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
  return raw ? startOfDay(new Date(raw)) : null
}

const BAND_COLORS: Record<string, { bar: string; border: string; text: string }> = {
  critical: { bar: 'bg-red-400', border: 'border-red-500', text: 'text-white' },
  high:     { bar: 'bg-orange-400', border: 'border-orange-500', text: 'text-white' },
  medium:   { bar: 'bg-yellow-400', border: 'border-yellow-600', text: 'text-yellow-900' },
  low:      { bar: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-700' },
}

interface Props { tasks: any[]; updateTask: any }

export function GanttTimeline({ tasks, updateTask }: Props) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -3))
  const totalDays = 21

  const days = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < totalDays; i++) arr.push(addDays(rangeStart, i))
    return arr
  }, [rangeStart, totalDays])

  // Drag state
  const dragRef = useRef<{
    taskId: string
    mode: 'move' | 'resize-left' | 'resize-right'
    origStart: Date
    origEnd: Date
    startX: number
  } | null>(null)
  const [, forceRender] = useState(0)
  const deltaRef = useRef(0)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  const startDrag = useCallback(
    (e: React.MouseEvent, taskId: string, mode: 'move' | 'resize-left' | 'resize-right', origStart: Date, origEnd: Date) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = { taskId, mode, origStart, origEnd, startX: e.clientX }
      deltaRef.current = 0
      forceRender((n) => n + 1)
    }, []
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const newDelta = Math.round(dx / COL_WIDTH)
      if (newDelta !== deltaRef.current) {
        deltaRef.current = newDelta
        forceRender((n) => n + 1)
      }
    }

    const onUp = () => {
      const drag = dragRef.current
      const delta = deltaRef.current
      if (!drag || delta === 0) {
        dragRef.current = null
        deltaRef.current = 0
        forceRender((n) => n + 1)
        return
      }

      let newStart = drag.origStart
      let newEnd = drag.origEnd

      if (drag.mode === 'move') {
        newStart = addDays(drag.origStart, delta)
        newEnd = addDays(drag.origEnd, delta)
      } else if (drag.mode === 'resize-left') {
        newStart = addDays(drag.origStart, delta)
        if (newStart >= newEnd) newStart = addDays(newEnd, -1)
      } else if (drag.mode === 'resize-right') {
        newEnd = addDays(drag.origEnd, delta)
        if (newEnd <= newStart) newEnd = addDays(newStart, 1)
      }

      updateTask.mutate(
        { id: drag.taskId, data: { startDate: toDateStr(newStart), userSetDeadline: toDateStr(newEnd) } },
        { onSuccess: () => toast.success('Timeline updated') }
      )

      dragRef.current = null
      deltaRef.current = 0
      forceRender((n) => n + 1)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [updateTask])

  // Bar position
  const getBarStyle = useCallback(
    (task: any) => {
      let taskStart = getTaskStart(task)
      let taskEnd = getTaskEnd(task)
      if (!taskStart || !taskEnd) return null
      if (taskEnd <= taskStart) taskEnd = addDays(taskStart, 1)

      const drag = dragRef.current
      const delta = deltaRef.current
      if (drag && drag.taskId === task.id && delta !== 0) {
        if (drag.mode === 'move') {
          taskStart = addDays(taskStart, delta)
          taskEnd = addDays(taskEnd, delta)
        } else if (drag.mode === 'resize-left') {
          taskStart = addDays(taskStart, delta)
          if (taskStart >= taskEnd) taskStart = addDays(taskEnd, -1)
        } else if (drag.mode === 'resize-right') {
          taskEnd = addDays(taskEnd, delta)
          if (taskEnd <= taskStart) taskEnd = addDays(taskStart, 1)
        }
      }

      const left = diffDays(taskStart, rangeStart) * COL_WIDTH
      const width = Math.max(diffDays(taskEnd, taskStart) + 1, 1) * COL_WIDTH
      return { left, width, taskStart, taskEnd }
    },
    [rangeStart]
  )

  const todayOffset = diffDays(today, rangeStart) * COL_WIDTH
  const gridWidth = totalDays * COL_WIDTH

  // Date range display
  const rangeEnd = addDays(rangeStart, totalDays - 1)
  const rangeLabel = `${formatShort(rangeStart)} — ${formatShort(rangeEnd)}, ${rangeEnd.getFullYear()}`

  return (
    <Card>
      <CardContent className="py-4">
        {/* Controls */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRangeStart((d) => addDays(d, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRangeStart(addDays(today, -3))} className="text-xs">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRangeStart((d) => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-gray-400">{rangeLabel}</span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + gridWidth }} className="select-none">
            {/* Day headers */}
            <div className="flex border-b" style={{ height: 40 }}>
              <div style={{ width: LABEL_WIDTH }} className="shrink-0 border-r px-3 text-xs font-medium text-gray-500 flex items-end pb-1">
                Task
              </div>
              <div className="relative flex">
                {days.map((day) => {
                  const isToday = day.toDateString() === today.toDateString()
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div
                      key={day.toISOString()}
                      style={{ width: COL_WIDTH }}
                      className={`shrink-0 border-r text-center text-[10px] flex flex-col justify-end pb-1 ${
                        isToday ? 'bg-blue-50 font-bold text-blue-700' : isWeekend ? 'bg-gray-50 text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <div>{day.toLocaleDateString('en', { weekday: 'narrow' })}</div>
                      <div>{day.getDate()}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Task rows */}
            {tasks.map((task: any) => {
              const band = getPriorityBand(task.priorityScore || 0)
              const colors = BAND_COLORS[band] || BAND_COLORS.low
              const barStyle = getBarStyle(task)
              const isDragging = dragRef.current?.taskId === task.id
              const isHovered = hoveredTaskId === task.id
              const origStart = getTaskStart(task)
              const origEnd = getTaskEnd(task)

              return (
                <div
                  key={task.id}
                  className={`flex border-b transition-colors ${isDragging ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Label — with z-index to stay above bars */}
                  <div
                    style={{ width: LABEL_WIDTH }}
                    className="shrink-0 border-r flex items-center px-3 gap-2 bg-white z-20 relative"
                  >
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.bar}`} />
                    <Link href={`/tasks/${task.id}`} className="truncate text-xs font-medium text-gray-800 hover:text-blue-600">
                      {task.title}
                    </Link>
                  </div>

                  {/* Grid + bar — clipped so bars don't overflow into label area */}
                  <div className="relative flex overflow-hidden" style={{ width: gridWidth }}>
                    {/* Grid columns */}
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        style={{ width: COL_WIDTH }}
                        className={`shrink-0 border-r ${
                          day.toDateString() === today.toDateString() ? 'bg-blue-50' : (day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50/50' : ''
                        }`}
                      />
                    ))}

                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < gridWidth && (
                      <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{ left: todayOffset + COL_WIDTH / 2 }} />
                    )}

                    {/* Task bar */}
                    {barStyle && origStart && origEnd && (
                      <div
                        className={`absolute rounded-md border shadow-sm cursor-grab active:cursor-grabbing ${
                          isDragging ? 'shadow-lg ring-2 ring-blue-300 z-20' : 'z-10 hover:shadow-md'
                        } ${colors.bar} ${colors.border}`}
                        style={{
                          left: barStyle.left,
                          width: Math.max(barStyle.width, COL_WIDTH * 0.5),
                          top: 8,
                          height: ROW_HEIGHT - 16,
                        }}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onMouseDown={(e) => startDrag(e, task.id, 'move', origStart, origEnd)}
                      >
                        {/* Bar label */}
                        <div className={`absolute inset-0 flex items-center truncate px-2.5 text-[10px] font-semibold leading-none pointer-events-none ${colors.text}`}>
                          {barStyle.width >= COL_WIDTH * 2.5 ? task.title : ''}
                        </div>

                        {/* Left resize handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 cursor-ew-resize rounded-l-md z-10 hover:bg-black/20"
                          style={{ width: HANDLE_WIDTH }}
                          onMouseDown={(e) => { e.stopPropagation(); startDrag(e, task.id, 'resize-left', origStart, origEnd) }}
                        >
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-0.5 rounded bg-white/60" />
                        </div>

                        {/* Right resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 cursor-ew-resize rounded-r-md z-10 hover:bg-black/20"
                          style={{ width: HANDLE_WIDTH }}
                          onMouseDown={(e) => { e.stopPropagation(); startDrag(e, task.id, 'resize-right', origStart, origEnd) }}
                        >
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-0.5 rounded bg-white/60" />
                        </div>

                        {/* Hover tooltip — right side */}
                        {isHovered && !isDragging && (
                          <div
                            className="pointer-events-none absolute z-30 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-lg"
                            style={{ left: Math.max(barStyle.width, COL_WIDTH * 0.5) + 6, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            <div>{task.title}</div>
                            <div className="text-gray-400 text-[9px] mt-0.5">
                              {formatShort(barStyle.taskStart)} — {formatShort(barStyle.taskEnd)}
                            </div>
                            <div className="absolute right-full top-1/2 -translate-y-1/2 h-0 w-0 border-r-4 border-t-4 border-b-4 border-transparent border-r-gray-900" />
                          </div>
                        )}
                      </div>
                    )}

                    {!barStyle && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 italic">No dates</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
          <span>Drag bar to move. Drag edges to resize. Hover for details.</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded bg-red-400" /> Critical
            <span className="inline-block h-2.5 w-6 rounded bg-orange-400" /> High
            <span className="inline-block h-2.5 w-6 rounded bg-yellow-400" /> Medium
            <span className="inline-block h-2.5 w-6 rounded bg-gray-300" /> Low
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

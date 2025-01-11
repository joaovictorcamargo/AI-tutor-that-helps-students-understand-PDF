"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface Annotation {
  type: 'highlight' | 'circle'
  content: string
  pageNumber: number
  coordinates: {
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
  }
}

interface PDFViewerProps {
  url: string
  annotations?: Annotation[]
  onPageChange?: (pageNumber: number) => void
  onAnnotationClick?: (annotation: Annotation) => void
}

export function PDFViewer({ 
  url, 
  annotations = [], 
  onPageChange,
  onAnnotationClick 
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage)
    onPageChange?.(newPage)
  }

  // Draw annotations on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match container
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    // Clear previous annotations
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw current page annotations
    const currentAnnotations = annotations.filter(a => a.pageNumber === pageNumber)
    
    currentAnnotations.forEach(annotation => {
      ctx.save()
      
      if (annotation.type === 'highlight') {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
        ctx.fillRect(
          annotation.coordinates.x,
          annotation.coordinates.y,
          annotation.coordinates.width || 0,
          annotation.coordinates.height || 0
        )
      } else if (annotation.type === 'circle') {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(
          annotation.coordinates.x,
          annotation.coordinates.y,
          annotation.coordinates.radius || 20,
          0,
          2 * Math.PI
        )
        ctx.stroke()
      }
      
      ctx.restore()
    })
  }, [pageNumber, annotations, scale, canvasRef.current?.clientWidth, canvasRef.current?.clientHeight])

  // Handle canvas click for annotation interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked annotation
    const clickedAnnotation = annotations.find(annotation => {
      if (annotation.pageNumber !== pageNumber) return false

      if (annotation.type === 'highlight') {
        return (
          x >= annotation.coordinates.x &&
          x <= annotation.coordinates.x + (annotation.coordinates.width || 0) &&
          y >= annotation.coordinates.y &&
          y <= annotation.coordinates.y + (annotation.coordinates.height || 0)
        )
      } else if (annotation.type === 'circle') {
        const dx = x - annotation.coordinates.x
        const dy = y - annotation.coordinates.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= (annotation.coordinates.radius || 20)
      }
      return false
    })

    if (clickedAnnotation) {
      onAnnotationClick?.(clickedAnnotation)
    }
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex-1 overflow-auto relative">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            className="max-w-full"
            scale={scale}
          />
        </Document>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-auto"
          onClick={handleCanvasClick}
        />
      </div>
      
      <div className="flex items-center justify-between p-4 border-t">
        <button
          onClick={() => handlePageChange(Math.max(pageNumber - 1, 1))}
          disabled={pageNumber <= 1}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <span className="text-sm">
          Page {pageNumber} of {numPages}
        </span>
        
        <button
          onClick={() => handlePageChange(Math.min(pageNumber + 1, numPages))}
          disabled={pageNumber >= numPages}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

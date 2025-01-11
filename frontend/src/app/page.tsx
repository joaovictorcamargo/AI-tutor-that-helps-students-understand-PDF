"use client"

import { useState, useEffect } from "react"
import { Upload, Send, Mic } from "lucide-react"
import { PDFViewer } from "@/components/PDFViewer"
import { useSpeech } from "@/hooks/use-speech"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfId, setPdfId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/login')
    }
  }, [status])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload PDF')
      }

      const data = await response.json()
      setPdfId(data.id)

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file)
      setPdfUrl(objectUrl)

      // Load chat history if available
      await loadChatHistory(data.id)
    } catch (error) {
      console.error('Error uploading PDF:', error)
      setError('Failed to upload PDF. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadChatHistory = async (pdfId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat-history/${pdfId}`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load chat history')
      }

      const data = await response.json()
      setChatHistory(data.messages || [])
    } catch (error) {
      console.error('Error loading chat history:', error)
      setError('Failed to load chat history')
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !pdfId) return

    setIsLoading(true)
    setError(null)

    // Add user message to chat immediately
    const userMessage: ChatMessage = { role: 'user', content: message }
    setChatHistory((prev: ChatMessage[]) => [...prev, userMessage])
    setMessage("")

    try {
      // Send message to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/${pdfId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ content: message })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      
      // Add AI response to chat
      setChatHistory((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: data.response }])
      
      // Update annotations
      if (data.annotations) {
        setAnnotations((prev: Annotation[]) => [...prev, ...data.annotations])
      }
      
      // Update page if needed
      if (data.pages?.[0]) {
        setCurrentPage(data.pages[0])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const { isListening, startListening, stopListening, speak, isSupported } = useSpeech({
    onResult: async (text) => {
      setMessage(text)
      await handleSendMessage()
    },
    onEnd: () => setIsRecording(false)
  })

  const toggleRecording = () => {
    if (!isSupported) {
      setError("Speech recognition is not supported in your browser")
      return
    }

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
    setIsRecording(!isRecording)
  }

  // Text-to-speech for AI responses
  useEffect(() => {
    const lastMessage = chatHistory[chatHistory.length - 1]
    if (lastMessage?.role === 'assistant' && speak && !isLoading) {
      speak(lastMessage.content)
    }
  }, [chatHistory.length, speak, isLoading])

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin" />
      </div>
    )
  }

  // Only show content if authenticated
  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {/* PDF Viewer Section */}
        <div className="w-1/2 border-r border-gray-200 p-4 bg-white">
          <div className="h-full rounded-lg">
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {!pdfUrl ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <label className={`cursor-pointer flex flex-col items-center gap-2 p-6 hover:bg-gray-50 rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-500">
                    {isLoading ? 'Uploading...' : 'Upload PDF to begin'}
                  </span>
                </label>
              </div>
            ) : (
              <PDFViewer 
                url={pdfUrl}
                annotations={annotations}
                onPageChange={setCurrentPage}
                onAnnotationClick={(annotation) => {
                  // Scroll chat to relevant message
                  const messageIndex = chatHistory.findIndex(
                    (msg: ChatMessage) => msg.content.includes(annotation.content)
                  )
                  if (messageIndex >= 0) {
                    const chatContainer = document.querySelector('.chat-container')
                    const messageElement = chatContainer?.children[messageIndex]
                    messageElement?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-1/2 p-4 flex flex-col bg-white">
          <div className="flex-1 rounded-lg border border-gray-200 mb-4 p-4 overflow-auto chat-container">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-500 mb-2">Upload a PDF and start chatting</p>
                <p className="text-sm text-gray-400">
                  Ask questions about the document and I'll help you understand it
                </p>
              </div>
            ) : (
              chatHistory.map((msg: ChatMessage, index: number) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-center mt-4">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-gray-200 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-lg ${
                isRecording
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600"
              } hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

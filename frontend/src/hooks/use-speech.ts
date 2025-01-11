import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'

interface UseSpeechProps {
  onResult?: (text: string) => void | Promise<void>
  onEnd?: () => void
}

export function useSpeech({ onResult, onEnd }: UseSpeechProps = {}) {
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript
        onResult?.(text)
      }

      recognition.onend = () => {
        setIsListening(false)
        onEnd?.()
      }

      setRecognition(recognition)
    }
  }, [onResult, onEnd])

  const startListening = useCallback(() => {
    if (recognition) {
      recognition.start()
      setIsListening(true)
    }
  }, [recognition])

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop()
      setIsListening(false)
    }
  }, [recognition])

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
      return true
    }
    return false
  }, [])

  return {
    isListening,
    startListening,
    stopListening,
    speak,
    isSupported: !!recognition && 'speechSynthesis' in window
  }
}

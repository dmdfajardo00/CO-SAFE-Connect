import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ToastProps {
  message?: string
  visible?: boolean
  duration?: number
  className?: string
}

export const Toast: React.FC<ToastProps> = ({ 
  message = '', 
  visible = false,
  duration = 3000,
  className 
}) => {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    if (visible && message) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, message, duration])

  if (!show || !message) return null

  return (
    <div
      className={cn(
        "fixed left-1/2 bottom-24 transform -translate-x-1/2 z-50",
        "bg-foreground text-background px-3.5 py-3 rounded-lg shadow-lg",
        "animate-fade-in pointer-events-none",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

// Toast hook for global toast management
interface ToastState {
  message: string
  visible: boolean
  listeners: Array<(state: ToastState) => void>
}

let toastState: ToastState = {
  message: '',
  visible: false,
  listeners: []
}

export const useToast = () => {
  const [state, setState] = useState(toastState)

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState({ ...newState })
    }
    toastState.listeners.push(listener)
    return () => {
      toastState.listeners = toastState.listeners.filter(l => l !== listener)
    }
  }, [])

  const showToast = (message: string) => {
    toastState = { message, visible: true, listeners: toastState.listeners }
    toastState.listeners.forEach((listener: (state: ToastState) => void) => listener(toastState))
    
    setTimeout(() => {
      toastState = { ...toastState, visible: false }
      toastState.listeners.forEach((listener: (state: ToastState) => void) => listener(toastState))
    }, 3000)
  }

  return { ...state, showToast }
}
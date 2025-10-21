import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Demo component showing different input field design options
const WelcomeOptions: React.FC = () => {
  const [email, setEmail] = useState('')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">
        Input Field Design Options
      </h1>

      {/* Option 2A: Icon with right border divider */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2A: Icon Left + Border Divider
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-12 h-full border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Option 2B: Icon with subtle tinted background */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2B: Icon Left + Subtle Tint
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-12 h-full bg-slate-50/50 dark:bg-slate-800/50">
            <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Option 2C: Icon no background, just divider */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2C: Icon + Divider Only (Minimal)
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-12 h-full border-r border-slate-300 dark:border-slate-700">
            <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Option 2D: Thicker icon section with primary color accent */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2D: Icon with Primary Accent
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-14 h-full border-r-2 border-primary/20 bg-primary/5">
            <Icon icon="mdi:email-outline" className="w-5 h-5 text-primary" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Option 2E: Rounded icon section */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2E: Rounded Icon Section
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-12 h-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800">
              <Icon icon="mdi:email-outline" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 -ml-2"
          />
        </div>
      </div>

      {/* Option 2F: Icon with gradient background */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2F: Icon with Gradient
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-center w-12 h-full bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800 dark:to-transparent">
            <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Option 2G: Super minimal - just icon padding */}
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">
          Option 2G: Super Minimal (Recommended)
        </Label>
        <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden px-4 gap-3">
          <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          />
        </div>
      </div>
    </div>
  )
}

export default WelcomeOptions

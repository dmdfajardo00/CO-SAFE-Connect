import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/store/useAppStore'
import { checkUserExists, createUser } from '@/services/auth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type OnboardingStep = 'email' | 'name' | 'complete'

const Welcome: React.FC = () => {
  useDocumentTitle('Welcome - CO-SAFE Connect')
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setUser = useAppStore((state) => state.setUser)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const existingUser = await checkUserExists(email)

      if (existingUser) {
        // User exists - log them in
        setUser(existingUser)
        setStep('complete')
      } else {
        // New user - go to name input
        setStep('name')
      }
    } catch (err) {
      console.error('Error checking user:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const newUser = await createUser(email, name)
      setUser(newUser)
      setStep('complete')
    } catch (err) {
      console.error('Error creating user:', err)
      setError('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-4 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon icon="mdi:gas-cylinder" className="w-12 h-12" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            CO-SAFE
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Vehicle Carbon Monoxide Monitor
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <motion.div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'email' ? 'w-8 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
            }`}
          />
          <motion.div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 'name' ? 'w-8 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
            }`}
          />
        </div>

        {/* Content Cards */}
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Welcome back
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Enter your email to access your monitoring sessions
                    </p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                        Email address
                      </Label>
                      <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 focus-within:outline-none">
                        <div className="flex items-center justify-center w-12 h-full border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                          <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400" />
                        </div>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="touch-lg"
                      className="w-full font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Checking...' : 'Continue'}
                      {!isLoading && <Icon icon="mdi:arrow-right" className="ml-2 w-5 h-5" />}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-center text-slate-500 dark:text-slate-500">
                      No password required. We'll create an account if you're new.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Nice to meet you!
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Looks like you're new here. Let's get you set up.
                    </p>
                  </div>

                  <form onSubmit={handleNameSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                        Your name
                      </Label>
                      <div className="flex items-center h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 focus-within:outline-none">
                        <div className="flex items-center justify-center w-12 h-full border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                          <Icon icon="mdi:account-outline" className="w-5 h-5 text-slate-400" />
                        </div>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-1 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Icon icon="mdi:email-outline" className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{email}</span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="touch-lg"
                        onClick={() => setStep('email')}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        <Icon icon="mdi:arrow-left" className="mr-2 w-5 h-5" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="touch-lg"
                        className="flex-1 font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating...' : 'Get Started'}
                        {!isLoading && <Icon icon="mdi:check" className="ml-2 w-5 h-5" />}
                      </Button>
                    </div>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-center text-slate-500 dark:text-slate-500">
                      By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-200 dark:border-slate-800 shadow-xl">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 mb-4"
                  >
                    <Icon icon="mdi:check-circle" className="w-12 h-12 text-green-600 dark:text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    All set!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Welcome to CO-SAFE. Let's keep your vehicle safe.
                  </p>
                  <Button
                    size="touch-lg"
                    className="w-full font-semibold"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                    <Icon icon="mdi:arrow-right" className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
        </motion.div>
      </div>
    </div>
  )
}

export default Welcome

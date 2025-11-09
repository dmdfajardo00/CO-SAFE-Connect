import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { gluestackUIConfig } from '@gluestack-ui/config'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GluestackUIProvider config={gluestackUIConfig}>
        <App />
      </GluestackUIProvider>
    </BrowserRouter>
  </StrictMode>,
)

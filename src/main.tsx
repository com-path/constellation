import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

/*
 * Tiny path router for the standalone design demos. The demos are lazy
 * chunks so the app bundle (and its styles/state) is untouched, and each
 * demo's CSS module only loads on its own route.
 */
const DemosIndex = React.lazy(() => import('./demos/DemosIndex'))
const EngravedAtlas = React.lazy(() => import('./demos/EngravedAtlas'))
const WoodcutSky = React.lazy(() => import('./demos/WoodcutSky'))
const GildedReliquary = React.lazy(() => import('./demos/GildedReliquary'))

const path = window.location.pathname.replace(/\/+$/, '') || '/'

const demoRoutes: Record<string, React.ComponentType> = {
  '/demos': DemosIndex,
  '/demos/a-engraved': EngravedAtlas,
  '/demos/b-woodcut': WoodcutSky,
  '/demos/c-gilded': GildedReliquary,
}

const Demo = demoRoutes[path]

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {Demo ? (
      <React.Suspense fallback={null}>
        <Demo />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
)

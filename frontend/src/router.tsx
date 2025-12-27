import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { AppLayout } from './components/layout/AppLayout'
import { ActivityPage } from './pages/ActivityPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { CampaignListingPage } from './pages/CampaignListingPage'
import { CreateCampaignPage } from './pages/CreateCampaignPage'
import { LandingPage } from './pages/LandingPage'

const rootRoute = createRootRoute({
  component: AppLayout,
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/campaigns',
  component: CampaignListingPage,
})

const campaignDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/campaigns/$campaignId',
  component: CampaignDetailPage,
})

const createRoutePage = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreateCampaignPage,
})

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: ActivityPage,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  campaignsRoute,
  campaignDetailRoute,
  createRoutePage,
  activityRoute,
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

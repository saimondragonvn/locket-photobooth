import React, { Suspense, lazy } from 'react';
import { registerChunkLoaders, requireModule } from './runtime/moduleRegistry.js';

// Register lazy chunk loaders matching original code-split boundaries
registerChunkLoaders({
  2: () => import('./components/donate/DonateSection.jsx'),
  86: () => import('./components/friends/FriendsSection.js'),
  213: () => import('./pages/DashboardPage.js'),
  277: () => import('./vendor/mediapipeTasksVision.js'),
  471: () => import('./components/memories/MemoriesSection.js'),
  527: () => import('./vendor/mediapipeTasksVision.js'),
  561: () => import('./pages/LegalPage.js'),
  603: () => import('./components/upload/UploadStudio.js'),
  621: () => import('./components/donate/DonateSection.jsx'),
  691: () => import('./components/chat/ChatSection.js'),
  845: () => import('./vendor/mp4Muxer.js'),
  848: () => import('./pages/LoginPage.js'),
  910: () => import('./vendor/mp4Muxer.js'),
  947: () =>
    Promise.all([
      import('./components/profile/AccountSwitcherSheet.js'),
      import('./components/profile/ProfileSection.js'),
    ]),
  983: () => import('./components/profile/AccountSwitcherSheet.js'),
});

const LoginRoute = lazy(() =>
  import('./pages/LoginPage.js').then(() => ({ default: requireModule(4848).default }))
);
const DashboardRoute = lazy(() =>
  import('./pages/DashboardPage.js').then(() => ({ default: requireModule(1213).default }))
);
const TermsRoute = lazy(() =>
  import('./pages/LegalPage.js').then(() => ({ default: requireModule(5561).Terms }))
);
const PrivacyRoute = lazy(() =>
  import('./pages/LegalPage.js').then(() => ({ default: requireModule(5561).Privacy }))
);

const ROUTES = [
  { path: '/', Component: LoginRoute },
  { path: '/dashboard', Component: DashboardRoute },
  { path: '/terms', Component: TermsRoute },
  { path: '/privacy', Component: PrivacyRoute },
];

export default function App() {
  const BrowserRouter = requireModule(5475).Kd;
  const { BV: Routes, qh: Route } = requireModule(3216);
  const { N9: ToastContainer } = requireModule(3401);

  return (
    <>
      <BrowserRouter>
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
              }}
            >
              Loading...
            </div>
          }
        >
          <Routes>
            {ROUTES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer />
    </>
  );
}

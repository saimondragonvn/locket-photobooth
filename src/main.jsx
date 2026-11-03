// 1. Authentic CSS Modules & Foundations (loaded eagerly for zero FOUC)
import './styles/base.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/upload.css';
import './styles/memories.css';
import './styles/friends.css';
import './styles/accounts.css';
import './styles/profile.css';
import './styles/donate.css';
import './styles/cards.css';
import './styles/legal.css';

// 2. Core Runtime, Config, Assets, Services, Hooks, Utils & Primitives
import React from 'react';
import { createRoot } from 'react-dom/client';
import { requireModule } from './runtime/moduleRegistry.js';
import './config/apiRoutes.js';
import './assets/locketIcon.js';
import './services/storage.js';
import './services/api.js';
import './services/accounts.js';
import './services/appearance.js';
import './services/pwa.js';
import './services/outbox.js';
import './services/streak.js';
import './services/supporter.js';
import './services/momentAmbient.js';
import './hooks/useFeed.js';
import './hooks/useDesktop.js';
import './hooks/useFriends.js';
import './hooks/useConversations.js';
import './hooks/useBackIntercept.js';
import './utils/classnames.js';
import './utils/errors.js';
import './utils/filters.js';
import './utils/compressImage.js';
import './utils/videoCompress.js';
import './utils/overlays.js';
import './utils/time.js';
import './utils/media.js';
import './components/common/uiPrimitives.js';
import './components/common/routerAndToast.js';
import './components/feed/MomentFeed.js';

import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';

// 3. Initialize PWA install listener, --app-h viewport height & appearance tokens
requireModule(5525).G();
(() => {
  const docEl = document.documentElement;
  const syncHeight = () => docEl.style.setProperty('--app-h', `${window.innerHeight}px`);
  syncHeight();
  window.addEventListener('resize', syncHeight);
  window.addEventListener('pageshow', syncHeight);
})();
requireModule(3640).Fc();

// 4. Mount React root
createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

import LandingPage from './components/LandingPage.jsx';

function App() {
  // No `onNavigate` yet: the landing page falls back to smooth-scrolling to its
  // in-page sections. Pass an `onNavigate(key)` handler here once the five
  // question views (production, efficiency, hse, decisions, investment, map)
  // are routable.
  return <LandingPage />;
}

export default App;

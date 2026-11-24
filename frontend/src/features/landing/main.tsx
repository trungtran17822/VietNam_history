import { StrictMode, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/playfair-display';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import Home from './page';
import './styles.css';

function Landing() {
  useLayoutEffect(() => {
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, []);

  return <Home />;
}

createRoot(document.getElementById('app')!).render(<StrictMode><Landing /></StrictMode>);

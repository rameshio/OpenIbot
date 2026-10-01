import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './app.css';
import './premium.css';
import './providers.css';
import './options.css';
import './avatars.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

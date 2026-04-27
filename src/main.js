import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/theatrics.css';
import { inject } from '@vercel/analytics';
import { mountApp } from './ui/app.js';

// Lightweight, privacy-friendly page-view + speed analytics for the
// Vercel project dashboard. No-op when not deployed on Vercel.
inject();

const root = document.getElementById('app');
mountApp(root);

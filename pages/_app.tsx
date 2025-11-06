import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { useEffect } from 'react';

export default function MyApp({
  Component,
  pageProps
}: AppProps) {
  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    const root = document.documentElement;
    root.setAttribute('data-theme', savedTheme);
    root.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  return <Component {...pageProps} />;
}

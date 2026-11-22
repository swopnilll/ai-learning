'use client';
import { useEffect } from 'react';
import { LESSONS } from '@/lessons';

// The tutorial engine (diagrams, widgets, router) is framework-free JS in /public/js.
// This component renders its shell and loads the scripts in order.
const ENGINE = ['/js/helpers.js', '/js/diagram.js', '/js/widgets.js'];

function load(src: string) {
  return new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(src));
    document.body.appendChild(s);
  });
}

export default function Tutorial() {
  useEffect(() => {
    const w = window as any;
    if (w.__tutorialBooted) return;
    w.__tutorialBooted = true;
    (async () => {
      for (const s of [...ENGINE, ...LESSONS.map((l) => `/lessons/${l}.js`), '/js/app.js']) await load(s);
    })();
  }, []);

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" id="menuBtn" type="button" aria-label="Open course menu">&#9776;</button>
        <a className="brand" href="#/">
          <img src="/assets/aws-icons/architecture-service/AmazonBedrock.svg" alt="" />
          <span><b>AWS GenAI Developer</b><small>animated study tutorial</small></span>
        </a>
        <div className="top-progress" title="Course progress">
          <div className="bar"><i id="progressBar"></i></div>
          <span id="progressText">0%</span>
        </div>
        <button className="theme-btn" id="themeBtn" type="button" aria-label="Switch between light and dark">&#9680;</button>
      </header>
      <nav className="sidebar" id="sidebar" aria-label="Course contents"></nav>
      <div className="scrim" id="scrim"></div>
      <main id="main" tabIndex={-1}></main>
      <div className="lightbox" id="lightbox" hidden><img alt="" /></div>
    </>
  );
}

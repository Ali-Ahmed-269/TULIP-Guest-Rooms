/** Session key: the intro plays once per browser session */
export const INTRO_KEY = 'tgr-intro-seen';

/**
 * Runs in <head> before first paint (see layout.tsx). Decides whether the
 * intro plays, so returning visitors never see a flash of the loader.
 * Includes its own failsafe that releases the page after 8.5s no matter what.
 */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var skip=sessionStorage.getItem('${INTRO_KEY}')||window.matchMedia('(prefers-reduced-motion: reduce)').matches||location.pathname.indexOf('/admin')===0;d.setAttribute('data-intro',skip?'skip':'playing');}catch(e){d.setAttribute('data-intro','skip');}setTimeout(function(){if(d.getAttribute('data-intro')==='playing')d.setAttribute('data-intro','done');},8500);})();`;

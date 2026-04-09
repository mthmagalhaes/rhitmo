// Rhitmo Recorder — Content Script
// Injected into meet.google.com to detect meeting join/leave

(() => {
  let inMeeting = false;
  let observer = null;

  // Selectors that indicate an active call (Google Meet DOM markers)
  const CALL_INDICATORS = [
    '[data-call-ended]',           // end-call button area
    '[aria-label*="Leave"]',       // leave call button (EN)
    '[aria-label*="Sair"]',        // leave call button (PT)
    '[aria-label*="Desligar"]',    // hangup button (PT)
    '[data-tooltip*="Leave"]',
    '[data-tooltip*="Sair"]',
    '[data-tooltip*="Desligar"]',
    'button[jsname="CQylAd"]',    // hangup button jsname
    'button[jsname="Ahq7gc"]',    // alternate hangup jsname
    '[data-is-muted]',            // mute indicators = in call
    '[data-self-name]',           // self participant tile
    '[jscontroller="kAPMuc"]',    // call controls container
    'div[jsname="ME4pUe"]',       // bottom bar controls
    '[aria-label*="microphone"]', // mic button (EN)
    '[aria-label*="microfone"]',  // mic button (PT)
    '[aria-label*="camera"]',     // camera button
    '[aria-label*="câmera"]',     // camera button (PT)
  ];

  const ENDED_INDICATORS = [
    '[data-call-ended="true"]',
    '[jsname="r4nke"]',            // "return to home" after call ends
    '[data-call-ended]',           // generic call-ended marker
  ];

  function isInCall() {
    const url = window.location.href;
    if (url.includes('/landing') || !url.match(/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i)) {
      return false;
    }
    // Primary: check known DOM selectors
    const hasIndicator = CALL_INDICATORS.some(sel => document.querySelector(sel) !== null);
    if (hasIndicator) return true;
    // Fallback: if on a meeting URL and there are multiple video elements, likely in a call
    const videos = document.querySelectorAll('video');
    if (videos.length >= 2) return true;
    // Fallback 2: bottom bar with hangup button (red circle)
    const hangupBtn = document.querySelector('button[style*="background"][style*="red"], [data-promo-anchor-id="HANGUP_BUTTON"]');
    if (hangupBtn) return true;
    return false;
  }

  function isCallEnded() {
    return ENDED_INDICATORS.some(sel => document.querySelector(sel) !== null);
  }

  function checkMeetingState() {
    const currentlyInCall = isInCall();
    const callEnded = isCallEnded();

    if (currentlyInCall && !inMeeting) {
      inMeeting = true;
      console.log('[Rhitmo] Meeting joined — notifying background');
      chrome.runtime.sendMessage({ type: 'meeting-joined' });
    } else if ((!currentlyInCall || callEnded) && inMeeting) {
      inMeeting = false;
      console.log('[Rhitmo] Meeting left — notifying background');
      chrome.runtime.sendMessage({ type: 'meeting-left' });
    }
  }

  // Poll + MutationObserver for robustness
  function startObserving() {
    // Initial check after a delay (Meet takes time to render)
    setTimeout(checkMeetingState, 3000);
    setTimeout(checkMeetingState, 6000);
    setTimeout(checkMeetingState, 10000);

    // Periodic polling as fallback
    setInterval(checkMeetingState, 5000);

    // MutationObserver for faster detection
    observer = new MutationObserver(() => {
      checkMeetingState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'data-tooltip', 'data-call-ended'],
    });
  }

  // Listen for URL changes (SPA navigation)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // If navigated away from meeting room
      if (!location.href.match(/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i)) {
        if (inMeeting) {
          inMeeting = false;
          chrome.runtime.sendMessage({ type: 'meeting-left' });
        }
      }
    }
  }, 2000);

  startObserving();
  console.log('[Rhitmo] Content script loaded — monitoring for meetings');
})();

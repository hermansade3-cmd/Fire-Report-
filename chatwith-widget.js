(function () {
  var currentScript = document.currentScript;
  // Collect all data-* attributes from the script tag
  const scriptData = {};
  if (currentScript) {
    Object.keys(currentScript.dataset).forEach((key) => {
      scriptData[key] = currentScript.dataset[key];
    });
  }

  function init() {
    setTimeout(function () {
      // FIXED: removed the stray leading/trailing double-quote characters
      // that were wrapping the <style> tag as a JSON-escaped string.
      // Those extra quotes were being injected as invalid text nodes into
      // <head>, which made the style block unreliable in some browsers.
      document.head.insertAdjacentHTML(
        'beforeend',
        `<style>
      #chatwith-iframe {
        position: fixed;
        right: 0;
        border: none;
        width: 100%;
        box-shadow: rgba(0, 0, 0, 0.16) 0px 5px 40px;
        z-index: 9999999999;
      }
      #chatwith-launcher {
        overflow: hidden;
        cursor: pointer;
        padding: 0;
        background-color: #6366f1;
        background-image: none !important;
        color: white;
        border-radius: 9999px;
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: auto;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        z-index: 9999998;
        border: medium;
        transition: transform 250ms cubic-bezier(0.33, 0.00, 0.00, 1.00);
        box-shadow: 0 1px 6px 0 rgba(150, 150, 150, 0.06), 0 10px 30px 0 rgba(0, 0, 0, 0.16);
      }
      #chatwith-launcher:hover {
        transform: scale(1.1);
      }
      #chatwith-launcher:active {
        transform: scale(0.9);
      }
      #chatwith-bubble {
        position: fixed;
        bottom: 80px;
        right: 0;
        margin-right: 20px;
        margin-left: 20px;
        color: #212121;
        background-color: #fcfcfc;
        padding: 16px;
        border-radius: 10px;
        cursor: pointer;
        z-index: 9999998;
        font-size: 14px;
        border: medium;
        box-shadow: rgba(0, 0, 0, 0.10) 0px 5px 40px;
        max-width: 400px;
        word-wrap: normal;
        word-break: break-word;
      }
      #bubble-close {
        position: absolute;
        top: 5px;
        right: 10px;
        cursor: pointer;
      }
    </style>`
      );

      let logo =
        '<svg fill="white" stroke-width="0" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97-1.94.284-3.916.455-5.922.505a.39.39 0 00-.266.112L8.78 21.53A.75.75 0 017.5 21v-3.955a48.842 48.842 0 01-2.652-.316c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clip-rule="evenodd"></path></svg>';
      let bubble;
      const chevronDown =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.75" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>';

      // ---- Configuration ----
      // These were previously hard-coded placeholder comparisons
      // (e.g. `'' !== ''`, `'false' === 'true'`) left over from an
      // unfilled template. They now read from data-* attributes on the
      // <script> tag, with sensible defaults, so the widget is
      // actually configurable instead of silently always using defaults.
      const minWidth = 640;
      const customLogoUrl = scriptData.logoUrl || '';
      if (customLogoUrl !== '') {
        logo = `<img src="${customLogoUrl}" alt="Chatbot logo" style="width: 24px; height: 24px; margin: 0; padding: 0;">`;
      }
      const autoOpenDelay = scriptData.autoOpenDelay || '';
      const autoOpenMobile = scriptData.autoOpenMobile === 'true';
      const bubbleHideSetting = scriptData.bubbleHideUntil || 'Forever';
      const bubbleText = scriptData.bubbleText || '';
      const hasBubble = bubbleText !== '';
      const position = scriptData.position || 'bottom_right';
      const isLeft = position === 'bottom_left';

      function toggleChat(forceOpen = false) {
        const isOpen = iframe.style.display === 'block';
        if (forceOpen === true || !isOpen) {
          iframe.contentWindow.postMessage({ openChat: true }, '*');
          iframe.style.display = 'block';
          launcher.innerHTML = chevronDown;
          if (bubble) bubble.style.display = 'none'; // Hide bubble when launcher is clicked
          let hideUntil = null;
          if (bubbleHideSetting === 'Forever') {
            hideUntil = 'forever';
          } else if (bubbleHideSetting === 'OneDay') {
            hideUntil = Date.now() + 24 * 60 * 60 * 1000;
          }
          if (hideUntil) {
            localStorage.setItem('bubbleHideUntil', hideUntil);
          }
        } else {
          iframe.contentWindow.postMessage({ closeChat: true }, '*');
          iframe.style.display = 'none';
          launcher.innerHTML = logo;
        }
      }

      // Create bubble
      if (hasBubble) {
        bubble = document.createElement('div');
        bubble.setAttribute('id', 'chatwith-bubble');
        bubble.innerHTML = bubbleText;
        bubble.onclick = () => toggleChat(true);
        const storedHideUntil = localStorage.getItem('bubbleHideUntil');
        const isBubbleHidden =
          storedHideUntil === 'forever' ||
          (storedHideUntil && Date.now() < parseInt(storedHideUntil, 10));
        if (storedHideUntil !== 'Never' && !isBubbleHidden) {
          document.body.appendChild(bubble);
        }
      }

      const iframe = document.createElement('iframe');
      iframe.setAttribute('id', 'chatwith-iframe');
      iframe.src =
        'https://chatwith.tools/embed/70e18697-1103-429d-935d-eeecb1355912?display=popup' +
        (scriptData.variant
          ? '&variant=' + encodeURIComponent(scriptData.variant)
          : '');
      iframe.style.display = 'none';
      iframe.style.bottom = window.innerWidth < minWidth ? '0' : '84px';
      if (isLeft) {
        iframe.style.left = window.innerWidth < minWidth ? '0' : '20px';
      } else {
        iframe.style.right = window.innerWidth < minWidth ? '0' : '20px';
      }
      iframe.style.width = window.innerWidth < minWidth ? '100%' : '420px';
      iframe.style.height = window.innerWidth < minWidth ? '100%' : '75vh';
      iframe.style.borderRadius = window.innerWidth < minWidth ? '0' : '0.80rem';
      iframe.style.backgroundColor = '#fcfcfc';
      document.body.appendChild(iframe);

      const launcher = document.createElement('button');
      launcher.setAttribute('id', 'chatwith-launcher');
      launcher.innerHTML = logo;
      launcher.onclick = toggleChat;
      document.body.appendChild(launcher);

      window.addEventListener('resize', () => {
        iframe.style.bottom = window.innerWidth < minWidth ? '0' : '5rem';
        if (isLeft) {
          iframe.style.left = window.innerWidth < minWidth ? '0' : '1rem';
        } else {
          iframe.style.right = window.innerWidth < minWidth ? '0' : '1rem';
        }
        iframe.style.width = window.innerWidth < minWidth ? '100%' : '420px';
        iframe.style.height = window.innerWidth < minWidth ? '100%' : '75vh';
        iframe.style.borderRadius = window.innerWidth < minWidth ? '0' : '0.80rem';
      });

      window.addEventListener('message', (event) => {
        if (event.origin !== 'https://chatwith.tools') {
          return;
        }
        if (event.data.type === 'WIDGET_READY') {
          iframe.contentWindow.postMessage(
            {
              type: 'WIDGET_DATA',
              data: scriptData,
            },
            'https://chatwith.tools'
          );
        }
        if (event.data.closeChat) {
          iframe.style.display = 'none';
          launcher.innerHTML = logo;
        }
        if (event.data.openIntercom && window.Intercom) {
          window.Intercom('show');
        }
      });

      if (currentScript && currentScript.getAttribute('defaultopen')) {
        iframe.style.display = 'block';
      }

      if (autoOpenDelay && !sessionStorage.getItem('chatAutoOpened')) {
        const isMobile = window.innerWidth < minWidth;
        // Only auto-open if not on mobile, or if mobile auto-open is enabled
        if (!isMobile || autoOpenMobile) {
          setTimeout(() => {
            toggleChat(true);
            sessionStorage.setItem('chatAutoOpened', 'true');
          }, parseInt(autoOpenDelay * 1000, 10)); // in seconds
        }
      }
    }, 100);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();

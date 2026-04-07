/**
 * @fileoverview Minimal main script for homepage interactions and chat toggle.
 * @module frontend/assets/js/main.js
 */

// Minimal main script to ensure homepage removes preloader and chat toggles
(function () {
  'use strict';
  function select(sel) {
    try {
      return document.querySelector(sel);
    } catch (e) {
      return null;
    }
  }
  // Remove preloader when page fully loads
  window.addEventListener('load', function () {
    var pre = select('#preloader');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
  });

  // Simple AI chat toggle handlers
  var chatToggle = select('#ask-ai-toggle');
  var chatPanel = select('#ai-chat-panel');
  var chatOverlay = select('#ai-chat-overlay');
  var chatClose = select('#ai-chat-close');
  function openChat() {
    document.body.classList.add('ai-chat-open');
    if (chatPanel) chatPanel.setAttribute('aria-hidden', 'false');
    if (chatOverlay) chatOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeChat() {
    document.body.classList.remove('ai-chat-open');
    if (chatPanel) chatPanel.setAttribute('aria-hidden', 'true');
    if (chatOverlay) chatOverlay.setAttribute('aria-hidden', 'true');
  }
  if (chatToggle) chatToggle.addEventListener('click', openChat);
  if (chatClose) chatClose.addEventListener('click', closeChat);
  if (chatOverlay) chatOverlay.addEventListener('click', closeChat);
})();

// Populate hero company badges from /api/experience
(function () {
  'use strict';
  function fetchWithTimeout(url, opts, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    if (typeof AbortController === 'undefined') {
      return Promise.race([
        fetch(url, opts),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Timeout'));
          }, timeoutMs);
        }),
      ]);
    }
    const controller = new AbortController();
    const id = setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    return fetch(url, Object.assign({}, opts || {}, { signal: controller.signal })).finally(
      function () {
        clearTimeout(id);
      }
    );
  }

  async function loadCompanies() {
    const container = document.querySelector('.hero-company-badges');
    if (!container) return;
    // show simple loading state
    const original = container.innerHTML;
    container.innerHTML = '<span>Loading…</span>';

    const maxAttempts = 3;
    const baseDelay = 500;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetchWithTimeout(
          '/api/experience',
          { method: 'GET', headers: { Accept: 'application/json' } },
          10000
        );
        if (!res.ok) throw new Error('Non-OK response ' + res.status);
        const data = await res.json();
        const ex = data && data.experiences ? data.experiences : [];
        let companies = Array.isArray(ex)
          ? ex.map((e) => (e && e.companyName ? String(e.companyName).trim() : '')).filter(Boolean)
          : [];
        // Remove duplicates while preserving order (case-insensitive)
        const seen = new Set();
        companies = companies.filter((c) => {
          const key = String(c).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!companies || companies.length === 0) {
          container.innerHTML = original; // restore fallback
          return;
        }
        container.innerHTML = '';
        companies.forEach(function (c) {
          const span = document.createElement('span');
          span.textContent = c;
          container.appendChild(span);
        });
        // mark success for easier debugging/inspection
        try {
          container.setAttribute('data-dynamic', 'true');
          console.info('Experience: loaded', ex.length, 'items from /api/experience');
        } catch (e) {
          // ignore
        }
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          container.innerHTML = original; // restore original static badges on failure
          console.warn('Failed to load companies from API', err && err.message ? err.message : err);
          return;
        }
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCompanies);
  } else {
    loadCompanies();
  }
})();

// Handle images in the Certifications section without using inline event handlers
document.addEventListener('DOMContentLoaded', function () {
  try {
    var certImgs = document.querySelectorAll('#certifications img');
    certImgs.forEach(function (img) {
      function halve() {
        if (img.width) {
          img.width = Math.floor(img.width / 2);
        }
      }
      if (img.complete) {
        halve();
      } else {
        var handler = function () {
          halve();
          img.removeEventListener('load', handler);
        };
        img.addEventListener('load', handler);
      }
    });
  } catch (e) {
    // no-op on failures to avoid breaking page
  }
});
// @ts-nocheck
/**
 * Template Name: MyResume - v4.9.2
 * Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
 * Author: BootstrapMade.com
 * License: https://bootstrapmade.com/license/
 */
(function () {
  'use strict';
  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim();
    if (all) {
      return [...document.querySelectorAll(el)];
    } else {
      return document.querySelector(el);
    }
  };
  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all);
    if (selectEl) {
      if (all) {
        selectEl.forEach((e) => e.addEventListener(type, listener));
      } else {
        selectEl.addEventListener(type, listener);
      }
    }
  };
  /**
   * Easy on scroll event listener
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener);
  };
  const MODE_TRADITIONAL = 'traditional';
  const MODE_AI = 'ai';
  const MODE_STORAGE_KEY = 'site_mode';
  const getStoredMode = () => {
    try {
      const value = localStorage.getItem(MODE_STORAGE_KEY);
      if (!value) return null;
      const normalized = String(value).toLowerCase();
      return normalized === MODE_AI ? MODE_AI : MODE_TRADITIONAL;
    } catch (error) {
      return null;
    }
  };
  const setStoredMode = (mode) => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch (error) {
      // Ignore storage write errors (private mode, quota, etc.).
    }
  };
  // Applies page-level mode classes used by CSS for AI/traditional layout behavior.
  const applyMode = (mode) => {
    const body = select('body');
    if (!body) return;
    const resolvedMode = mode === MODE_AI ? MODE_AI : MODE_TRADITIONAL;
    body.dataset.siteMode = resolvedMode;
    body.classList.toggle('traditional-mode', resolvedMode === MODE_TRADITIONAL);
    body.classList.toggle('ai-mode', resolvedMode === MODE_AI);
    const traditionalBtn = select('#mode-toggle-traditional');
    const aiBtn = select('#mode-toggle-ai');
    if (traditionalBtn) {
      traditionalBtn.setAttribute('aria-pressed', String(resolvedMode === MODE_TRADITIONAL));
    }
    if (aiBtn) {
      aiBtn.setAttribute('aria-pressed', String(resolvedMode === MODE_AI));
    }
    setStoredMode(resolvedMode);
  };
  // Local storage persists mode across navigations; body data attribute is fallback default.
  const bodyMode = document.body && document.body.dataset ? document.body.dataset.siteMode : null;
  const configuredMode =
    getStoredMode() || (bodyMode ? String(bodyMode).toLowerCase() : MODE_TRADITIONAL);
  applyMode(configuredMode);
  on('click', '#mode-toggle-traditional', () => {
    applyMode(MODE_TRADITIONAL);
  });
  on('click', '#mode-toggle-ai', () => {
    applyMode(MODE_AI);
  });
  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true);
  const navbarlinksActive = () => {
    let position = window.scrollY + 200;
    navbarlinks.forEach((navbarlink) => {
      if (!navbarlink.hash) return;
      let section = select(navbarlink.hash);
      if (!section) return;
      if (position >= section.offsetTop && position <= section.offsetTop + section.offsetHeight) {
        navbarlink.classList.add('active');
      } else {
        navbarlink.classList.remove('active');
      }
    });
  };
  window.addEventListener('load', navbarlinksActive);
  onscroll(document, navbarlinksActive);
  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop;
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth',
    });
  };
  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top');
  if (backtotop) {
    // Hide the floating back-to-top on admin pages
    try {
      var path = window.location && window.location.pathname ? window.location.pathname : '';
      if (String(path).toLowerCase().startsWith('/admin')) {
        backtotop.style.display = 'none';
      } else {
        const toggleBacktotop = () => {
          if (window.scrollY > 100) {
            backtotop.classList.add('active');
          } else {
            backtotop.classList.remove('active');
          }
        };
        window.addEventListener('load', toggleBacktotop);
        onscroll(document, toggleBacktotop);
      }
    } catch (e) {
      // fallback to default behavior
      const toggleBacktotop = () => {
        if (window.scrollY > 100) {
          backtotop.classList.add('active');
        } else {
          backtotop.classList.remove('active');
        }
      };
      window.addEventListener('load', toggleBacktotop);
      onscroll(document, toggleBacktotop);
    }
  }
  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function (_e) {
    select('body').classList.toggle('mobile-nav-active');
    this.classList.toggle('bi-list');
    this.classList.toggle('bi-x');
  });
  /**
   * Scroll with offset on links with a class name .scrollto
   */
  on(
    'click',
    '.scrollto',
    function (e) {
      if (select(this.hash)) {
        e.preventDefault();
        let body = select('body');
        if (body.classList.contains('mobile-nav-active')) {
          body.classList.remove('mobile-nav-active');
          let navbarToggle = select('.mobile-nav-toggle');
          navbarToggle.classList.toggle('bi-list');
          navbarToggle.classList.toggle('bi-x');
        }
        scrollto(this.hash);
      }
    },
    true
  );
  /**
   * Scroll with offset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash);
      }
    }
  });
  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }
  /**
   * Hero type effect
   */
  const typed = select('.typed');
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items');
    typed_strings = typed_strings.split(',');
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000,
    });
  }
  /**
   * Skills animation
   */
  let skillsContent = select('.skills-content');
  if (skillsContent) {
    new Waypoint({
      element: skillsContent,
      offset: '80%',
      handler: function (_direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%';
        });
      },
    });
  }
  /**
   * Portfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item',
      });
      let portfolioFilters = select('#portfolio-filters li', true);
      on(
        'click',
        '#portfolio-filters li',
        function (e) {
          e.preventDefault();
          portfolioFilters.forEach(function (el) {
            el.classList.remove('filter-active');
          });
          this.classList.add('filter-active');
          portfolioIsotope.arrange({
            filter: this.getAttribute('data-filter'),
          });
          portfolioIsotope.on('arrangeComplete', function () {
            AOS.refresh();
          });
        },
        true
      );
    }
  });
  /**
   * Initiate portfolio lightbox
   */
  GLightbox({ selector: '.portfolio-lightbox' });
  /**
   * Initiate portfolio details lightbox
   */
  GLightbox({ selector: '.portfolio-details-lightbox', width: '90%', height: '90vh' });
  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true,
    },
  });
  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true,
    },
  });
  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
    });
  });
  /**
   * Initiate Pure Counter
   */
  new PureCounter();
  /**
   * Ask AI slide-in chat
   */
  // Bind chat handlers after the DOM is ready so elements inserted after scripts are available
  document.addEventListener('DOMContentLoaded', function () {
    const chatToggle = select('#ask-ai-toggle');
    const chatPanel = select('#ai-chat-panel');
    const chatOverlay = select('#ai-chat-overlay');
    const chatClose = select('#ai-chat-close');
    const chatHistory = select('#ai-chat-history');
    const chatInput = select('#ai-chat-input');
    const chatSend = select('#ai-chat-send');
    const chatSuggestions = select('.ai-suggestion', true);
    const appendMessage = (text, role) => {
      if (!chatHistory) return;
      const bubble = document.createElement('div');
      bubble.classList.add('ai-msg', role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant');
      bubble.textContent = text;
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    };
    // Typing indicator helper (shows animated dots while awaiting AI response)
    let _typingIndicatorEl = null;
    const showTypingIndicator = () => {
      if (!chatHistory || _typingIndicatorEl) return;
      const bubble = document.createElement('div');
      bubble.classList.add('ai-msg', 'ai-msg-assistant', 'ai-msg-typing');
      bubble.setAttribute('aria-hidden', 'true');
      bubble.innerHTML =
        '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;
      _typingIndicatorEl = bubble;
    };
    const hideTypingIndicator = () => {
      if (_typingIndicatorEl && _typingIndicatorEl.parentNode) {
        _typingIndicatorEl.parentNode.removeChild(_typingIndicatorEl);
      }
      _typingIndicatorEl = null;
    };
    const callChatApi = async (prompt) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      let response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: prompt }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
      if (!response.ok) {
        let details = '';
        try {
          const errorData = await response.json();
          details = errorData && errorData.error ? `: ${errorData.error}` : '';
        } catch (e) {
          details = '';
        }
        throw new Error(`AI request failed (${response.status})${details}`);
      }
      const data = await response.json();
      return data && data.response ? data.response : 'I could not generate a response right now.';
    };
    const sendPrompt = async (rawPrompt) => {
      const prompt = (rawPrompt || '').trim();
      if (!prompt) return;
      appendMessage(prompt, 'user');
      if (chatInput) chatInput.value = '';
      if (chatSend) {
        chatSend.disabled = true;
      }
      // show typing indicator while waiting for the AI response
      showTypingIndicator();
      try {
        const answer = await callChatApi(prompt);
        hideTypingIndicator();
        appendMessage(answer, 'assistant');
      } catch (error) {
        hideTypingIndicator();
        const msg =
          error && error.name === 'AbortError'
            ? 'The AI service timed out. Please try again in a moment.'
            : `I am having trouble reaching the AI service right now. ${
                error && error.message ? error.message : ''
              }`.trim();
        appendMessage(msg, 'assistant');
      } finally {
        if (chatSend) {
          chatSend.disabled = false;
        }
      }
    };
    const openChat = () => {
      document.body.classList.add('ai-chat-open');
      if (chatPanel) chatPanel.setAttribute('aria-hidden', 'false');
      if (chatOverlay) chatOverlay.setAttribute('aria-hidden', 'false');
      if (chatHistory && !chatHistory.hasChildNodes()) {
        appendMessage(
          'Ask me about strengths, hard lessons, leadership, or project outcomes.',
          'assistant'
        );
      }
      if (chatInput) chatInput.focus();
    };
    const closeChat = () => {
      document.body.classList.remove('ai-chat-open');
      if (chatPanel) chatPanel.setAttribute('aria-hidden', 'true');
      if (chatOverlay) chatOverlay.setAttribute('aria-hidden', 'true');
    };
    if (chatToggle && chatPanel) {
      chatToggle.addEventListener('click', openChat);
    }
    if (chatClose) {
      chatClose.addEventListener('click', closeChat);
    }
    if (chatOverlay) {
      chatOverlay.addEventListener('click', closeChat);
    }
    if (chatSend) {
      chatSend.addEventListener('click', () => sendPrompt(chatInput ? chatInput.value : ''));
    }
    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          sendPrompt(chatInput.value);
        }
        if (event.key === 'Escape') {
          closeChat();
        }
      });
    }
    if (chatSuggestions && chatSuggestions.length > 0) {
      chatSuggestions.forEach((btn) => {
        btn.addEventListener('click', () => {
          const text = btn.textContent || '';
          sendPrompt(text);
        });
      });
    }
  });
  // Delegate clicks for suggestion buttons that may be added dynamically
  document.addEventListener('click', function (e) {
    try {
      var tgt = e.target;
      if (tgt && tgt.classList && tgt.classList.contains('ai-suggestion')) {
        var text = (tgt.textContent || '').trim();
        if (text) {
          sendPrompt(text);
        }
      }
    } catch (err) {
      // swallow errors to avoid breaking unrelated click handlers
    }
  });
})();

/**
 * @fileoverview Minimal main script for homepage interactions and chat toggle.
 * @module frontend/assets/js/main.js
 */
if (typeof require === 'function') {
  require('./fetch-utils.js');
}

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
  const select = (el, all = false) => {
    el = el.trim();
    if (all) {
      return [...document.querySelectorAll(el)];
    } else {
      return document.querySelector(el);
    }
  };
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
    // Disable or restore Experience hero button to prevent navigation in AI mode
    try {
      const expBtn = select('#hero-experience');
      if (expBtn) {
        if (resolvedMode === MODE_AI) {
          // remove href and mark disabled for accessibility
          if (expBtn.getAttribute('href'))
            expBtn.setAttribute('data-href-backup', expBtn.getAttribute('href'));
          expBtn.removeAttribute('href');
          expBtn.setAttribute('aria-disabled', 'true');
          expBtn.classList.add('disabled');
        } else {
          const backup = expBtn.getAttribute('data-href-backup');
          if (backup) expBtn.setAttribute('href', backup);
          expBtn.removeAttribute('data-href-backup');
          expBtn.removeAttribute('aria-disabled');
          expBtn.classList.remove('disabled');
        }
      }
    } catch (e) {}
  };
  // Local storage persists mode across navigations; body data attribute is fallback default.
  const bodyMode = document.body && document.body.dataset ? document.body.dataset.siteMode : null;
  const configuredMode =
    getStoredMode() || (bodyMode ? String(bodyMode).toLowerCase() : MODE_TRADITIONAL);
  applyMode(configuredMode);
  on('click', '#mode-toggle-traditional', () => {
    applyMode(MODE_TRADITIONAL);
    try {
      if (select('#hero')) scrollto('#hero');
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      // ignore if scrolling fails
    }
  });
  on('click', '#mode-toggle-ai', () => {
    // Show experimental modal before enabling AI mode
    try {
      const modal = document.getElementById('ai-experimental-modal');
      const confirmBtn = document.getElementById('ai-experimental-confirm');
      const backBtn = document.getElementById('ai-experimental-back');
      if (!modal || !confirmBtn) {
        applyMode(MODE_AI);
        try {
          if (select('#hero')) scrollto('#hero');
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          // ignore if scrolling fails
        }
        return;
      }
      const backdrop = modal.querySelector('.modal-backdrop');

      const showModal = () => {
        modal.style.display = 'block';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        modal.style.zIndex = '1050';
        if (backdrop) {
          backdrop.style.display = 'block';
          backdrop.style.zIndex = '1040';
        }
        try {
          document.body.classList.add('modal-open');
        } catch (e) {}
        try {
          setTimeout(function () {
            if (confirmBtn && typeof confirmBtn.focus === 'function') confirmBtn.focus();
          }, 0);
        } catch (e) {}
      };

      const hideModal = () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        if (backdrop) backdrop.style.display = 'none';
        try {
          document.body.classList.remove('modal-open');
        } catch (e) {}
      };

      const onConfirm = () => {
        hideModal();
        applyMode(MODE_AI);
        try {
          if (select('#hero')) scrollto('#hero');
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          // ignore if scrolling fails
        }
        confirmBtn.removeEventListener('click', onConfirm);
        if (backBtn) backBtn.removeEventListener('click', onBack);
      };

      const onBack = () => {
        hideModal();
        applyMode(MODE_TRADITIONAL);
        try {
          if (select('#hero')) scrollto('#hero');
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {}
        confirmBtn.removeEventListener('click', onConfirm);
        if (backBtn) backBtn.removeEventListener('click', onBack);
      };

      confirmBtn.addEventListener('click', onConfirm);
      if (backBtn) backBtn.addEventListener('click', onBack);
      showModal();
    } catch (e) {
      try {
        if (select('#hero')) scrollto('#hero');
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        // ignore if scrolling fails
      }
    }
  });
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
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop;
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth',
    });
  };
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
  on('click', '.mobile-nav-toggle', function (_e) {
    select('body').classList.toggle('mobile-nav-active');
    this.classList.toggle('bi-list');
    this.classList.toggle('bi-x');
  });
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
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash);
      }
    }
  });
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }
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
  GLightbox({ selector: '.portfolio-lightbox' });
  GLightbox({ selector: '.portfolio-details-lightbox', width: '90%', height: '90vh' });
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
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
    });
  });
  new PureCounter();
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
      // Render lightweight Markdown (bold **text** and simple - list items)
      const escapeHtml = (str) =>
        String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const renderMarkdown = (md) => {
        if (!md) return '';
        // escape first to prevent XSS
        const escaped = escapeHtml(md);
        // handle bold **text**
        let html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // handle simple unordered lists: lines starting with '- '
        const lines = html.split(/\r?\n/);
        let out = [];
        let inList = false;
        lines.forEach((ln) => {
          if (/^\s*-\s+/.test(ln)) {
            if (!inList) {
              inList = true;
              out.push('<ul>');
            }
            out.push('<li>' + ln.replace(/^\s*-\s+/, '') + '</li>');
          } else {
            if (inList) {
              inList = false;
              out.push('</ul>');
            }
            out.push('<p>' + ln + '</p>');
          }
        });
        if (inList) out.push('</ul>');
        return out.join('\n');
      };

      bubble.innerHTML = renderMarkdown(text);
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    };
    // Typing indicator helper (shows animated dots while awaiting AI response)
    let typingIndicatorEl = null;
    const showTypingIndicator = () => {
      if (!chatHistory || typingIndicatorEl) return;
      const bubble = document.createElement('div');
      bubble.classList.add('ai-msg', 'ai-msg-assistant', 'ai-msg-typing');
      bubble.setAttribute('aria-hidden', 'true');
      bubble.innerHTML =
        '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;
      typingIndicatorEl = bubble;
    };
    const hideTypingIndicator = () => {
      if (typingIndicatorEl && typingIndicatorEl.parentNode) {
        typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
      }
      typingIndicatorEl = null;
    };
    const callChatApi = async (prompt) => {
      const response = await apiFetch(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt }),
        },
        { timeoutMs: 10000, maxAttempts: 7, baseDelay: 500 }
      );
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

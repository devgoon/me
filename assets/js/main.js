/**
* Template Name: MyResume - v4.9.2
* Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  const MODE_TRADITIONAL = 'traditional';
  const MODE_AI = 'ai';

  // Applies page-level mode classes used by CSS for AI/traditional layout behavior.
  const applyMode = (mode) => {
    const body = select('body');
    if (!body) return;

    const resolvedMode = mode === MODE_AI ? MODE_AI : MODE_TRADITIONAL;
    body.classList.toggle('traditional-mode', resolvedMode === MODE_TRADITIONAL);
    body.classList.toggle('ai-mode', resolvedMode === MODE_AI);
  }

  // Primary source of truth for mode is <body data-site-mode="..."> in index.html.
  const bodyMode = document.body && document.body.dataset ? document.body.dataset.siteMode : null;
  const configuredMode = bodyMode ? String(bodyMode).toLowerCase() : MODE_TRADITIONAL;
  applyMode(configuredMode);

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }

  /**
   * Hero type effect
   */
  const typed = select('.typed')
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items')
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item'
      });

      let portfolioFilters = select('#portfolio-flters li', true);

      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Initiate portfolio lightbox 
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  /**
   * Initiate portfolio details lightbox 
   */
  const portfolioDetailsLightbox = GLightbox({
    selector: '.portfolio-details-lightbox',
    width: '90%',
    height: '90vh'
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

  /**
   * Initiate Pure Counter 
   */
  new PureCounter();

  /**
   * Ask AI slide-in chat
   */
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

  const callChatApi = async (prompt) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal
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
    chatInput.value = '';

    if (chatSend) {
      chatSend.disabled = true;
    }

    try {
      const answer = await callChatApi(prompt);
      appendMessage(answer, 'assistant');
    } catch (error) {
      const msg = error && error.name === 'AbortError'
        ? 'The AI service timed out. Please try again in a moment.'
        : `I am having trouble reaching the AI service right now. ${error && error.message ? error.message : ''}`.trim();
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
      appendMessage('Ask me about strengths, hard lessons, leadership, or project outcomes.', 'assistant');
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

})()
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

  const answerFromPrompt = (prompt) => {
    const q = prompt.toLowerCase();

    if (q.includes('biggest weakness')) {
      return 'I tend to default to high standards for architecture and observability, which can feel heavy for very early prototypes. I manage this by scaling process to stage: lighter guardrails for discovery, stronger rigor once value is proven.';
    }

    if (q.includes('project that failed') || q.includes('failed')) {
      return 'I have had initiatives where we over-optimized early architecture before fully validating user workflow. The lesson was to front-load discovery with operators, ship thinner slices sooner, and let real usage drive complexity.';
    }

    if (q.includes('why did you leave')) {
      return 'I usually move when the next step increases scope of impact, technical challenge, or growth. The pattern across roles has been intentional progression toward higher ownership and broader systems responsibility.';
    }

    if (q.includes('last manager')) {
      return 'They would likely say I raise the technical bar, stay calm in ambiguity, and take ownership from architecture through delivery. They would also say I push for clarity and measurable outcomes, especially around reliability.';
    }

    return 'My experience centers on building cloud-native systems that are scalable, observable, and practical for real teams. If you ask about a specific company or project, I can give a more direct answer.';
  };

  const sendPrompt = (rawPrompt) => {
    const prompt = (rawPrompt || '').trim();
    if (!prompt) return;
    appendMessage(prompt, 'user');
    chatInput.value = '';
    window.setTimeout(() => {
      appendMessage(answerFromPrompt(prompt), 'assistant');
    }, 220);
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
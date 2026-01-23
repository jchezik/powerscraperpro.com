/* ============================================================
   POWER SCRAPER PRO - Website Interactions
   Lightweight, performant, no dependencies.
   Uses modern APIs with progressive enhancement.
   ============================================================ */

(function() {
  'use strict';

  // --- Utility: Reduced Motion Check ---
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Scroll-based Navigation Styling ---
  var nav = document.querySelector('.nav');

  if (nav) {
    var handleNavScroll = function() {
      if (window.scrollY > 50) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }
    };

    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll(); // Set initial state
  }

  // --- Mobile Navigation Toggle ---
  var navToggle = document.querySelector('.nav__toggle');
  var navLinks = document.querySelector('.nav__links');

  if (navToggle && navLinks) {
    var bars = navToggle.querySelectorAll('.nav__toggle-bar');

    var closeNav = function() {
      navLinks.classList.remove('nav__links--open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (bars.length >= 3) {
        bars[0].style.transform = '';
        bars[1].style.opacity = '';
        bars[2].style.transform = '';
      }
    };

    navToggle.addEventListener('click', function() {
      var isOpen = navLinks.classList.toggle('nav__links--open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (bars.length >= 3) {
        if (isOpen) {
          bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
          bars[1].style.opacity = '0';
          bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
          bars[0].style.transform = '';
          bars[1].style.opacity = '';
          bars[2].style.transform = '';
        }
      }
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('.nav__link').forEach(function(link) {
      link.addEventListener('click', closeNav);
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navLinks.classList.contains('nav__links--open')) {
        closeNav();
        navToggle.focus();
      }
    });
  }

  // --- Scroll Reveal (Intersection Observer) ---
  var revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    if (prefersReducedMotion) {
      // Skip animation, show all immediately
      revealElements.forEach(function(el) {
        el.classList.add('reveal--visible');
      });
    } else {
      var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      revealElements.forEach(function(el) {
        revealObserver.observe(el);
      });
    }
  } else {
    // Fallback: show all elements
    revealElements.forEach(function(el) {
      el.classList.add('reveal--visible');
    });
  }

  // --- Lightbox for Gallery ---
  var galleryItems = document.querySelectorAll('.gallery-item');
  var lightbox = document.querySelector('.lightbox');
  var lightboxImg = document.querySelector('.lightbox__img');
  var lightboxClose = document.querySelector('.lightbox__close');

  if (lightbox && galleryItems.length > 0) {
    var previousFocus = null;

    var openLightbox = function(src, alt) {
      previousFocus = document.activeElement;
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightbox.classList.add('lightbox--active');
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();
    };

    var closeLightbox = function() {
      lightbox.classList.remove('lightbox--active');
      document.body.style.overflow = '';
      if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
      }
    };

    galleryItems.forEach(function(item) {
      // Make gallery items focusable and keyboard-accessible
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');

      var handleOpen = function() {
        var img = item.querySelector('.gallery-item__img');
        if (img) {
          openLightbox(img.src, img.alt);
        }
      };

      item.addEventListener('click', handleOpen);
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.classList.contains('lightbox--active')) {
        closeLightbox();
      }
    });
  }

  // --- Animated Counter (for stats) ---
  var statNumbers = document.querySelectorAll('.stat__number');

  if (statNumbers.length > 0 && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(function(el) {
      counterObserver.observe(el);
    });
  }

  function animateCounter(el) {
    var target = el.getAttribute('data-count');
    if (!target) return;

    var isPlus = target.includes('+');
    var numericTarget = parseInt(target.replace(/[^0-9]/g, ''), 10);

    if (prefersReducedMotion) {
      el.textContent = numericTarget.toLocaleString() + (isPlus ? '+' : '');
      return;
    }

    var duration = 2000;
    var startTime = performance.now();

    function update(currentTime) {
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * numericTarget);

      el.textContent = current.toLocaleString() + (isPlus ? '+' : '');

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // --- Floating Particles Generator ---
  var particlesContainer = document.querySelector('.particles');

  if (particlesContainer && !prefersReducedMotion) {
    var particleCount = window.innerWidth > 768 ? 20 : 8;
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < particleCount; i++) {
      var particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (15 + Math.random() * 20) + 's';
      particle.style.animationDelay = (Math.random() * 15) + 's';
      var size = (1 + Math.random() * 2) + 'px';
      particle.style.width = size;
      particle.style.height = size;
      fragment.appendChild(particle);
    }

    particlesContainer.appendChild(fragment);
  }

  // --- Smooth Scroll for Anchor Links ---
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
        var targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });

        // Move focus for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  // --- Active Nav Link Highlighting ---
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('nav__link--active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('nav__link--active');
      link.removeAttribute('aria-current');
    }
  });

})();

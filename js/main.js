/* ==========================================================================
   Power Scraper Pro — Interactions
   Minimal, performant, modern. No dependencies.
   ========================================================================== */

(() => {
  'use strict';

  // --- Respect reduced motion ---
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- Header scroll behavior ---
  const header = document.querySelector('.header');

  if (header) {
    let lastScroll = 0;
    const onScroll = () => {
      const scrollY = window.scrollY;
      header.classList.toggle('header--scrolled', scrollY > 50);
      lastScroll = scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile menu ---
  const toggle = document.querySelector('.nav__mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (toggle && mobileMenu) {
    const openMenu = () => {
      toggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    });

    // Close on link click
    mobileMenu.querySelectorAll('.mobile-menu__link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('mobile-menu--open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
        window.scrollTo({ top: targetPosition, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
      }
    });
  });

  // --- Scroll reveal with IntersectionObserver ---
  if (!prefersReducedMotion.matches) {
    const revealElements = document.querySelectorAll('[data-reveal]');

    if (revealElements.length > 0) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
      });

      revealElements.forEach(el => revealObserver.observe(el));
    }
  } else {
    // If reduced motion, reveal everything immediately
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('revealed');
    });
  }

  // --- Active nav link highlighting on scroll ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  if (sections.length > 0 && navLinks.length > 0) {
    const highlightObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => highlightObserver.observe(section));
  }
})();

// SEO Group Buy Tools — Main JS
(function () {
  'use strict';

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('open');
      navToggle.classList.toggle('active');
      this.setAttribute('aria-expanded', navMenu.classList.contains('open'));
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 900) {
          navMenu.classList.remove('open');
          navToggle.classList.remove('active');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // Header scroll effect
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Scroll reveal — cards only (never hide whole sections)
  const revealElements = document.querySelectorAll(
    '.cat-card, .tool-card, .feature-card, .pricing-card'
  );

  if ('IntersectionObserver' in window && revealElements.length) {
    document.documentElement.classList.add('js-reveal');

    revealElements.forEach(function (el) {
      el.classList.add('reveal');
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 0px 0px' });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Category filter on homepage tools grid
  const catButtons = document.querySelectorAll('.hero-cat-filter button');
  const toolCards = document.querySelectorAll('.js-resource-card');
  if (catButtons.length && toolCards.length) {
    catButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        catButtons.forEach(function (b) {
          b.parentElement.classList.remove('active');
        });
        btn.parentElement.classList.add('active');
        const cat = btn.querySelector('.cat-name')?.textContent?.trim().toLowerCase() || 'all';
        toolCards.forEach(function (card) {
          if (cat === 'all tools' || cat === 'all') {
            card.classList.remove('is-hidden');
          } else {
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            card.classList.toggle('is-hidden', !tags.includes(cat));
          }
        });
      });
    });
  }

  // Article table of contents from section headings (skip on homepage guide)
  const mainContent = document.querySelector('.main-content.content-article');
  if (mainContent && !mainContent.classList.contains('content-article--plain')) {
    const headings = mainContent.querySelectorAll('.content-section > h2');
    if (headings.length >= 3) {
      const toc = document.createElement('nav');
      toc.className = 'article-toc';
      toc.setAttribute('aria-label', 'On this page');

      const title = document.createElement('div');
      title.className = 'article-toc__title';
      title.textContent = 'On this page';
      toc.appendChild(title);

      const ol = document.createElement('ol');
      headings.forEach(function (h2, index) {
        const section = h2.closest('.content-section');
        let id = section && section.id;
        if (!id) {
          id = 'section-' + (index + 1);
          if (section) section.id = id;
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = h2.textContent.replace(/^\d+\s*/, '').trim();
        li.appendChild(a);
        ol.appendChild(li);
      });
      toc.appendChild(ol);
      mainContent.insertBefore(toc, mainContent.firstChild);
    }
  }
})();

/* =============================================
   script.js — Scroll animations + Hamburger menu
   ============================================= */

// ---- Hamburger Menu ----
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const open = navLinks.classList.contains('open');
  hamburger.setAttribute('aria-expanded', open);
});

// Close menu when link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ---- Navbar scroll shadow ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.5)';
  } else {
    navbar.style.boxShadow = 'none';
  }
}, { passive: true });

// ---- Scroll Reveal (IntersectionObserver) ----
const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // 一度表示したら監視解除
    }
  });
}, observerOptions);

revealEls.forEach(el => observer.observe(el));

// ---- Smooth active nav highlight ----
const sections = document.querySelectorAll('section[id]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.getAttribute('id');
    const link = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (!link) return;
    if (entry.isIntersecting) {
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active-link'));
      link.classList.add('active-link');
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => navObserver.observe(s));

// Active link style injection
const style = document.createElement('style');
style.textContent = `.nav-links a.active-link { color: #fff !important; } .nav-links a.active-link::after { width: 100% !important; }`;
document.head.appendChild(style);

// ---- Parallax on hero orbs ----
const orbs = document.querySelectorAll('.orb');
document.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;

  orbs.forEach((orb, i) => {
    const factor = (i + 1) * 12;
    orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
  });
}, { passive: true });

// ---- Avatar pulse on hover ----
const avatar = document.querySelector('.avatar-svg');
const ring    = document.querySelector('.avatar-ring');

if (avatar) {
  avatar.addEventListener('mouseenter', () => {
    ring.style.animationDuration = '1.5s';
  });
  avatar.addEventListener('mouseleave', () => {
    ring.style.animationDuration = '6s';
  });
}

// ---- Typed text effect in hero tagline ----
const tagline = document.querySelector('.hero-tagline');
if (tagline) {
  const lines = ['Game Lover & Programming Enthusiast', 'AI × Human Partner'];
  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeEffect() {
    const current = lines[lineIndex];
    if (!isDeleting) {
      tagline.innerHTML = current.substring(0, charIndex + 1)
        + (lineIndex === 0 ? '<br>AI × Human Partner' : '<br>Game Lover &amp; Programming Enthusiast');
      charIndex++;
      if (charIndex === current.length) {
        isDeleting = true;
        setTimeout(typeEffect, 2000);
        return;
      }
    } else {
      tagline.innerHTML = current.substring(0, charIndex - 1)
        + (lineIndex === 0 ? '<br>AI × Human Partner' : '<br>Game Lover &amp; Programming Enthusiast');
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        lineIndex = (lineIndex + 1) % lines.length;
        setTimeout(typeEffect, 500);
        return;
      }
    }
    setTimeout(typeEffect, isDeleting ? 40 : 70);
  }

  // Start after brief delay
  setTimeout(typeEffect, 1200);
}

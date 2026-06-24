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

// ---- Tetris Background Animation ----
const canvas = document.getElementById('tetris-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Tetromino colors and shapes
  const colors = ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'];
  const shapes = [
    [[1, 1, 1, 1]], // I
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
    [[1, 1], [1, 1]], // O
    [[0, 1, 1], [1, 1, 0]], // S
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]]  // Z
  ];

  class Tetromino {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.shape = shapes[Math.floor(Math.random() * shapes.length)];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = Math.random() * 12 + 10; // Block size
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : -100;
      this.speedY = Math.random() * 1.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.rotation += this.rotationSpeed;
      if (this.y > height + 100) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      
      const cols = this.shape[0].length;
      const rows = this.shape.length;
      const offsetX = -(cols * this.size) / 2;
      const offsetY = -(rows * this.size) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (this.shape[r][c]) {
            ctx.fillRect(offsetX + c * this.size, offsetY + r * this.size, this.size - 1, this.size - 1);
          }
        }
      }
      ctx.restore();
    }
  }

  // 画面に降らせるブロックの数
  const tetrominoes = Array.from({ length: 35 }, () => new Tetromino());

  function animate() {
    ctx.clearRect(0, 0, width, height);
    tetrominoes.forEach(t => {
      t.update();
      t.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ---- Bulletin Board Widget ----
const boardWidget = document.getElementById('bulletin-board');
const boardToggle = document.getElementById('board-toggle');
const boardHeader = document.querySelector('.board-header');
const boardForm = document.getElementById('board-form');
const boardInput = document.getElementById('board-input');
const boardName = document.getElementById('board-name');
const boardMessages = document.getElementById('board-messages');

if (boardWidget) {
  // Toggle visibility
  boardHeader.addEventListener('click', () => {
    boardWidget.classList.toggle('minimized');
    boardToggle.textContent = boardWidget.classList.contains('minimized') ? '□' : '_';
  });

  // Load messages from Server (Fallback to localStorage)
  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error('API error or DB not configured');
      const msgs = await res.json();
      
      boardMessages.innerHTML = '';
      msgs.forEach(msg => appendMessage(msg.name || 'システム', msg.text, msg.time));
      scrollToBottom();
    } catch (e) {
      // ローカル環境やKV未設定時のフォールバック
      console.log('サーバーからの読み込みに失敗したため、ローカル保存のデータを表示します');
      const msgs = JSON.parse(localStorage.getItem('pb_messages') || '[]');
      boardMessages.innerHTML = '';
      msgs.forEach(msg => appendMessage(msg.name || 'システム', msg.text, msg.time));
      scrollToBottom();
    }
  };

  const saveMessage = async (name, text, time) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text, time })
      });
      if (!res.ok) throw new Error('API error or DB not configured');
    } catch (e) {
      // ローカル環境やKV未設定時のフォールバック
      console.log('サーバーへの保存に失敗したため、ローカルに保存します');
      const msgs = JSON.parse(localStorage.getItem('pb_messages') || '[]');
      msgs.push({ name, text, time });
      if (msgs.length > 50) msgs.shift(); // Keep last 50 messages
      localStorage.setItem('pb_messages', JSON.stringify(msgs));
    }
  };

  const getAnonymousId = () => {
    let id = parseInt(localStorage.getItem('pb_anon_id') || '1', 10);
    localStorage.setItem('pb_anon_id', (id + 1).toString());
    return id;
  };

  const appendMessage = (name, text, time) => {
    const div = document.createElement('div');
    div.className = 'board-msg';
    div.innerHTML = `
      <div class="board-msg-header">
        <span class="board-msg-name"></span>
        <span class="msg-time">${time}</span>
      </div>
      <span class="board-msg-text"></span>
    `;
    div.querySelector('.board-msg-name').textContent = name;
    div.querySelector('.board-msg-text').textContent = text;
    boardMessages.appendChild(div);
  };

  const scrollToBottom = () => {
    boardMessages.scrollTop = boardMessages.scrollHeight;
  };

  boardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = boardInput.value.trim();
    let name = boardName.value.trim();
    
    if (!text) return;
    
    if (!name) {
      name = `名無しさん #${getAnonymousId()}`;
    }
    
    const now = new Date();
    const time = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    appendMessage(name, text, time);
    saveMessage(name, text, time);
    scrollToBottom();
    boardInput.value = '';
    // Optional: boardName is intentionally left filled so they don't have to type it again.
  });

  // Initial load
  loadMessages();
  
  // Add an initial welcome message if empty
  if (boardMessages.children.length === 0) {
    const welcomeText = 'こんにちは！掲示板へようこそ。何かメッセージを残していってください✨';
    const now = new Date();
    const time = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const initialName = 'システム';
    appendMessage(initialName, welcomeText, time);
    saveMessage(initialName, welcomeText, time);
  }
}

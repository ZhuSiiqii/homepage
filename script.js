(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Preserve one complete, readable copy while animating the visual letters.
  document.querySelectorAll('[data-split]').forEach(element => {
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.append(...element.childNodes);
    const readable = document.createElement('span');
    readable.className = 'sr-only';
    const copy = visual.cloneNode(true);
    copy.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    readable.textContent = copy.textContent;
    const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(text => {
        if (!text.trim()) { fragment.append(text); return; }
        const word = document.createElement('span');
        word.className = 'split-word';
        Array.from(text).forEach(letter => {
          const char = document.createElement('span');
          char.className = 'split-char';
          char.style.setProperty('--char-delay', `${index++ * 22}ms`);
          char.textContent = letter;
          word.append(char);
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    element.append(readable, visual);
  });

  const curtain = document.querySelector('.entrance-curtain');
  let hasVisited = false;
  // Storage may be unavailable when this static page is opened as a local file.
  try { hasVisited = sessionStorage.getItem('siqi-intro-seen') === 'true'; } catch {}
  if (!reducedMotion.matches && !hasVisited && !location.hash && scrollY < 10) {
    curtain.hidden = false;
    document.body.classList.add('intro-pending');
    try { sessionStorage.setItem('siqi-intro-seen', 'true'); } catch {}
    const releaseTimer = setTimeout(() => document.body.classList.remove('intro-pending'), 450);
    const finishIntro = () => {
      clearTimeout(releaseTimer);
      clearTimeout(finishTimer);
      curtain.hidden = true;
      document.body.classList.remove('intro-pending');
      document.removeEventListener('keydown', skipOnKey);
      document.removeEventListener('focusin', skipOnFocus);
      removeEventListener('wheel', finishIntro);
      removeEventListener('touchstart', finishIntro);
      reducedMotion.removeEventListener('change', finishIntro);
      if (document.activeElement === skipButton) document.querySelector('.brand').focus({ preventScroll: true });
    };
    const skipButton = curtain.querySelector('.curtain-skip');
    const skipOnKey = event => { if (event.key === 'Escape') finishIntro(); };
    const skipOnFocus = event => { if (!curtain.contains(event.target)) finishIntro(); };
    const finishTimer = setTimeout(finishIntro, 1500);
    skipButton.addEventListener('click', finishIntro, { once: true });
    document.addEventListener('keydown', skipOnKey);
    document.addEventListener('focusin', skipOnFocus);
    addEventListener('wheel', finishIntro, { passive: true });
    addEventListener('touchstart', finishIntro, { passive: true });
    reducedMotion.addEventListener('change', finishIntro);
  }

  const marquee = document.querySelector('.marquee');
  const marqueeButton = document.querySelector('.marquee-toggle');
  let marqueePaused = false, marqueeVisible = false;
  function syncMarquee() {
    const stopped = marqueePaused || reducedMotion.matches;
    marquee.classList.toggle('is-running', !stopped && marqueeVisible && !document.hidden);
    marqueeButton.hidden = reducedMotion.matches;
    marqueeButton.setAttribute('aria-pressed', String(stopped));
    marqueeButton.setAttribute('aria-label', stopped ? 'Play scrolling text' : 'Pause scrolling text');
    marqueeButton.textContent = stopped ? 'Play ▷' : 'Pause Ⅱ';
  }
  marqueeButton.addEventListener('click', () => { marqueePaused = !marqueePaused; syncMarquee(); });
  reducedMotion.addEventListener('change', syncMarquee);
  document.addEventListener('visibilitychange', syncMarquee);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      marqueeVisible = entries[0].isIntersecting;
      syncMarquee();
    }).observe(marquee);
  } else { marqueeVisible = true; }
  syncMarquee();

  const menu = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    mobileNav.hidden = true;
  };
  menu.addEventListener('click', () => {
    const isOpen = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!isOpen));
    menu.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    mobileNav.hidden = isOpen;
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      closeMenu();
      menu.focus();
    }
  });
  matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
  document.querySelector('#year').textContent = new Date().getFullYear();

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    document.documentElement.classList.add('js-reveal');
  }

  const progress = document.querySelector('.reading-progress');
  const sections = [...document.querySelectorAll('#profile, #research, #education, #publications')];
  const navLinks = [...document.querySelectorAll('.navigation a, .mobile-nav a')];
  let scrollFrame = 0;
  function updateScroll() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0})`;
    let active = sections[0].id;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= innerHeight * .35) active = section.id;
    });
    navLinks.forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollFrame = 0;
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });
  addEventListener('resize', updateScroll);
  updateScroll();

  // A lightweight, perspective-projected mesh. No WebGL dependency is needed.
  const canvas = document.querySelector('#research-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const visual = document.querySelector('.research-visual');
  const motionButton = document.querySelector('.motion-toggle');
  const topics = [...document.querySelectorAll('.topic')];
  const pointer = { x: 0, y: 0 };
  let width = 0, height = 0, angle = .45, blend = 0, targetBlend = 0;
  let paused = reducedMotion.matches, visible = false, frame = 0, lastTime = 0;
  const rows = 28, columns = 52;

  function project(u, v) {
    const radius = 1 + .32 * Math.cos(v);
    const torus = [radius * Math.cos(u), .32 * Math.sin(v), radius * Math.sin(u)];
    const sphere = [1.16 * Math.sin(v / 2) * Math.cos(u), 1.16 * Math.cos(v / 2), 1.16 * Math.sin(v / 2) * Math.sin(u)];
    let [x, y, z] = torus.map((value, i) => value * (1 - blend) + sphere[i] * blend);
    const yaw = angle + pointer.x * .3;
    const pitch = .65 + pointer.y * .25;
    const rotatedX = x * Math.cos(yaw) - z * Math.sin(yaw);
    z = x * Math.sin(yaw) + z * Math.cos(yaw);
    x = rotatedX;
    const rotatedY = y * Math.cos(pitch) - z * Math.sin(pitch);
    z = y * Math.sin(pitch) + z * Math.cos(pitch);
    y = rotatedY;
    const scale = Math.min(width, height) * .285;
    const perspective = 4 / (4 + z);
    return { x: width / 2 + x * scale * perspective, y: height / 2 + y * scale * perspective, z };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const points = [];
    for (let row = 0; row <= rows; row++) {
      const ring = [];
      for (let column = 0; column <= columns; column++) {
        ring.push(project(column / columns * Math.PI * 2, row / rows * Math.PI * 2));
      }
      points.push(ring);
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const point = points[row][column];
        const alpha = Math.max(.07, .34 - point.z * .18);
        ctx.strokeStyle = `rgba(185,204,203,${alpha})`;
        ctx.lineWidth = .55;
        ctx.beginPath();
        ctx.moveTo(points[row + 1][column].x, points[row + 1][column].y);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(points[row][column + 1].x, points[row][column + 1].y);
        ctx.stroke();
        if (column % 4 === 0 && row % 3 === 0) {
          ctx.fillStyle = `rgba(219,190,148,${Math.min(.95, alpha * 2.5)})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.z < 0 ? 1.5 : .8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = 'rgba(178,196,197,.25)';
    ctx.lineWidth = .6;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 9, height / 2); ctx.lineTo(width / 2 + 9, height / 2);
    ctx.moveTo(width / 2, height / 2 - 9); ctx.lineTo(width / 2, height / 2 + 9);
    ctx.stroke();
  }

  function tick(time) {
    const delta = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;
    angle += delta * .00012;
    blend += (targetBlend - blend) * (1 - Math.exp(-delta / 230));
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (visible && !paused && !document.hidden) frame = requestAnimationFrame(tick);
    else draw();
  }
  function updateMotionButton() {
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Play 3D animation' : 'Pause 3D animation');
    motionButton.querySelector('.motion-label').textContent = paused ? 'Play' : 'Pause';
    motionButton.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
  }
  const resize = () => {
    width = visual.clientWidth;
    height = visual.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };
  new ResizeObserver(resize).observe(visual);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncAnimation();
    }, { threshold: .01 }).observe(visual);
  } else { visible = true; }
  visual.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const rect = visual.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / width - .5;
    pointer.y = (event.clientY - rect.top) / height - .5;
    if (paused) draw();
  });
  visual.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; if (paused) draw(); });
  topics.forEach(topic => topic.addEventListener('click', () => {
    topics.forEach(item => {
      const active = item === topic;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    targetBlend = topic.dataset.mode === 'embodiment' ? 1 : 0;
    document.querySelector('#visual-mode').textContent = targetBlend ? '02 / Embodiment' : '01 / Generation';
    if (paused || !visible) { blend = targetBlend; draw(); }
  }));
  motionButton.addEventListener('click', () => {
    paused = !paused;
    updateMotionButton();
    syncAnimation();
  });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    updateMotionButton();
    syncAnimation();
  });
  document.addEventListener('visibilitychange', syncAnimation);
  if (matchMedia('(pointer: coarse)').matches) document.querySelector('.interaction-hint').textContent = 'Select a research direction';
  resize();
  updateMotionButton();
  syncAnimation();
})();

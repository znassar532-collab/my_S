/**
 * Magic Memory Book for Bassant
 * Core Application Logic, Particles, Web Audio Synth, and GSAP Animations
 */

// Initialize Audio Controller immediately at top to guarantee it is defined
class MagicalAudioController {
  constructor() {
    this.ctx = null;
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientGain = null;
    this.chordInterval = null;
    this.isPlayingAmbient = false;
    this.chords = [
      [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9
      [110.00, 164.81, 196.00, 261.63, 329.63], // Amin9
      [87.31, 130.81, 164.81, 220.00, 261.63],  // Fmaj9
      [98.00, 146.83, 174.61, 220.00, 246.94]   // G9
    ];
    this.chordIndex = 0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master Ambient Gain Node
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    // Master Low Pass Filter for warmth
    const lpFilter = this.ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    
    this.ambientGain.connect(lpFilter);
    lpFilter.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbient() {
    if (this.isPlayingAmbient) return;
    this.init();
    this.resume();
    this.isPlayingAmbient = true;
    
    // Fade in ambient volume slowly
    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3.0);

    // Schedule Chords loop
    this.playNextChord();
    this.chordInterval = setInterval(() => {
      this.playNextChord();
    }, 7000);
  }

  stopAmbient() {
    if (!this.isPlayingAmbient) return;
    clearInterval(this.chordInterval);
    if (this.ambientGain) {
      this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);
    }
    this.isPlayingAmbient = false;
  }

  playNextChord() {
    if (!this.isPlayingAmbient || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = this.chords[this.chordIndex];
    this.chordIndex = (this.chordIndex + 1) % this.chords.length;

    notes.forEach((freq, i) => {
      // Main soft Triangle oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      // Delay note onset slightly for harp/strum effect
      const noteDelay = i * 0.15;
      const noteStart = now + noteDelay;
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.035, noteStart + 1.5); // long attack
      oscGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 6.0); // long release
      
      osc.connect(oscGain);
      oscGain.connect(this.ambientGain);
      
      osc.start(noteStart);
      osc.stop(noteStart + 6.5);
    });
  }

  playPageFlip() {
    if (!soundEnabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 1. Bass Boom synth pulse (sub-bass decay at 90Hz -> 30Hz)
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(90, now);
    boom.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    boomGain.gain.setValueAtTime(0.08, now);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    boom.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boom.start(now);
    boom.stop(now + 0.4);

    // 2. Rich magical arpeggiated sweep (C Major 9 chord)
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.025, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.55);
    });

    // 3. Subtle paper swish noise
    const noiseLength = 0.25;
    const bufferSize = this.ctx.sampleRate * noiseLength;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, now + noiseLength);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseLength);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + noiseLength);
  }

  playExplosion() {
    if (!soundEnabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 1. Deep rumble bass sweep
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(150, now);
    rumble.frequency.exponentialRampToValueAtTime(40, now + 0.8);
    
    rumbleGain.gain.setValueAtTime(0.18, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);
    
    rumble.start(now);
    rumble.stop(now + 0.8);

    // 2. Sparkle chords chime shower
    const chimeScale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98]; // C chords chimes
    chimeScale.forEach((freq, index) => {
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, now + index * 0.05);
      
      chimeGain.gain.setValueAtTime(0.025, now + index * 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.05 + 0.6);
      
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      
      chime.start(now + index * 0.05);
      chime.stop(now + index * 0.05 + 0.65);
    });
  }

  playStoryNext() {
    if (!soundEnabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    
    // Quick rising synth arpeggio
    const notes = [440, 554, 659, 880]; // A major
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.03, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }
}

// Global State
let currentScene = 1;
let currentPageIndex = 0;
let soundEnabled = false;
let canvas, ctx;
let particles = [];
let particleMode = 'stars'; // 'stars' or 'hearts'
const audioController = new MagicalAudioController();

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  setupCanvas();
  setupEventListeners();
  initSoundModal();
});

// Window resize handler
window.addEventListener('resize', () => {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

/* ==========================================================================
   1. BACKGROUND PARTICLE SYSTEM (CANVAS)
   ========================================================================== */
function setupCanvas() {
  canvas = document.getElementById('bg-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  createParticles(80);
  animateParticles();
}

class Particle {
  constructor(mode) {
    this.reset(mode);
    this.y = Math.random() * canvas.height;
  }

  reset(mode) {
    this.x = Math.random() * canvas.width;
    this.y = mode === 'hearts' ? canvas.height + 50 : Math.random() * canvas.height;
    this.size = Math.random() * (mode === 'hearts' ? 12 : 3) + (mode === 'hearts' ? 6 : 1);
    this.speedY = -(Math.random() * 0.6 + 0.2);
    this.speedX = (Math.random() * 0.4 - 0.2);
    this.opacity = Math.random() * 0.6 + 0.3;
    this.angle = Math.random() * Math.PI * 2;
    this.spinSpeed = Math.random() * 0.02 - 0.01;
    this.pulseSpeed = Math.random() * 0.03 + 0.01;
    this.pulseDirection = 1;
    this.color = this.getRandomColor(mode);
    this.mode = mode;
  }

  getRandomColor(mode) {
    if (mode === 'hearts') {
      const hues = [350, 355, 0, 15, 45];
      const selectedHue = hues[Math.floor(Math.random() * hues.length)];
      return `hsla(${selectedHue}, 85%, 65%, ${this.opacity})`;
    } else {
      const goldHues = [45, 50, 55, 60];
      const selectedHue = goldHues[Math.floor(Math.random() * goldHues.length)];
      return `hsla(${selectedHue}, 90%, 65%, ${this.opacity})`;
    }
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.angle) * 0.2;
    this.angle += this.spinSpeed;

    // Pulse opacity for stars
    if (this.mode === 'stars') {
      this.opacity += this.pulseSpeed * this.pulseDirection;
      if (this.opacity >= 0.95) this.pulseDirection = -1;
      if (this.opacity <= 0.2) this.pulseDirection = 1;
      this.color = `hsla(45, 90%, 65%, ${this.opacity})`;
    }

    if (this.y < -50 || this.x < -50 || this.x > canvas.width + 50) {
      this.reset(this.mode);
      this.y = canvas.height + 20;
    }
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = this.mode === 'hearts' ? 12 : 5;
    ctx.shadowColor = this.mode === 'hearts' ? 'rgba(255, 42, 95, 0.4)' : 'rgba(212, 175, 55, 0.5)';
    ctx.fillStyle = this.color;

    if (this.mode === 'hearts') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle * 0.1);
      ctx.beginPath();
      const d = this.size;
      ctx.moveTo(0, d / 4);
      ctx.quadraticCurveTo(0, 0, d / 2, 0);
      ctx.quadraticCurveTo(d, 0, d, d / 3);
      ctx.quadraticCurveTo(d, (d * 2) / 3, d / 2, d);
      ctx.quadraticCurveTo(-d, (d * 2) / 3, -d, d / 3);
      ctx.quadraticCurveTo(-d, 0, -d / 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, d / 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function createParticles(count) {
  particles = [];
  const adjustedCount = window.innerWidth < 600 ? Math.floor(count / 2) : count;
  for (let i = 0; i < adjustedCount; i++) {
    particles.push(new Particle(particleMode));
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  requestAnimationFrame(animateParticles);
}

function switchParticleMode(mode) {
  particleMode = mode;
  gsap.to(particles, {
    opacity: 0,
    duration: 0.8,
    onComplete: () => {
      createParticles(mode === 'hearts' ? 60 : 80);
    }
  });
}

/* ==========================================================================
   2. SOUND PERMISSION MODAL & AUDIO TOGGLE CONTROLS
   ========================================================================== */
function initSoundModal() {
  const overlay = document.getElementById('sound-prompt');
  const btnYes = document.getElementById('sound-yes');
  const btnNo = document.getElementById('sound-no');

  btnYes.addEventListener('click', () => {
    soundEnabled = true;
    updateAudioToggleButtonState(true);
    audioController.startAmbient();
    
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => overlay.style.display = 'none'
    });
  });

  btnNo.addEventListener('click', () => {
    soundEnabled = false;
    updateAudioToggleButtonState(false);
    
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => overlay.style.display = 'none'
    });
  });

  const toggleBtn = document.getElementById('sound-toggle');
  toggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      audioController.startAmbient();
      updateAudioToggleButtonState(true);
    } else {
      audioController.stopAmbient();
      updateAudioToggleButtonState(false);
    }
  });
}

function updateAudioToggleButtonState(enabled) {
  const icon = document.querySelector('.audio-toggle-icon');
  const text = document.querySelector('.audio-toggle-text');
  
  if (enabled) {
    icon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
    text.innerText = 'SOUND ON';
  } else {
    icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
    text.innerText = 'SOUND OFF';
  }
}

/* ==========================================================================
   3. EVENT LISTENERS & 3D INTERACTION
   ========================================================================== */
function setupEventListeners() {
  const coverContainer = document.querySelector('.book-container');
  const cover = document.querySelector('.book-cover');



  document.getElementById('open-book-btn').addEventListener('click', openBook);

  document.querySelectorAll('.next-page').forEach(btn => {
    btn.addEventListener('click', () => turnPage(1));
  });

  document.querySelectorAll('.prev-page').forEach(btn => {
    btn.addEventListener('click', () => turnPage(-1));
  });

  document.getElementById('release-pressure-btn').addEventListener('click', showCapsuleScene);
  document.getElementById('capsule-press-btn').addEventListener('click', explodeCapsule);

  document.getElementById('story1-next').addEventListener('click', () => showNextStory(1));
  document.getElementById('story2-next').addEventListener('click', showFinaleScene);

  document.getElementById('replay-btn').addEventListener('click', resetApplication);
}

/* ==========================================================================
   4. SCENE TRANSITION & FLIPPING FUNCTIONS
   ========================================================================== */

/**
 * Unified 3D Book Opening (Scene 1 -> Scene 2)
 * Flips the cover (Page 0) and triggers the warm yellow/golden light burst, rays, & sparkles
 */
function openBook() {
  if (audioController) {
    audioController.init();
    audioController.resume();
    audioController.playPageFlip();
    audioController.startAmbient();
  }

  const coverPage = document.getElementById('page-cover');
  
  // 1. Flip Cover in 3D
  coverPage.classList.add('flipped');

  // 2. Trigger magical expanding warm golden radial light burst
  const burst = document.getElementById('light-burst');
  gsap.killTweensOf(burst);
  gsap.fromTo(burst, 
    { scale: 0, opacity: 0 },
    { 
      scale: 3.5, 
      opacity: 1, 
      duration: 1.0, 
      ease: 'power3.out',
      onComplete: () => {
        gsap.to(burst, { opacity: 0, duration: 1.2, ease: 'power2.in' });
      }
    }
  );

  // 3. Trigger SVG Rotating Golden Rays burst
  const raysSvg = document.getElementById('golden-rays-svg');
  const raysGroup = document.getElementById('rays-group');
  gsap.killTweensOf([raysSvg, raysGroup]);
  
  gsap.fromTo(raysSvg,
    { scale: 0.2, opacity: 0 },
    { 
      scale: 2.2, 
      opacity: 1, 
      duration: 1.0, 
      ease: 'power3.out', 
      onComplete: () => {
        gsap.to(raysSvg, { opacity: 0, duration: 1.4, ease: 'power2.in' });
      }
    }
  );

  gsap.fromTo(raysGroup,
    { rotation: 0, transformOrigin: '50px 50px' },
    { rotation: 120, duration: 2.4, ease: 'power2.out' }
  );

  // 4. Throw a magical burst of gold & yellow confetti stars (sparkles)
  confetti({
    particleCount: 100,
    spread: 120,
    origin: { y: 0.55 },
    colors: ['#ffe875', '#d4af37', '#ffffff'] // Golden yellow tones
  });

  // 5. Update state to page 1 and trigger letter reveal
  currentPageIndex = 1;
  revealPageText(1);
}

/**
 * Handle Book Page Flipping
 */
function turnPage(direction) {
  const pages = document.querySelectorAll('.book-page');
  
  if (direction === 1) {
    if (currentPageIndex >= pages.length - 1) return;
    
    if (audioController) audioController.playPageFlip();
    const pageToFlip = pages[currentPageIndex];
    pageToFlip.classList.add('flipped');
    
    // Neon explosion burst (shoot towards left)
    confetti({
      particleCount: 25,
      angle: 45,
      spread: 60,
      origin: { x: 0.35, y: 0.6 },
      colors: ['#00f0ff', '#ff0055', '#ffe875'] // Cyan, Hot Pink, Gold
    });
    
    currentPageIndex++;
    revealPageText(currentPageIndex);
  } else {
    if (currentPageIndex <= 1) return;
    
    if (audioController) audioController.playPageFlip();
    currentPageIndex--;
    const pageToFlip = pages[currentPageIndex];
    pageToFlip.classList.remove('flipped');
    
    // Neon explosion burst (shoot towards right)
    confetti({
      particleCount: 25,
      angle: 135,
      spread: 60,
      origin: { x: 0.65, y: 0.6 },
      colors: ['#00f0ff', '#ff0055', '#ffe875'] // Cyan, Hot Pink, Gold
    });
    
    revealPageText(currentPageIndex);
  }
}

/**
 * Typewriter text reveal effect inside pages
 */
function revealPageText(pageIdx) {
  const pages = document.querySelectorAll('.book-page');
  const activePage = pages[pageIdx];
  if (!activePage) return;

  const activeFace = activePage.querySelector('.page-face:not(.back)');
  if (!activeFace) return;

  const pageBody = activeFace.querySelector('.page-body');
  if (!pageBody || pageBody.classList.contains('animated')) return;

  pageBody.classList.add('animated');
  const textContent = pageBody.innerText;
  pageBody.innerHTML = '';

  const words = textContent.split(' ');
  words.forEach(word => {
    const span = document.createElement('span');
    span.innerText = word + ' ';
    span.style.opacity = '0';
    span.style.display = 'inline-block';
    span.style.transform = 'translateY(10px)';
    pageBody.appendChild(span);
  });

  gsap.to(pageBody.querySelectorAll('span'), {
    opacity: 1,
    y: 0,
    duration: 0.4,
    stagger: 0.04,
    ease: 'power1.out'
  });
}

/**
 * Transition: Scene 2 (Book) -> Scene 3 (Capsule Stage)
 */
function showCapsuleScene() {
  if (audioController) audioController.playPageFlip();

  const bookScene = document.getElementById('scene-book');
  const bookContainer = document.querySelector('.book-container');
  const capsuleScene = document.getElementById('scene-capsule');
  const capsuleBox = document.querySelector('.capsule-box');

  const tl = gsap.timeline({
    onComplete: () => {
      bookScene.classList.remove('active');
      capsuleScene.classList.add('active');
      capsuleBox.classList.add('show');
      
      gsap.fromTo(capsuleBox, 
        { scale: 0.5, y: 150, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 1.0, ease: 'back.out(1.2)' }
      );
    }
  });

  tl.to(bookContainer, {
    scale: 0.1,
    rotateY: -360,
    rotateZ: 45,
    opacity: 0,
    duration: 1.2,
    ease: 'power3.in'
  });
}

/**
 * Scene 3: Explode Capsule & Launch Jokes
 */
function explodeCapsule() {
  if (audioController) audioController.playExplosion();

  triggerConfettiExplosion();
  triggerEmojiShower();

  const capsuleBox = document.querySelector('.capsule-box');
  const story1 = document.getElementById('story-1');

  gsap.to(capsuleBox, {
    scale: 0.3,
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      capsuleBox.style.display = 'none';
      story1.classList.add('active');
      
      gsap.fromTo(story1,
        { scale: 0.7, y: 100, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.4)' }
      );
    }
  });
}

function triggerConfettiExplosion() {
  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);

  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#ff0055', '#00f0ff', '#d4af37', '#ffffff']
  });
}

function triggerEmojiShower() {
  const emojis = ['😂', '🤣', '💀', '😆', '😜'];
  const showerCount = window.innerWidth < 600 ? 15 : 25;

  for (let i = 0; i < showerCount; i++) {
    setTimeout(() => {
      const emoji = document.createElement('div');
      emoji.className = 'floating-emoji';
      emoji.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.style.left = Math.random() * 100 + 'vw';
      emoji.style.top = '105vh';
      document.body.appendChild(emoji);

      const duration = Math.random() * 2.5 + 2.0;
      const spin = Math.random() * 720 - 360;
      const xDistance = Math.random() * 150 - 75;

      gsap.to(emoji, {
        y: -window.innerHeight - 150,
        x: xDistance,
        rotation: spin,
        duration: duration,
        ease: 'power1.out',
        onComplete: () => {
          emoji.remove();
        }
      });
    }, i * 150);
  }
}

function showNextStory(nextStoryIndex) {
  if (audioController) audioController.playStoryNext();

  const currentStory = document.getElementById(`story-${nextStoryIndex}`);
  const nextStory = document.getElementById(`story-${nextStoryIndex + 1}`);

  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7 }
  });

  gsap.to(currentStory, {
    x: -150,
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      currentStory.classList.remove('active');
      nextStory.classList.add('active');
      
      gsap.fromTo(nextStory,
        { x: 150, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  });
}

function showFinaleScene() {
  if (audioController) audioController.playExplosion();

  const currentStory = document.getElementById('story-2');
  const capsuleScene = document.getElementById('scene-capsule');
  const finaleScene = document.getElementById('scene-finale');
  const finaleText = document.querySelector('.finale-text');
  const finaleBtn = document.querySelector('.finale-btn');

  confetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.5 }
  });

  switchParticleMode('hearts');

  gsap.to(currentStory, {
    scale: 0.5,
    opacity: 0,
    duration: 0.6,
    onComplete: () => {
      capsuleScene.classList.remove('active');
      finaleScene.classList.add('active');

      gsap.to(finaleText, {
        opacity: 1,
        y: 0,
        duration: 1.8,
        ease: 'power3.out'
      });

      gsap.to(finaleBtn, {
        opacity: 1,
        delay: 2.0,
        duration: 1.0,
        ease: 'power2.out'
      });
    }
  });
}

function resetApplication() {
  switchParticleMode('stars');
  
  const pages = document.querySelectorAll('.book-page');
  const capsuleBox = document.querySelector('.capsule-box');
  const capsuleScene = document.getElementById('scene-capsule');
  const finaleScene = document.getElementById('scene-finale');
  const bookContainer = document.querySelector('.book-container');

  pages.forEach(p => {
    p.classList.remove('flipped');
    const animatedBody = p.querySelector('.page-body');
    if (animatedBody) {
      animatedBody.classList.remove('animated');
      const spans = animatedBody.querySelectorAll('span');
      if (spans.length > 0) {
        let reconstructedText = "";
        spans.forEach(s => reconstructedText += s.innerText);
        animatedBody.innerHTML = reconstructedText;
      }
    }
  });

  currentPageIndex = 0;

  capsuleBox.style.display = 'block';
  capsuleBox.classList.remove('show');
  
  document.querySelectorAll('.story-box').forEach(sb => {
    sb.classList.remove('active');
    sb.style.transform = 'translateY(20px)';
    sb.style.opacity = '0';
  });

  gsap.set(bookContainer, {
    scale: 1,
    rotateY: 0,
    rotateZ: 0,
    opacity: 1
  });

  const cover = document.querySelector('.book-cover');
  gsap.set(cover, { rotateX: 0, rotateY: 0 });

  gsap.to(finaleScene, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      finaleScene.classList.remove('active');
      finaleScene.style.opacity = '1';
      
      gsap.set(document.querySelector('.finale-text'), { opacity: 0, y: 30 });
      gsap.set(document.querySelector('.finale-btn'), { opacity: 0 });

      document.getElementById('scene-book').classList.add('active');
    }
  });
}

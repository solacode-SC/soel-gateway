// ===== Canvas & Context =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

// ===== Game State =====
let snake = [];
const snakeLength = 25;
const snakeSize = 6;
let snakeHead = { x: 0, y: 0, angle: 0 };
const snakeSpeed = 15;
const turnSpeed = 0.2;
const frameMs = 1000 / 60;
const maxDeltaScale = 2.5;

function detectPerformanceProfile() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const saveData = navigator.connection && navigator.connection.saveData;
    const smallScreen = window.innerWidth < 768;

    if (saveData || cores <= 4 || memory <= 2) return 'low';
    if (smallScreen || cores <= 8 || memory <= 4) return 'medium';
    return 'high';
}

const qualityProfile = detectPerformanceProfile();
const qualityByProfile = {
    low: {
        starsMobile: 40,
        starsDesktop: 90,
        cometCount: 4,
        cometTrailLength: 4,
        snakeGlow: false,
        fireworkSpawnRate: 0.025,
        fireworkExplosionParticles: 28,
        explosionParticles: 8,
        ceremonyCenterParticles: 160,
        ceremonySideParticles: 50,
        maxParticles: 280
    },
    medium: {
        starsMobile: 55,
        starsDesktop: 150,
        cometCount: 6,
        cometTrailLength: 5,
        snakeGlow: true,
        fireworkSpawnRate: 0.04,
        fireworkExplosionParticles: 40,
        explosionParticles: 10,
        ceremonyCenterParticles: 240,
        ceremonySideParticles: 75,
        maxParticles: 500
    },
    high: {
        starsMobile: 60,
        starsDesktop: 200,
        cometCount: 7,
        cometTrailLength: 6,
        snakeGlow: true,
        fireworkSpawnRate: 0.05,
        fireworkExplosionParticles: 50,
        explosionParticles: 12,
        ceremonyCenterParticles: 300,
        ceremonySideParticles: 100,
        maxParticles: 800
    }
};
const quality = qualityByProfile[qualityProfile];

let lastFrameTime = 0;
let frameTick = 0;

let comets = [];
let stars = [];
let score = 0;
const maxScore = 7;
let gameActive = true;

// Fireworks & Particles
let fireworks = [];
let particles = [];

// ===== Resize =====
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
}
// ===== Stars (Parallax) =====
function initStars() {
    stars = [];
    const starCount = width < 768 ? quality.starsMobile : quality.starsDesktop;
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            alpha: Math.random(),
            speed: Math.random() * 0.6 + 0.15,
            layer: Math.floor(Math.random() * 3)
        });
    }
}

// ===== Snake Init =====
function initSnake() {
    snakeHead.x = width / 2;
    snakeHead.y = height / 2;
    snakeHead.angle = Math.random() * Math.PI * 2;

    snake = [];
    for (let i = 0; i < snakeLength; i++) {
        snake.push({ x: snakeHead.x, y: snakeHead.y });
    }
}

// ===== Comet Class =====
class Comet {
    constructor() {
        this.reset();
    }

    reset(attempt = 0) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;

        const dx = this.x - snakeHead.x;
        const dy = this.y - snakeHead.y;
        if (Math.sqrt(dx * dx + dy * dy) < 200 && attempt < 20) {
            this.reset(attempt + 1);
            return;
        }

        this.vx = (Math.random() - 0.5) * 7.5;
        this.vy = (Math.random() - 0.5) * 7.5;
        this.size = Math.random() * 4 + 3;
        this.color = `hsl(${Math.random() * 40 + 30}, 100%, 60%)`;
        this.trail = [];
    }

    update(deltaScale = 1) {
        this.x += this.vx * deltaScale;
        this.y += this.vy * deltaScale;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > quality.cometTrailLength) this.trail.shift();
    }

    draw() {
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// ===== Firework Class =====
class Firework {
    constructor() {
        this.x = Math.random() * width;
        this.y = height;
        this.targetY = Math.random() * (height * 0.5);
        this.speed = Math.random() * 3 + 5;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.hue = Math.random() * 360;
        this.exploded = false;
    }

    update(deltaScale = 1) {
        this.x += this.vx * deltaScale;
        this.y += this.vy * deltaScale;
        this.vy += 0.1 * deltaScale;

        if (this.vy >= 0 || this.y <= this.targetY) {
            this.explode();
            return false;
        }
        return true;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
        ctx.fill();
    }

    explode() {
        for (let i = 0; i < quality.fireworkExplosionParticles; i++) {
            particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.5,
                color: `hsl(${this.hue}, 100%, 60%)`,
                gravity: 0.1
            });
        }
    }
}

// ===== Initialize =====
resize();
initSnake();
for (let i = 0; i < quality.cometCount; i++) comets.push(new Comet());

function getDeltaScale(timestamp) {
    if (!lastFrameTime) {
        lastFrameTime = timestamp;
        return 1;
    }

    const deltaMs = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 1;
    return Math.min(deltaMs / frameMs, maxDeltaScale);
}

function updateSnakeAIDelta(deltaScale) {
    let nearestDist = Infinity;
    let target = null;

    for (let i = 0; i < comets.length; i++) {
        const comet = comets[i];
        const dx = comet.x - snakeHead.x;
        const dy = comet.y - snakeHead.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDist) {
            nearestDist = distSq;
            target = comet;
        }
    }

    if (target) {
        const dx = target.x - snakeHead.x;
        const dy = target.y - snakeHead.y;
        const targetAngle = Math.atan2(dy, dx);

        let diff = targetAngle - snakeHead.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const adjustedTurnSpeed = turnSpeed * deltaScale;
        if (Math.abs(diff) < adjustedTurnSpeed) {
            snakeHead.angle = targetAngle;
        } else {
            snakeHead.angle += Math.sign(diff) * adjustedTurnSpeed;
        }
    }

    snakeHead.x += Math.cos(snakeHead.angle) * snakeSpeed * deltaScale;
    snakeHead.y += Math.sin(snakeHead.angle) * snakeSpeed * deltaScale;

    if (snakeHead.x < 0) snakeHead.x = width;
    if (snakeHead.x > width) snakeHead.x = 0;
    if (snakeHead.y < 0) snakeHead.y = height;
    if (snakeHead.y > height) snakeHead.y = 0;

    snake.unshift({ x: snakeHead.x, y: snakeHead.y });
    if (snake.length > snakeLength) snake.pop();
}

// ===== Game Loop =====
function animate(timestamp) {
    const deltaScale = getDeltaScale(timestamp);
    frameTick++;

    ctx.clearRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.y += star.speed * deltaScale;
        if (star.y > height) star.y = 0;
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Snake
    updateSnakeAIDelta(deltaScale);

    // Skip expensive glow stroke on low-end profile.
    if (quality.snakeGlow && (qualityProfile !== 'medium' || frameTick % 2 === 0)) {
        ctx.beginPath();
        ctx.moveTo(snake[0].x, snake[0].y);
        for (let i = 1; i < snake.length - 1; i++) {
            let xc = (snake[i].x + snake[i + 1].x) / 2;
            let yc = (snake[i].y + snake[i + 1].y) / 2;
            ctx.quadraticCurveTo(snake[i].x, snake[i].y, xc, yc);
        }
        ctx.lineCap = 'round';
        ctx.lineWidth = snakeSize + 4;
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
        ctx.stroke();
    }

    // Draw Snake Core
    ctx.beginPath();
    ctx.moveTo(snake[0].x, snake[0].y);
    for (let i = 1; i < snake.length - 1; i++) {
        let xc = (snake[i].x + snake[i + 1].x) / 2;
        let yc = (snake[i].y + snake[i + 1].y) / 2;
        ctx.quadraticCurveTo(snake[i].x, snake[i].y, xc, yc);
    }
    ctx.lineWidth = snakeSize;
    ctx.strokeStyle = '#00ffcc';
    ctx.stroke();

    // Comets
    for (let i = 0; i < comets.length; i++) {
        const comet = comets[i];
        comet.update(deltaScale);
        comet.draw();

        const dx = snakeHead.x - comet.x;
        const dy = snakeHead.y - comet.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 3600) {
            comet.reset();
            score++;
            updateProgress();
            createExplosion(snakeHead.x, snakeHead.y);
        }
    }

    // Fireworks (if Know Me modal active)
    if (activeModal === knowMeModal && Math.random() < Math.min(0.25, quality.fireworkSpawnRate * deltaScale)) {
        fireworks.push(new Firework());
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
        if (!fireworks[i].update(deltaScale)) {
            fireworks.splice(i, 1);
        } else {
            fireworks[i].draw();
        }
    }

    // Particles
    updateParticles(deltaScale);

    requestAnimationFrame(animate);
}

// ===== Particles =====
function createExplosion(x, y) {
    for (let i = 0; i < quality.explosionParticles; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 50%)`
        });
    }
}

function triggerCeremony() {
    for (let i = 0; i < quality.ceremonyCenterParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 20 + 5;
        particles.push({
            x: width / 2,
            y: height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 3,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            gravity: 0.2,
            drag: 0.96
        });
    }

    setTimeout(() => {
        for (let i = 0; i < quality.ceremonySideParticles; i++) {
            particles.push({
                x: 0, y: height,
                vx: Math.random() * 15 + 5, vy: -(Math.random() * 15 + 10),
                life: 3, color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                gravity: 0.2, drag: 0.96
            });
            particles.push({
                x: width, y: height,
                vx: -(Math.random() * 15 + 5), vy: -(Math.random() * 15 + 10),
                life: 3, color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                gravity: 0.2, drag: 0.96
            });
        }
    }, 500);
}

function updateParticles(deltaScale = 1) {
    if (particles.length > quality.maxParticles) {
        particles.splice(0, particles.length - quality.maxParticles);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * deltaScale;
        p.y += p.vy * deltaScale;

        if (p.gravity) p.vy += p.gravity * deltaScale;
        if (p.drag) {
            const adjustedDrag = Math.pow(p.drag, deltaScale);
            p.vx *= adjustedDrag;
            p.vy *= adjustedDrag;
        }

        p.life -= 0.02 * deltaScale;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}

// ===== UI Updates =====
function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const scoreText = document.getElementById('score-text');
    const ctaBtn = document.getElementById('cta-btn');

    let percentage = (score / maxScore) * 100;
    if (percentage > 100) percentage = 100;

    progressFill.style.width = `${percentage}%`;
    scoreText.innerText = `${Math.min(score, maxScore)}/${maxScore} Comets`;

    if (score >= maxScore && !ctaBtn.classList.contains('active')) {
        ctaBtn.classList.add('active');
        ctaBtn.innerText = "Enter Portfolio 🚀";
        triggerCeremony();
    }
}

// ===== Portfolio Not Ready Toast =====
const ctaButton = document.getElementById('cta-btn');
const portfolioToast = document.getElementById('portfolio-toast');
const toastMailLink = document.getElementById('toast-mail-link');

if (ctaButton) ctaButton.addEventListener('click', (e) => {
    e.preventDefault();
    portfolioToast.classList.add('show');
    setTimeout(() => portfolioToast.classList.remove('show'), 5000);
});

if (toastMailLink) toastMailLink.addEventListener('click', (e) => {
    e.preventDefault();
    portfolioToast.classList.remove('show');
    openModal(mailMeModal);
});

// ===== Masonry Layout =====
function layoutMasonry() {
    const container = document.getElementById('card-grid');
    const cards = Array.from(document.querySelectorAll('.glass-card')).filter(c => !c.classList.contains('hidden'));

    if (cards.length === 0) {
        container.style.height = '0px';
        return;
    }

    const colCount = window.innerWidth > 1024 ? 3 : (window.innerWidth > 768 ? 2 : 1);
    const gap = window.innerWidth <= 480 ? 20 : (window.innerWidth <= 768 ? 24 : 32);
    const containerWidth = container.offsetWidth;
    const colWidth = (containerWidth - (gap * (colCount - 1))) / colCount;
    let colHeights = new Array(colCount).fill(0);

    cards.forEach(card => {
        card.style.width = `${colWidth}px`;
        let minHeight = Math.min(...colHeights);
        let colIndex = colHeights.indexOf(minHeight);
        card.style.left = `${colIndex * (colWidth + gap)}px`;
        card.style.top = `${minHeight}px`;
        colHeights[colIndex] += card.offsetHeight + gap;
    });

    // Remove trailing gap from the tallest column
    const tallest = Math.max(...colHeights);
    container.style.height = `${Math.max(0, tallest - gap)}px`;
}

// ===== Filter Logic =====
const filterBtns = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.glass-card');

function filterCards(category) {
    // Instantly hide all
    cards.forEach(card => {
        card.classList.remove('visible');
        card.classList.add('hidden');
    });

    let visibleCards = category === 'all'
        ? Array.from(cards)
        : Array.from(cards).filter(card => card.getAttribute('data-category') === category);

    // Unhide matching cards
    visibleCards.forEach(card => card.classList.remove('hidden'));

    // Recalculate layout immediately
    layoutMasonry();

    // Reveal cards rapidly — near-instant with tiny stagger
    requestAnimationFrame(() => {
        visibleCards.forEach((card, index) => {
            card.style.animationDelay = `-${Math.random() * 5}s`;
            // 8ms stagger for a quick cascade effect
            setTimeout(() => card.classList.add('visible'), index * 8);
        });
    });
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterCards(btn.getAttribute('data-filter'));
    });
});

// ===== Events =====
window.addEventListener('load', () => {
    filterCards('all');
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resize();
        layoutMasonry();
    }, 100);
});

// ===== Modal Logic =====
const knowMeBtn = document.getElementById('know-me-btn');
const mailMeBtn = document.getElementById('mail-me-btn');
const knowMeModal = document.getElementById('know-me-modal');
const mailMeModal = document.getElementById('mail-me-modal');
const closeKnowMeBtn = document.getElementById('close-modal');
const closeMailMeBtn = document.getElementById('close-mail-modal');
const mailForm = document.getElementById('mail-form');
let activeModal = null;

function openModal(modal) {
    modal.classList.add('active');
    activeModal = modal;
}

function closeModal(modal) {
    modal.classList.remove('active');
    activeModal = null;
}

if (knowMeBtn) knowMeBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(knowMeModal); });
if (mailMeBtn) mailMeBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(mailMeModal); });
if (closeKnowMeBtn) closeKnowMeBtn.addEventListener('click', () => closeModal(knowMeModal));
if (closeMailMeBtn) closeMailMeBtn.addEventListener('click', () => closeModal(mailMeModal));

[knowMeModal, mailMeModal].forEach(modal => {
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModal) closeModal(activeModal);
});

if (mailForm) mailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = mailForm.querySelector('.send-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending... ✉️';
    submitBtn.disabled = true;

    const formData = new FormData(mailForm);

    fetch(mailForm.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                submitBtn.textContent = 'Sent! 🚀';
                triggerCeremony();
                mailForm.reset();

                // Show thank-you toast
                const toast = document.getElementById('thank-toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 4000);

                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 3000);
            } else {
                submitBtn.textContent = 'Error ❌';
                submitBtn.disabled = false;
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            submitBtn.textContent = 'Error ❌';
            submitBtn.disabled = false;
            setTimeout(() => {
                submitBtn.textContent = originalText;
            }, 3000);
        });
});

// ===== Chaos Ball =====
class ChaosBall {
    constructor(element, container) {
        this.ball = element;
        this.container = container;
        this.progress = 0;
        this.speed = 0.005;
        this.targetOffset = { x: 0, y: 0 };
        this.currentOffset = { x: 0, y: 0 };
        this.isJumping = false;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        setInterval(() => this.decideBehavior(), 800);
    }

    decideBehavior() {
        const rand = Math.random();
        if (rand < 0.35) {
            if (this.isJumping) {
                this.targetOffset = { x: 0, y: 0 };
                this.isJumping = false;
                this.ball.style.backgroundColor = 'var(--accent-color)';
            } else {
                const jumpDist = 60 + Math.random() * 120;
                this.targetOffset = {
                    x: (Math.random() - 0.5) * jumpDist,
                    y: (Math.random() - 0.5) * jumpDist
                };
                this.isJumping = true;
                this.ball.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
            }
        }
        if (Math.random() < 0.5) {
            const shapes = ['50%', '0%', '50% 50% 50% 0%', '30% 70% 70% 30% / 30% 30% 70% 70%'];
            this.ball.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
            const scale = 0.8 + Math.random() * 0.8;
            const rotate = Math.random() * 360;
            this.ball.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
        }
        this.speed = (this.isJumping ? 0.002 : 0.005) + Math.random() * 0.01;
    }

    getBorderPosition(p) {
        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;
        const total = 2 * (w + h);
        const dist = p * total;
        if (dist < w) return { x: dist, y: 0 };
        if (dist < w + h) return { x: w, y: dist - w };
        if (dist < 2 * w + h) return { x: w - (dist - (w + h)), y: h };
        return { x: 0, y: h - (dist - (2 * w + h)) };
    }

    animate() {
        this.currentOffset.x += (this.targetOffset.x - this.currentOffset.x) * 0.1;
        this.currentOffset.y += (this.targetOffset.y - this.currentOffset.y) * 0.1;
        this.progress += this.speed;
        if (this.progress >= 1) this.progress = 0;
        const pos = this.getBorderPosition(this.progress);
        const finalX = pos.x + this.currentOffset.x - 7.5;
        const finalY = pos.y + this.currentOffset.y - 7.5;
        this.ball.style.left = `${finalX}px`;
        this.ball.style.top = `${finalY}px`;
        requestAnimationFrame(this.animate);
    }
}

const ballEl = document.querySelector('#know-me-modal .modal-traveler');
const containerEl = document.querySelector('#know-me-modal .modal-content');
if (ballEl && containerEl) new ChaosBall(ballEl, containerEl);

// ===== Start =====
animate();

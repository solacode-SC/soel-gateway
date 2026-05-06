// === PROFILE: Random IDs (no conflicts, IDs already prefixed) ===
        // Profile stat IDs are already unique: profile-s1, profile-s2, etc.

        // === PROJECTS: Random IDs ===
        document.querySelectorAll('[id^="projects-id-"]').forEach(el => {
            el.textContent = Math.floor(100 + Math.random() * 900) + '-' + Math.floor(1000 + Math.random() * 9000);
        });

        // === PROJECTS: FILTER ===
        const projectsFilterBtns = document.querySelectorAll('.projects-filter-btn');
        const projectsCards = document.querySelectorAll('.projects-card');
        const projectsCountLabel = document.getElementById('projects-count-label');

        projectsFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                projectsFilterBtns.forEach(b => b.classList.remove('projects-active'));
                btn.classList.add('projects-active');

                const filter = btn.dataset.filter;
                let visible = 0;

                projectsCards.forEach(card => {
                    const match = filter === 'all' || card.dataset.category === filter;
                    card.classList.toggle('projects-hidden', !match);
                    if (match) visible++;
                });

                const num = String(visible).padStart(2, '0');
                projectsCountLabel.textContent = `DISPLAYING ${num} PROJECT${visible !== 1 ? 'S' : ''}`;
            });
        });

        // === PROJECTS: HOVER: pause flicker ===
        projectsCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.animationPlayState = 'paused';
            });
            card.addEventListener('mouseleave', () => {
                card.style.animationPlayState = 'running';
            });
        });

        // === PROJECTS: CLICK RIPPLE ===
        const projectsRippleStyle = document.createElement('style');
        projectsRippleStyle.textContent = `@keyframes projects-ripple { to { transform: scale(4); opacity: 0; } }`;
        document.head.appendChild(projectsRippleStyle);

        projectsCards.forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                const ripple = document.createElement('div');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                Object.assign(ripple.style, {
                    position: 'absolute',
                    width: size + 'px',
                    height: size + 'px',
                    left: (e.clientX - rect.left - size / 2) + 'px',
                    top: (e.clientY - rect.top - size / 2) + 'px',
                    background: 'rgba(0,0,0,0.08)',
                    borderRadius: '50%',
                    transform: 'scale(0)',
                    animation: 'projects-ripple 0.6s linear',
                    pointerEvents: 'none'
                });
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });

         // === INFINITE DRAG MARQUEE ===
        (function() {
            const wrapper = document.querySelector('.links-marquee-wrapper');
            const track = document.querySelector('.links-marquee-track');
            const cards = Array.from(track.querySelectorAll('.links-card'));

            // Dynamically measure card dimensions for responsive support
            const totalCards = cards.length; // 8 (4 original + 4 duplicates)
            const originalCount = totalCards / 2;

            function getCardMetrics() {
                const firstCard = cards[0];
                const secondCard = cards[1];
                const cardW = firstCard.getBoundingClientRect().width;
                // Measure the actual gap between cards
                const gap = secondCard.getBoundingClientRect().left - firstCard.getBoundingClientRect().right;
                return { cardW, gap };
            }

            let { cardW, gap } = getCardMetrics();
            let singleSetWidth = (cardW + gap) * originalCount;

            // Recalculate on resize
            window.addEventListener('resize', () => {
                const metrics = getCardMetrics();
                cardW = metrics.cardW;
                gap = metrics.gap;
                singleSetWidth = (cardW + gap) * originalCount;
                // Re-clamp position to avoid gaps after resize
                setPosition(position);
            });

            let position = 0;
            let isDragging = false;
            let startX = 0;
            let lastX = 0;
            let dragStartPos = 0;
            let velocity = 0;
            let lastTime = 0;
            let animationId = null;
            let autoScrollSpeed = 0.8; // pixels per frame for auto-scroll

            // Initialize track position
            function setPosition(x) {
                // Wrap position for infinite loop
                position = ((x % singleSetWidth) + singleSetWidth) % singleSetWidth;
                track.style.transform = 'translateX(' + (-position) + 'px)';
            }

            // Auto-scroll loop
            function autoScroll() {
                if (!isDragging) {
                    position += autoScrollSpeed;
                    setPosition(position);
                }
                animationId = requestAnimationFrame(autoScroll);
            }

            // Start auto-scroll
            autoScroll();

            // Mouse events
            wrapper.addEventListener('mousedown', (e) => {
                if (e.target.closest('.links-card__link-btn')) return; // Don't drag when clicking link

                isDragging = true;
                startX = e.clientX;
                lastX = e.clientX;
                dragStartPos = position;
                velocity = 0;
                lastTime = Date.now();

                wrapper.style.cursor = 'grabbing';

                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const dx = startX - e.clientX; // Drag left = scroll right (content moves left)
                const newPos = dragStartPos + dx;

                // Calculate velocity for inertia
                const now = Date.now();
                const dt = now - lastTime;
                if (dt > 0) {
                    velocity = (lastX - e.clientX) / dt * 16;
                }

                setPosition(newPos);

                lastX = e.clientX;
                lastTime = now;
            });

            window.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                wrapper.style.cursor = 'grab';

                // Apply inertia then resume auto-scroll
                if (Math.abs(velocity) > 0.5) {
                    let currentVelocity = velocity;

                    function inertia() {
                        if (Math.abs(currentVelocity) < 0.1) {
                            autoScroll();
                            return;
                        }

                        position += currentVelocity;
                        setPosition(position);
                        currentVelocity *= 0.95; // friction

                        animationId = requestAnimationFrame(inertia);
                    }

                    inertia();
                } else {
                    autoScroll();
                }
            });

            // Touch events
            wrapper.addEventListener('touchstart', (e) => {
                if (e.target.closest('.links-card__link-btn')) return;

                isDragging = true;
                startX = e.touches[0].clientX;
                lastX = e.touches[0].clientX;
                dragStartPos = position;
                velocity = 0;
                lastTime = Date.now();

                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (!isDragging) return;

                const dx = startX - e.touches[0].clientX;
                const newPos = dragStartPos + dx;

                const now = Date.now();
                const dt = now - lastTime;
                if (dt > 0) {
                    velocity = (lastX - e.touches[0].clientX) / dt * 16;
                }

                setPosition(newPos);

                lastX = e.touches[0].clientX;
                lastTime = now;
            }, { passive: true });

            window.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;

                if (Math.abs(velocity) > 0.5) {
                    let currentVelocity = velocity;

                    function inertia() {
                        if (Math.abs(currentVelocity) < 0.1) {
                            autoScroll();
                            return;
                        }

                        position += currentVelocity;
                        setPosition(position);
                        currentVelocity *= 0.95;

                        animationId = requestAnimationFrame(inertia);
                    }

                    inertia();
                } else {
                    autoScroll();
                }
            });

            // Set initial cursor
            wrapper.style.cursor = 'grab';

            // Wire up link buttons
            document.querySelectorAll('.links-card').forEach(card => {
                const href = card.dataset.href;
                const btn = card.querySelector('.links-card__link-btn');
                if (href && btn) {
                    btn.href = href;
                }
            });
        })();
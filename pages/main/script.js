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
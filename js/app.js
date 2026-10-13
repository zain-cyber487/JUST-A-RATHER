/**
 * CreativeConor — Main JavaScript
 */
(function () {
    'use strict';

    const BASE_URL = document.querySelector('meta[name="base-url"]')?.content || '';

    // ============ FORM UTILS ============
    const FormUtils = {
        init() {
            this.fixPlaceholders();
            // Also watch for DOM changes if parts of the page are loaded via AJAX
            const observer = new MutationObserver(() => this.fixPlaceholders());
            observer.observe(document.body, { childList: true, subtree: true });
        },
        fixPlaceholders() {
            const inputs = document.querySelectorAll('.premium-form-input, .form-control');
            inputs.forEach(input => {
                if (input.placeholder === 'e.g. Yasir Khalil') {
                    input.placeholder = 'Name';
                } else if (input.placeholder === 'e.g. yasir@example.com') {
                    input.placeholder = 'Email Address';
                }
            });
        }
    };

    // ============ DARK/LIGHT MODE ============
    const ThemeToggle = {
        init() {
            const saved = localStorage.getItem('theme');
            const defaultTheme = document.querySelector('meta[name="default-theme"]')?.content || 'dark';
            const theme = saved || defaultTheme;
            this.setTheme(theme);

            document.querySelectorAll('.theme-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const current = document.documentElement.getAttribute('data-theme') || 'dark';
                    this.setTheme(current === 'dark' ? 'light' : 'dark');
                });
            });
        },
        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            document.querySelectorAll('.theme-toggle').forEach(btn => {
                btn.innerHTML = theme === 'dark'
                    ? '<svg class="header-action-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
                    : '<svg class="header-action-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
            });
        }
    };



    // ============ SEARCH ============
    const Search = {
        timer: null,
        init() {
            const searchBtn = document.querySelectorAll('.search-trigger');
            const overlay = document.getElementById('searchOverlay');
            const input = document.getElementById('searchInput');
            const results = document.getElementById('searchResults');

            if (!overlay) return;

            searchBtn.forEach(btn => btn.addEventListener('click', () => this.open()));

            overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });

            document.querySelectorAll('.search-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.close();
                });
            });

            document.addEventListener('keydown', e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.toggle(); }
                if (e.key === 'Escape') this.close();
            });

            if (input) {
                input.addEventListener('input', () => {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => this.search(input.value), 300);
                });
            }

            // Popular Tags
            document.querySelectorAll('.search-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const query = tag.innerText;
                    if (input) {
                        input.value = query;
                        this.search(query);
                    }
                });
            });
        },
        open() {
            const overlay = document.getElementById('searchOverlay');
            if (overlay) { overlay.classList.add('active'); document.getElementById('searchInput')?.focus(); }
        },
        close() {
            const overlay = document.getElementById('searchOverlay');
            if (overlay) { overlay.classList.remove('active'); }
        },
        toggle() {
            const overlay = document.getElementById('searchOverlay');
            overlay?.classList.contains('active') ? this.close() : this.open();
        },
        async search(query) {
            const results = document.getElementById('searchResults');
            if (!results || query.length < 2) { if (results) results.innerHTML = ''; return; }

            try {
                const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.results.length === 0) {
                    results.innerHTML = '<div class="search-no-results">No results found</div>';
                    return;
                }

                let html = data.results.map(r => `
                    <a href="${r.url}" class="search-result-item">
                        <img src="${r.image}" alt="${r.title}" loading="lazy">
                        <div class="search-result-info">
                            <h4>${r.title}</h4>
                            <span>${r.category} • ${r.file_size || ''}</span>
                        </div>
                    </a>
                `).join('');

                html += `<a href="${BASE_URL}/search?q=${encodeURIComponent(query)}" class="search-see-all">See all results →</a>`;
                results.innerHTML = html;
            } catch (e) {
                results.innerHTML = '<div class="search-no-results">Search error</div>';
            }
        }
    };

    // ============ LIBRARY SEARCH (Category Page) ============
    const LibrarySearch = {
        timer: null,
        init() {
            const form = document.querySelector('.library-search-form, .library-filter-form');
            const input = document.querySelector('.library-search-input-box input, .filter-search-box input');
            const container = document.getElementById('library-results-container');
            const meta = document.getElementById('library-result-meta');

            if (!container) return;

            if (input) {
                input.addEventListener('input', () => {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => this.fetchResults(input.value), 400);
                });
            }

            // Prevent form submit
            form?.addEventListener('submit', (e) => e.preventDefault());

            // Handle sort selection change
            const sortSelect = document.getElementById('library-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('sort', e.target.value);
                    url.searchParams.set('page', '1');
                    this.fetchResultsFromUrl(url.toString());
                });
            }

            // Handle pill clicks via delegation
            document.addEventListener('click', (e) => {
                const pill = e.target.closest('.pill');
                if (pill && pill.href) {
                    e.preventDefault();
                    // Update active state
                    const pillContainer = pill.closest('.library-pills') || pill.closest('.trending-tabs');
                    if (pillContainer) {
                        pillContainer.querySelectorAll('.pill, .tab-btn').forEach(p => p.classList.remove('active'));
                    }
                    pill.classList.add('active');
                    this.fetchResultsFromUrl(pill.href);
                }

                // Handle pagination clicks
                const pageLink = e.target.closest('#library-pagination .page-link');
                if (pageLink && pageLink.href) {
                    e.preventDefault();
                    this.fetchResultsFromUrl(pageLink.href);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        },
        async fetchResults(query) {
            const url = new URL(window.location.href);
            url.searchParams.set('q', query);
            url.searchParams.set('page', '1');
            this.fetchResultsFromUrl(url.toString());
        },
        async fetchResultsFromUrl(urlString) {
            const container = document.getElementById('library-results-container');
            if (!container) return;

            // Loading state
            container.style.opacity = '0.5';
            container.style.pointerEvents = 'none';

            try {
                const res = await fetch(urlString, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const html = await res.text();

                // Parse the response
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.getElementById('library-results-container');
                const newMeta = doc.getElementById('ajax-result-meta');

                if (newContent) {
                    container.innerHTML = newContent.innerHTML;
                    // Update meta
                    const metaDisplay = document.getElementById('library-result-meta');
                    if (metaDisplay && newMeta) {
                        metaDisplay.innerHTML = newMeta.innerHTML;
                        metaDisplay.style.display = 'inline';
                    }

                    // Update sort dropdown value to match the URL
                    try {
                        const urlObj = new URL(urlString, window.location.origin);
                        const currentSort = urlObj.searchParams.get('sort') || 'latest';
                        const sortSelect = document.getElementById('library-sort');
                        if (sortSelect) {
                            sortSelect.value = currentSort;
                        }
                    } catch (err) {
                        console.error('Error parsing sort URL:', err);
                    }
                }

                // Smooth reveal
                container.style.opacity = '1';
                container.style.pointerEvents = 'all';

                // Re-init lazy loading & animations
                LazyLoad.observe();
                FadeIn.init();

                // Update URL without reload
                window.history.pushState({}, '', urlString);

            } catch (e) {
                console.error('Library search error:', e);
                container.style.opacity = '1';
                container.style.pointerEvents = 'all';
            }
        }
    };

    // ============ TRENDING TABS & CATEGORY TOGGLE ============
    const TrendingTabs = {
        init() {
            const handleMobileToggle = (toggleBtnId, tabsWrapId) => {
                const toggleBtn = document.getElementById(toggleBtnId);
                const tabsWrap = document.getElementById(tabsWrapId);
                if (toggleBtn && tabsWrap) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleBtn.classList.toggle('active');
                        tabsWrap.classList.toggle('show');
                    });
                    document.addEventListener('click', (e) => {
                        if (!toggleBtn.contains(e.target) && !tabsWrap.contains(e.target)) {
                            toggleBtn.classList.remove('active');
                            tabsWrap.classList.remove('show');
                        }
                    });
                }
            };

            handleMobileToggle('categoryToggle', 'trendingTabs');
            const titleEl = document.getElementById('trendingTitle');
            const recentTitleEl = document.getElementById('recentTitle');
            const mainCategoryTitle = document.getElementById('mainCategoryTitle');
            const container = document.getElementById('trendingContainer');
            const recentContainer = document.getElementById('recentContainer');

            document.querySelectorAll('#trendingTabs .tab-btn[data-category]').forEach(btn => {
                // Initial Sync
                if (btn.classList.contains('active')) {
                    const catName = btn.innerText;
                    if (titleEl) titleEl.innerText = `Trending ${catName}`;
                    if (recentTitleEl) recentTitleEl.innerText = `Recent ${catName} Updates`;
                    if (mainCategoryTitle) mainCategoryTitle.innerText = catName;
                }

                btn.addEventListener('click', async () => {
                    document.querySelectorAll('#trendingTabs .tab-btn[data-category]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const toggleBtn = document.getElementById('categoryToggle');
                    const tabsWrap = document.getElementById('trendingTabs');
                    if (toggleBtn) toggleBtn.classList.remove('active');
                    if (tabsWrap) tabsWrap.classList.remove('show');

                    const cat = btn.dataset.category;
                    const catName = btn.innerText;

                    // Update Titles Dynamically
                    if (titleEl) titleEl.innerText = `Trending ${catName}`;
                    if (recentTitleEl) recentTitleEl.innerText = `Recent ${catName} Updates`;
                    if (mainCategoryTitle) mainCategoryTitle.innerText = catName;

                    if (container) container.innerHTML = '<div class="skeleton" style="height:300px;grid-column:1/-1"></div>';
                    if (recentContainer) recentContainer.innerHTML = '<div class="skeleton" style="height:300px;grid-column:1/-1"></div>';

                    // Fetch both trending and recent items
                    try {
                        const [resTrending, resRecent] = await Promise.all([
                            fetch(`${BASE_URL}/api/trending?category=${cat}`),
                            fetch(`${BASE_URL}/api/recent?category=${cat}`)
                        ]);

                        const dataTrending = await resTrending.json();
                        const dataRecent = await resRecent.json();

                        // Update Trending Section
                        if (container && dataTrending) {
                            if (dataTrending.is_grouped) {
                                let html = '';
                                dataTrending.groups.forEach(group => {
                                    html += `
                                        <h3 class="trending-group-title">${group.category_name}</h3>
                                        <div class="products-grid">
                                            ${group.products.map(p => this.cardHTML(p)).join('')}
                                        </div>
                                    `;
                                });
                                container.innerHTML = html;
                            } else {
                                container.innerHTML = `<div class="products-grid" id="trendingGrid">${dataTrending.products.map(p => this.cardHTML(p)).join('')}</div>`;
                            }
                        }

                        // Update Recent Section
                        if (recentContainer && dataRecent && dataRecent.products) {
                            recentContainer.innerHTML = `<div class="products-grid" id="recentGrid">${dataRecent.products.map(p => this.cardHTML(p)).join('')}</div>`;
                        }

                        LazyLoad.observe();
                        FadeIn.init(); // Re-trigger animations
                    } catch (e) {
                        if (container) container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Failed to load trending</p>';
                        if (recentContainer) recentContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Failed to load recent updates</p>';
                    }
                });
            });
        },
        splitTitle(title, subTitle) {
            return {
                sub: (subTitle || '').toString().trim().toUpperCase(),
                main: (title || '').toString().trim().toUpperCase()
            };
        },
        formatDownloads(count) {
            const n = parseInt(count, 10) || 0;
            if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            return n > 0 ? n.toString() : '1.2K';
        },
        cardHTML(p) {
            const img = p.featured_image ? `${BASE_URL}/uploads/${p.featured_image.replace(/^\/+/, '')}` : `${BASE_URL}/assets/images/placeholder.jpg`;
            const titleParts = this.splitTitle(p.title, p.sub_title);
            const sizeText = p.file_size || '1.5 GB';
            const downloads = this.formatDownloads(p.download_count);
            return `
                <div class="portal-game-card product-card">
                    <a href="${BASE_URL}/${p.slug}" class="pg-card-link">
                        <div class="pg-card-img-wrap">
                            <img data-src="${img}" src="${img}" alt="${p.title || ''}" class="lazy" loading="lazy" onerror="this.onerror=null; this.src='${BASE_URL}/assets/images/placeholder.jpg';">
                            <div class="pg-card-overlay-gradient"></div>
                        </div>

                        <!-- Top Left Corner File Size Badge -->
                        <span class="pg-card-size-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            ${sizeText}
                        </span>

                        <!-- Top Corner Total Downloads Badge -->
                        <span class="pg-card-downloads">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            ${downloads} Downloads
                        </span>

                        <!-- Bottom Content Directly Over Image -->
                        <div class="pg-card-content-overlay">
                            <div class="pg-card-title-wrap">
                                ${titleParts.sub ? `<span class="pg-title-sub">${titleParts.sub}</span>` : ''}
                                ${titleParts.main ? `<span class="pg-title-main">${titleParts.main}</span>` : ''}
                            </div>

                            <div class="pg-card-meta-row">
                                <span class="pg-card-arrow-btn">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
                                </span>
                            </div>
                        </div>
                    </a>
                </div>`;
        }
    };

    // ============ STAR RATING ============
    const StarRating = {
        init() {
            document.querySelectorAll('.star-rating-input').forEach(wrap => {
                const stars = wrap.querySelectorAll('.star');
                const input = wrap.querySelector('input[type="hidden"]');

                stars.forEach((star, i) => {
                    star.addEventListener('click', () => {
                        const val = i + 1;
                        if (input) input.value = val;
                        stars.forEach((s, j) => s.classList.toggle('active', j < val));
                    });
                    star.addEventListener('mouseenter', () => {
                        stars.forEach((s, j) => s.classList.toggle('active', j <= i));
                    });
                });

                wrap.addEventListener('mouseleave', () => {
                    const val = input ? parseInt(input.value) || 0 : 0;
                    stars.forEach((s, j) => s.classList.toggle('active', j < val));
                });
            });
        }
    };

    // ============ LAZY LOADING ============
    const LazyLoad = {
        observer: null,
        init() {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy');
                        }
                        this.observer.unobserve(img);
                    }
                });
            }, { rootMargin: '200px' });
            this.observe();
        },
        observe() {
            document.querySelectorAll('img.lazy[data-src]').forEach(img => this.observer?.observe(img));
        }
    };

    // ============ MOBILE MENU ============
    const MobileMenu = {
        init() {
            const btn = document.querySelector('.mobile-menu-btn');
            const nav = document.querySelector('.mobile-nav');
            const overlay = document.querySelector('.mobile-nav-overlay');
            const closeBtn = document.querySelector('.mobile-nav-close');
            
            if (!btn || !nav) return;

            const closeMenu = () => {
                nav.classList.remove('active');
                btn.classList.remove('active');
                document.body.style.overflow = '';
                document.querySelector('.site-header')?.classList.remove('menu-active');
            };

            btn.addEventListener('click', () => {
                const isActive = nav.classList.toggle('active');
                btn.classList.toggle('active');
                document.body.style.overflow = isActive ? 'hidden' : '';
                document.querySelector('.site-header')?.classList.toggle('menu-active', isActive);
            });

            if (closeBtn) closeBtn.addEventListener('click', closeMenu);
            if (overlay) overlay.addEventListener('click', closeMenu);

            // Close on link click
            nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
        }
    };


    // ============ MONETIZATION CLICK TRACKING ============
    const MonetizationTracker = {
        init() {
            document.querySelectorAll('.monitoring-click').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.productId || 0;
                    fetch(`${BASE_URL}/api/monetization-click`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `product_id=${productId}`
                    }).catch(() => { });
                });
            });
        }
    };

    // ============ FADE IN ANIMATION ============
    const FadeIn = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.section, .product-card, .featured-card, .category-block').forEach(el => {
                observer.observe(el);
            });
        }
    };

    // ============ LANGUAGE SWITCHER ============
    const LanguageSwitcher = {
        init() {
            const trigger = document.getElementById('langTrigger');
            const dropdown = document.getElementById('langDropdown');
            const items = document.querySelectorAll('.lang-item');

            if (!items.length) return;

            // Toggle active state for dropdown
            if (trigger && dropdown) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    trigger.classList.toggle('active');
                    dropdown.classList.toggle('active');
                });

                // Close when clicking outside
                document.addEventListener('click', (e) => {
                    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                        trigger.classList.remove('active');
                        dropdown.classList.remove('active');
                    }
                });
            }

            // Bind click to each language button
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const lang = item.getAttribute('data-lang');
                    const img = item.querySelector('img');
                    const flagSrc = img ? img.src : '';

                    this.switchLanguage(lang);
                    if (flagSrc) this.updateHeaderFlag(flagSrc);

                    // Update UI state across all language lists
                    items.forEach(i => {
                        if (i.getAttribute('data-lang') === lang) {
                            i.classList.add('active');
                        } else {
                            i.classList.remove('active');
                        }
                    });

                    // Close desktop menu
                    if (trigger) trigger.classList.remove('active');
                    if (dropdown) dropdown.classList.remove('active');
                });
            });

            // Auto-detect current language on load from cookie
            const getCookie = (name) => {
                const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
                return match ? match[2] : null;
            };

            const applyActiveLang = (langCode) => {
                if (!langCode) return;
                items.forEach(i => {
                    if (i.getAttribute('data-lang') === langCode) {
                        i.classList.add('active');
                        const img = i.querySelector('img');
                        if (img) this.updateHeaderFlag(img.src);
                    } else {
                        i.classList.remove('active');
                    }
                });
            };

            const cookieTrans = getCookie('googtrans');
            if (cookieTrans) {
                const parts = cookieTrans.split('/');
                const lang = parts[parts.length - 1];
                if (lang) applyActiveLang(lang);
            }

            // Sync after Google Translate widget loads
            setTimeout(() => {
                const combo = document.querySelector('.goog-te-combo');
                if (combo && combo.value) {
                    applyActiveLang(combo.value);
                }
            }, 800);
        },
        updateHeaderFlag(src) {
            const headerFlag = document.getElementById('activeLangFlag');
            if (headerFlag) headerFlag.src = src;
        },
        switchLanguage(lang) {
            const combo = document.querySelector('.goog-te-combo');
            if (combo) {
                combo.value = lang;
                combo.dispatchEvent(new Event('change', { bubbles: true }));
            }
            document.cookie = `googtrans=/en/${lang}; path=/`;
            document.cookie = `googtrans=/en/${lang}; domain=${window.location.hostname}; path=/`;
        }
    };

    // ============ SCROLL INTERACTION ============
    // ============ SCROLL INTERACTION ============
    const Scroll = {
        init() {
            const header = document.querySelector('.site-header');
            const progressBar = document.querySelector('.scroll-progress-bar');
            if (!header && !progressBar) return;

            let current = 0;      // where the bar is now
            let target = 0;       // where scroll actually is
            let velocity = 0;     // spring velocity
            const stiffness = 0.15;  // spring tension
            const damping = 0.75;    // friction (bounciness)
            let animating = false;

            const getScrollPercent = () => {
                const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                return h > 0 ? (window.scrollY / h) * 100 : 0;
            };

            const animate = () => {
                const force = (target - current) * stiffness;
                velocity += force;
                velocity *= damping;
                current += velocity;

                if (progressBar) progressBar.style.width = Math.max(0, current) + '%';

                // keep animating until settled
                if (Math.abs(velocity) > 0.01 || Math.abs(target - current) > 0.01) {
                    requestAnimationFrame(animate);
                } else {
                    current = target;
                    if (progressBar) progressBar.style.width = current + '%';
                    animating = false;
                }
            };

            const updateHeader = () => {
                if (header) {
                    if (window.scrollY > 20) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }
                }
            };

            window.addEventListener('scroll', () => {
                updateHeader();
                target = getScrollPercent();
                if (!animating) {
                    animating = true;
                    requestAnimationFrame(animate);
                }
            }, { passive: true });

            // Initial state
            updateHeader();
            current = getScrollPercent();
            target = current;
            if (progressBar) progressBar.style.width = current + '%';
        }
    };


    // ============ INIT ============
    document.addEventListener('DOMContentLoaded', () => {
        ThemeToggle.init();
        Scroll.init();
        Search.init();
        LibrarySearch.init();
        TrendingTabs.init();
        StarRating.init();
        LazyLoad.init();
        MobileMenu.init();
        MonetizationTracker.init();
        FadeIn.init();
        LanguageSwitcher.init();
        FormUtils.init();
    });
})();

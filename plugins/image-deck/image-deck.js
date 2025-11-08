(function() {
    'use strict';

    const PLUGIN_NAME = 'image-deck';
    let pluginConfig = null;
    let currentSwiper = null;
    let currentImages = [];
    let autoPlayInterval = null;
    let isAutoPlaying = false;
    let contextInfo = null;
    let imageCache = new Map();
    let loadingQueue = [];

    // Fetch plugin configuration
    async function getPluginConfig() {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query Configuration {
                        configuration {
                            plugins
                        }
                    }`
                })
            });
            const data = await response.json();
            const settings = data?.data?.configuration?.plugins?.[PLUGIN_NAME] || {};

            // Set flashier defaults
            if (!settings.autoPlayInterval || settings.autoPlayInterval === 0) settings.autoPlayInterval = 500;
            if (!settings.transitionEffect || settings.transitionEffect === '') settings.transitionEffect = 'cards';
            if (settings.showProgressBar === undefined) settings.showProgressBar = true;
            if (settings.showCounter === undefined) settings.showCounter = true;
            if (!settings.preloadImages || settings.preloadImages === 0) settings.preloadImages = 2;
            if (!settings.swipeResistance || settings.swipeResistance === 0) settings.swipeResistance = 50;
            if (!settings.effectDepth || settings.effectDepth === 0) settings.effectDepth = 150;

            // Visual effects defaults (flashier!)
            if (!settings.particleCount || settings.particleCount === 0) settings.particleCount = 80;
            if (!settings.particleSpeed || settings.particleSpeed === 0) settings.particleSpeed = 1.0;
            if (!settings.particleSize || settings.particleSize === 0) settings.particleSize = 1.5;
            if (!settings.particleColorHue || settings.particleColorHue === 0) settings.particleColorHue = 260; // Purple
            if (!settings.ambientColorHue || settings.ambientColorHue === 0) settings.ambientColorHue = 260;
            if (!settings.imageGlowIntensity || settings.imageGlowIntensity === 0) settings.imageGlowIntensity = 40;
            if (!settings.ambientPulseSpeed || settings.ambientPulseSpeed === 0) settings.ambientPulseSpeed = 6;
            if (!settings.edgeGlowIntensity || settings.edgeGlowIntensity === 0) settings.edgeGlowIntensity = 50;
            if (!settings.strobeSpeed || settings.strobeSpeed === 0) settings.strobeSpeed = 150;
            if (!settings.strobeIntensity || settings.strobeIntensity === 0) settings.strobeIntensity = 60;

            console.log(`[Image Deck] Settings loaded:`, settings);
            return settings;
        } catch (error) {
            console.error(`[Image Deck] Error loading settings:`, error);
            return {
                autoPlayInterval: 500,
                transitionEffect: 'cards',
                showProgressBar: true,
                showCounter: true,
                preloadImages: 2,
                swipeResistance: 50,
                effectDepth: 150,
                particleCount: 80,
                particleSpeed: 1.0,
                particleSize: 1.5,
                particleColorHue: 260,
                ambientColorHue: 260,
                imageGlowIntensity: 40,
                ambientPulseSpeed: 6,
                edgeGlowIntensity: 50,
                strobeSpeed: 150,
                strobeIntensity: 60
            };
        }
    }

    // Detect current context (tag, performer, gallery, etc.)
    function detectContext() {
        const path = window.location.pathname;
        const hash = window.location.hash;

        // Extract ID from path
        const idMatch = path.match(/\/(\w+)\/(\d+)/);
        if (!idMatch) return null;

        const [, type, id] = idMatch;

        // Check if we're on an images tab
        const isImagesContext = hash.includes('images') ||
                               document.querySelector('.nav-tabs .active')?.textContent?.includes('Images');

        if (!isImagesContext && type !== 'galleries') {
            return null; // Only work with image contexts
        }

        return { type, id, hash };
    }

    // Fetch detailed image metadata
    async function fetchImageMetadata(imageId) {
        const query = `query FindImage($id: ID!) {
            findImage(id: $id) {
                id
                title
                rating100
                o_counter
                organized
                date
                details
                photographer
                files {
                    basename
                }
                tags {
                    id
                    name
                }
                performers {
                    id
                    name
                }
                studio {
                    id
                    name
                }
                galleries {
                    id
                    title
                }
                paths {
                    thumbnail
                    image
                }
            }
        }`;

        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables: { id: imageId } })
            });

            const data = await response.json();
            return data?.data?.findImage || null;
        } catch (error) {
            console.error('[Image Deck] Error fetching image metadata:', error);
            return null;
        }
    }

    // Update image metadata
    async function updateImageMetadata(imageId, updates) {
        const mutation = `mutation ImageUpdate($input: ImageUpdateInput!) {
            imageUpdate(input: $input) {
                id
                rating100
                title
                details
                organized
            }
        }`;

        const input = { id: imageId, ...updates };

        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mutation, variables: { input } })
            });

            const data = await response.json();
            return data?.data?.imageUpdate || null;
        } catch (error) {
            console.error('[Image Deck] Error updating image metadata:', error);
            return null;
        }
    }

    // Add/remove tags from image
    async function updateImageTags(imageId, tagIds) {
        const mutation = `mutation ImageUpdate($input: ImageUpdateInput!) {
            imageUpdate(input: $input) {
                id
                tags {
                    id
                    name
                }
            }
        }`;

        const input = { id: imageId, tag_ids: tagIds };

        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mutation, variables: { input } })
            });

            const data = await response.json();
            return data?.data?.imageUpdate || null;
        } catch (error) {
            console.error('[Image Deck] Error updating image tags:', error);
            return null;
        }
    }

    // Search for tags
    async function searchTags(query) {
        const gql = `query FindTags($filter: FindFilterType, $tag_filter: TagFilterType) {
            findTags(filter: $filter, tag_filter: $tag_filter) {
                tags {
                    id
                    name
                }
            }
        }`;

        const variables = {
            filter: { per_page: 20, q: query },
            tag_filter: {}
        };

        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: gql, variables })
            });

            const data = await response.json();
            return data?.data?.findTags?.tags || [];
        } catch (error) {
            console.error('[Image Deck] Error searching tags:', error);
            return [];
        }
    }

    // Fetch images based on context - OPTIMIZED VERSION
    async function fetchContextImages(context) {
        const { type, id } = context;
        let query = '';
        let variables = {};

        switch(type) {
            case 'performers':
                query = `query FindImages($filter: FindFilterType!, $image_filter: ImageFilterType!) {
                    findImages(filter: $filter, image_filter: $image_filter) {
                        count
                        images {
                            id
                            title
                            paths {
                                thumbnail
                                image
                            }
                        }
                    }
                }`;
                variables = {
                    // Limit initial load to 100 images for performance
                    filter: { per_page: 100, sort: "random", page: 1 },
                    image_filter: { performers: { value: [id], modifier: "INCLUDES" } }
                };
                break;

            case 'tags':
                query = `query FindImages($filter: FindFilterType!, $image_filter: ImageFilterType!) {
                    findImages(filter: $filter, image_filter: $image_filter) {
                        count
                        images {
                            id
                            title
                            paths {
                                thumbnail
                                image
                            }
                        }
                    }
                }`;
                variables = {
                    // Limit initial load to 100 images for performance
                    filter: { per_page: 100, sort: "random", page: 1 },
                    image_filter: { tags: { value: [id], modifier: "INCLUDES" } }
                };
                break;

            case 'galleries':
                query = `query FindGallery($id: ID!) {
                    findGallery(id: $id) {
                        id
                        title
                        images {
                            id
                            title
                            paths {
                                thumbnail
                                image
                            }
                        }
                    }
                }`;
                variables = { id };
                break;

            default:
                // For general image listings, grab visible images
                return getVisibleImages();
        }

        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables })
            });

            const data = await response.json();

            let images = [];
            if (type === 'galleries') {
                images = data?.data?.findGallery?.images || [];
            } else {
                images = data?.data?.findImages?.images || [];
                const count = data?.data?.findImages?.count || 0;
                if (count > 100) {
                    console.log(`[Image Deck] Total images: ${count}, loaded first 100 for performance`);
                }
            }

            return images;
        } catch (error) {
            console.error(`[Image Deck] Error fetching images:`, error);
            return [];
        }
    }

    // Get visible images from current page
    function getVisibleImages() {
        const images = [];
        const imageElements = document.querySelectorAll('.image-card img, .gallery-card img, img[src*="/image/"]');

        imageElements.forEach((img, index) => {
            if (img.src) {
                // Extract image ID from src if possible
                const idMatch = img.src.match(/\/image\/(\d+)/);
                const id = idMatch ? idMatch[1] : `img_${index}`;

                // Convert thumbnail URLs to full image URLs
                const fullImageUrl = img.src.includes('/thumbnail/')
                    ? img.src.replace('/thumbnail/', '/image/')
                    : img.src;

                images.push({
                    id,
                    title: img.alt || `Image ${index + 1}`,
                    paths: {
                        image: fullImageUrl
                    }
                });
            }
        });

        return images;
    }

    // Optimized image preloader
    function preloadImage(src, priority = false) {
        if (imageCache.has(src)) {
            return Promise.resolve(imageCache.get(src));
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.loading = priority ? 'eager' : 'lazy';

            img.onload = () => {
                imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    // Upgrade slide image to full resolution
    function upgradeImageToFull(slide) {
        if (!slide) return;

        const img = slide.querySelector('img');
        if (!img) return;

        const fullSrc = img.dataset.fullSrc;
        if (!fullSrc || img.src === fullSrc) return;

        // Load full resolution
        preloadImage(fullSrc, true).then(() => {
            img.src = fullSrc;
        }).catch(err => {
            console.warn('[Image Deck] Failed to load full resolution:', err);
        });
    }

    // Create the image deck UI
    function createDeckUI() {
        // Remove any existing deck
        const existing = document.querySelector('.image-deck-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.className = 'image-deck-container';
        container.innerHTML = `
            <canvas class="image-deck-particles"></canvas>
            <div class="image-deck-ambient"></div>
            <div class="image-deck-strobe"></div>
            <div class="image-deck-topbar">
                <div class="image-deck-counter"></div>
                <div class="image-deck-topbar-btns">
                    <button class="image-deck-fullscreen" title="Toggle Fullscreen">⛶</button>
                    <button class="image-deck-strobe-btn" title="Toggle Strobe">⚡</button>
                    <button class="image-deck-close">✕</button>
                </div>
            </div>
            <div class="image-deck-progress"></div>
            <div class="image-deck-loading"></div>
            <div class="image-deck-swiper swiper">
                <div class="swiper-wrapper"></div>
            </div>
            <div class="image-deck-controls">
                <button class="image-deck-control-btn" data-action="prev">◀</button>
                <button class="image-deck-control-btn" data-action="play">▶</button>
                <button class="image-deck-control-btn" data-action="next">▶</button>
                <button class="image-deck-control-btn image-deck-info-btn" data-action="info" title="Image Info (I)">ℹ</button>
            </div>
            <div class="image-deck-speed">Speed: ${pluginConfig.autoPlayInterval}ms</div>
            <div class="image-deck-metadata-modal">
                <div class="image-deck-metadata-content">
                    <div class="image-deck-metadata-header">
                        <h3>Image Details</h3>
                        <button class="image-deck-metadata-close">✕</button>
                    </div>
                    <div class="image-deck-metadata-body"></div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Initialize particles
        initParticles(container.querySelector('.image-deck-particles'));

        return container;
    }

    // Particle system for visual candy
    let particleAnimationId = null;

    function initParticles(canvas) {
        if (!canvas) return;
        if (pluginConfig.particleCount === 0) return; // Disabled

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = pluginConfig.particleCount;
        const speedMult = pluginConfig.particleSpeed;
        const sizeMult = pluginConfig.particleSize;
        const baseHue = pluginConfig.particleColorHue;

        // Particle class
        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
                this.opacity = Math.random() * 0.5 + 0.3;
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = -10;
                this.speed = (Math.random() * 0.5 + 0.3) * speedMult;
                this.size = (Math.random() * 2 + 1) * sizeMult;
                this.opacity = Math.random() * 0.5 + 0.3;
                // Vary hue around base color
                this.hue = baseHue + (Math.random() * 40 - 20);
                this.wobble = Math.random() * 2 - 1;
                this.wobbleSpeed = Math.random() * 0.02 + 0.01;
            }

            update() {
                this.y += this.speed;
                this.x += Math.sin(this.y * this.wobbleSpeed) * this.wobble;

                if (this.y > canvas.height + 10) {
                    this.reset();
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 70%, 65%, ${this.opacity})`;
                ctx.fill();

                // Add glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = `hsla(${this.hue}, 70%, 65%, ${this.opacity})`;
            }
        }

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Animation loop
        function animate() {
            // Semi-transparent background for trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            particleAnimationId = requestAnimationFrame(animate);
        }

        animate();

        // Handle resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    function stopParticles() {
        if (particleAnimationId) {
            cancelAnimationFrame(particleAnimationId);
            particleAnimationId = null;
        }
    }

    // Strobe effect
    let strobeInterval = null;
    let isStrobing = false;

    function toggleStrobe() {
        isStrobing = !isStrobing;
        const strobeEl = document.querySelector('.image-deck-strobe');
        const strobeBtn = document.querySelector('.image-deck-strobe-btn');

        if (isStrobing) {
            strobeBtn.classList.add('active');
            const intensity = pluginConfig.strobeIntensity / 100;

            strobeInterval = setInterval(() => {
                if (strobeEl) {
                    strobeEl.style.opacity = intensity;
                    setTimeout(() => {
                        strobeEl.style.opacity = '0';
                    }, 50);
                }
            }, pluginConfig.strobeSpeed);
        } else {
            strobeBtn.classList.remove('active');
            if (strobeInterval) {
                clearInterval(strobeInterval);
                strobeInterval = null;
            }
            if (strobeEl) strobeEl.style.opacity = '0';
        }
    }

    function stopStrobe() {
        isStrobing = false;
        if (strobeInterval) {
            clearInterval(strobeInterval);
            strobeInterval = null;
        }
    }

    // Fullscreen functionality
    function toggleFullscreen() {
        const container = document.querySelector('.image-deck-container');
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.warn('[Image Deck] Fullscreen request failed:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Metadata modal functionality
    let currentMetadata = null;

    async function openMetadataModal() {
        if (!currentSwiper) return;

        const currentIndex = currentSwiper.activeIndex;
        const currentImage = currentImages[currentIndex];

        if (!currentImage || !currentImage.id) return;

        const modal = document.querySelector('.image-deck-metadata-modal');
        const body = document.querySelector('.image-deck-metadata-body');

        if (!modal || !body) return;

        // Show loading state
        body.innerHTML = '<div class="metadata-loading">Loading...</div>';
        modal.classList.add('active');

        // Fetch detailed metadata
        currentMetadata = await fetchImageMetadata(currentImage.id);

        if (!currentMetadata) {
            body.innerHTML = '<div class="metadata-error">Failed to load metadata</div>';
            return;
        }

        // Populate modal
        populateMetadataModal(currentMetadata);
    }

    function closeMetadataModal() {
        const modal = document.querySelector('.image-deck-metadata-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        currentMetadata = null;
    }

    function populateMetadataModal(metadata) {
        const body = document.querySelector('.image-deck-metadata-body');
        if (!body) return;

        const rating = metadata.rating100 ? metadata.rating100 / 20 : 0; // Convert to 5-star scale
        const filename = metadata.files && metadata.files.length > 0 ? metadata.files[0].basename : 'Unknown';

        body.innerHTML = `
            <div class="metadata-section metadata-file-info">
                <div class="metadata-filename" title="${filename}">${filename}</div>
                <a href="/images/${metadata.id}" target="_blank" class="metadata-link" title="Open image page in new tab">
                    View in Stash →
                </a>
            </div>

            <div class="metadata-section">
                <label>Rating</label>
                <div class="metadata-rating">
                    ${[1, 2, 3, 4, 5].map(star =>
                        `<button class="metadata-star ${star <= rating ? 'active' : ''}" data-rating="${star}">★</button>`
                    ).join('')}
                </div>
            </div>

            <div class="metadata-section">
                <label>Title</label>
                <input type="text" class="metadata-title" value="${metadata.title || ''}" placeholder="Enter title...">
            </div>

            <div class="metadata-section">
                <label>Details</label>
                <textarea class="metadata-details" placeholder="Enter details...">${metadata.details || ''}</textarea>
            </div>

            <div class="metadata-section">
                <label>Tags</label>
                <div class="metadata-tags">
                    ${metadata.tags.map(tag =>
                        `<span class="metadata-tag" data-tag-id="${tag.id}">
                            ${tag.name}
                            <button class="metadata-tag-remove" data-tag-id="${tag.id}">×</button>
                        </span>`
                    ).join('')}
                </div>
                <input type="text" class="metadata-tag-search" placeholder="Search tags...">
                <div class="metadata-tag-results"></div>
            </div>

            <div class="metadata-section">
                <label>Info</label>
                <div class="metadata-info">
                    ${metadata.performers.length > 0 ? `<div><strong>Performers:</strong> ${metadata.performers.map(p => p.name).join(', ')}</div>` : ''}
                    ${metadata.studio ? `<div><strong>Studio:</strong> ${metadata.studio.name}</div>` : ''}
                    ${metadata.date ? `<div><strong>Date:</strong> ${metadata.date}</div>` : ''}
                    ${metadata.photographer ? `<div><strong>Photographer:</strong> ${metadata.photographer}</div>` : ''}
                    <div><strong>Views:</strong> ${metadata.o_counter || 0}</div>
                </div>
            </div>

            <div class="metadata-actions">
                <button class="metadata-save-btn">Save Changes</button>
                <button class="metadata-organized-btn ${metadata.organized ? 'active' : ''}">
                    ${metadata.organized ? 'Organized ✓' : 'Mark Organized'}
                </button>
            </div>
        `;

        // Setup event handlers for the modal
        setupMetadataHandlers(metadata);
    }

    function setupMetadataHandlers(metadata) {
        const body = document.querySelector('.image-deck-metadata-body');

        // Rating stars
        body.querySelectorAll('.metadata-star').forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                body.querySelectorAll('.metadata-star').forEach((s, i) => {
                    s.classList.toggle('active', i < rating);
                });
            });
        });

        // Tag removal
        body.querySelectorAll('.metadata-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = e.target.dataset.tagId;
                const tagEl = e.target.closest('.metadata-tag');
                if (tagEl) tagEl.remove();
            });
        });

        // Tag search
        const tagSearch = body.querySelector('.metadata-tag-search');
        const tagResults = body.querySelector('.metadata-tag-results');
        let searchTimeout;

        tagSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                tagResults.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(async () => {
                const tags = await searchTags(query);
                tagResults.innerHTML = tags.map(tag =>
                    `<div class="metadata-tag-result" data-tag-id="${tag.id}" data-tag-name="${tag.name}">
                        ${tag.name}
                    </div>`
                ).join('');

                // Add click handlers for results
                tagResults.querySelectorAll('.metadata-tag-result').forEach(result => {
                    result.addEventListener('click', (e) => {
                        const tagId = e.target.dataset.tagId;
                        const tagName = e.target.dataset.tagName;

                        // Add tag to list
                        const tagsContainer = body.querySelector('.metadata-tags');
                        const tagHtml = `<span class="metadata-tag" data-tag-id="${tagId}">
                            ${tagName}
                            <button class="metadata-tag-remove" data-tag-id="${tagId}">×</button>
                        </span>`;
                        tagsContainer.insertAdjacentHTML('beforeend', tagHtml);

                        // Setup remove handler for new tag
                        const newTag = tagsContainer.lastElementChild;
                        newTag.querySelector('.metadata-tag-remove').addEventListener('click', (e) => {
                            e.target.closest('.metadata-tag').remove();
                        });

                        // Clear search
                        tagSearch.value = '';
                        tagResults.innerHTML = '';
                    });
                });
            }, 300);
        });

        // Save button
        const saveBtn = body.querySelector('.metadata-save-btn');
        saveBtn.addEventListener('click', async () => {
            const title = body.querySelector('.metadata-title').value;
            const details = body.querySelector('.metadata-details').value;
            const activeStar = body.querySelectorAll('.metadata-star.active').length;
            const rating100 = activeStar * 20;

            // Get current tag IDs
            const tagIds = Array.from(body.querySelectorAll('.metadata-tag')).map(tag =>
                tag.dataset.tagId
            );

            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            // Update metadata
            await updateImageMetadata(metadata.id, { title, details, rating100 });
            await updateImageTags(metadata.id, tagIds);

            saveBtn.textContent = 'Saved ✓';
            setTimeout(() => {
                saveBtn.textContent = 'Save Changes';
                saveBtn.disabled = false;
            }, 2000);
        });

        // Organized toggle
        const organizedBtn = body.querySelector('.metadata-organized-btn');
        organizedBtn.addEventListener('click', async () => {
            const isOrganized = organizedBtn.classList.contains('active');
            const newOrganized = !isOrganized;

            await updateImageMetadata(metadata.id, { organized: newOrganized });

            organizedBtn.classList.toggle('active', newOrganized);
            organizedBtn.textContent = newOrganized ? 'Organized ✓' : 'Mark Organized';
        });
    }

    // Initialize Swiper with VIRTUAL SLIDES for performance
    function initSwiper(container, images) {
        const wrapper = container.querySelector('.swiper-wrapper');

        // For large galleries, use virtual slides
        const useVirtual = images.length > 50;

        if (!useVirtual) {
            // For smaller galleries, add slides normally but with optimization
            images.forEach((img, index) => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';

                // Use full resolution images for quality
                const fullSrc = img.paths.image;

                // Load first 3 images immediately, rest lazily
                if (index < 3) {
                    slide.innerHTML = `
                        <img
                            src="${fullSrc}"
                            alt="${img.title || ''}"
                        >
                    `;
                } else {
                    slide.innerHTML = `
                        <img
                            class="swiper-lazy"
                            data-src="${fullSrc}"
                            alt="${img.title || ''}"
                        >
                        <div class="swiper-lazy-preloader"></div>
                    `;
                }
                wrapper.appendChild(slide);
            });
        }

        // Get effect-specific options
        const effectOptions = getEffectOptions(pluginConfig.transitionEffect);

        // Swiper configuration with performance optimizations
        const swiperConfig = {
            effect: pluginConfig.transitionEffect,
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 1,
            resistanceRatio: pluginConfig.swipeResistance / 100,
            // Performance optimizations
            speed: 300,
            watchSlidesProgress: true,
            preloadImages: false,
            // Enable lazy loading only if not using virtual slides
            lazy: useVirtual ? false : {
                loadPrevNext: true,
                loadPrevNextAmount: 2,
                loadOnTransitionStart: true,
                elementClass: 'swiper-lazy',
                loadingClass: 'swiper-lazy-loading',
                loadedClass: 'swiper-lazy-loaded',
                preloaderClass: 'swiper-lazy-preloader'
            },
            keyboard: {
                enabled: true,
                onlyInViewport: false
            },
            ...effectOptions
        };

        // Add virtual slides configuration for large galleries
        if (useVirtual) {
            swiperConfig.virtual = {
                slides: images.map((img, index) => {
                    // Use full resolution for quality
                    const fullSrc = img.paths.image;
                    return `<img src="${fullSrc}" alt="${img.title || ''}" />`;
                }),
                cache: false,
                addSlidesBefore: 2,
                addSlidesAfter: 2
            };
        }

        // Add event handlers
        swiperConfig.on = {
            slideChange: function() {
                updateUI(container);
                savePosition();
            },
            reachEnd: function() {
                if (isAutoPlaying) {
                    stopAutoPlay();
                }
            }
        };

        // Initialize Swiper
        currentSwiper = new Swiper(container.querySelector('.swiper'), swiperConfig);

        // Hide loading
        container.querySelector('.image-deck-loading').style.display = 'none';

        return currentSwiper;
    }

    // Get effect-specific Swiper options - OPTIMIZED
    function getEffectOptions(effect) {
        const depth = pluginConfig.effectDepth;

        // Simplify effects for better performance
        switch(effect) {
            case 'cards':
                return {
                    cardsEffect: {
                        slideShadows: false, // Disable shadows for performance
                        rotate: true,
                        perSlideRotate: 2,
                        perSlideOffset: 8
                    }
                };

            case 'coverflow':
                return {
                    coverflowEffect: {
                        rotate: 30, // Reduced from 50
                        stretch: 0,
                        depth: Math.min(depth, 100), // Cap depth
                        modifier: 1,
                        slideShadows: false // Disable shadows
                    }
                };

            case 'flip':
                return {
                    flipEffect: {
                        slideShadows: false,
                        limitRotation: true
                    }
                };

            case 'cube':
                return {
                    cubeEffect: {
                        shadow: false, // Disable shadows
                        slideShadows: false
                    }
                };

            case 'fade':
                return {
                    fadeEffect: {
                        crossFade: true
                    },
                    speed: 200 // Faster fade
                };

            default: // slide - most performant
                return {
                    spaceBetween: 20,
                    slidesPerView: 1
                };
        }
    }

    // Update UI elements
    function updateUI(container) {
        if (!currentSwiper) return;

        requestAnimationFrame(() => {
            const current = currentSwiper.activeIndex + 1;
            const total = currentSwiper.slides.length || currentImages.length;

            // Update counter
            if (pluginConfig.showCounter) {
                const counter = container.querySelector('.image-deck-counter');
                if (counter) counter.textContent = `${current} of ${total}`;
            }

            // Update progress bar
            if (pluginConfig.showProgressBar) {
                const progress = container.querySelector('.image-deck-progress');
                if (progress) {
                    progress.style.transform = `scaleX(${current / total})`;
                }
            }
        });
    }

    // Auto-play controls
    function startAutoPlay() {
        if (!currentSwiper || isAutoPlaying) return;

        isAutoPlaying = true;
        const playBtn = document.querySelector('[data-action="play"]');
        if (playBtn) {
            playBtn.innerHTML = '⏸';
            playBtn.classList.add('active');
        }

        autoPlayInterval = setInterval(() => {
            if (currentSwiper.isEnd) {
                stopAutoPlay();
            } else {
                currentSwiper.slideNext();
            }
        }, pluginConfig.autoPlayInterval);

        // Show speed indicator briefly
        const speedIndicator = document.querySelector('.image-deck-speed');
        if (speedIndicator) {
            speedIndicator.classList.add('visible');
            setTimeout(() => speedIndicator.classList.remove('visible'), 2000);
        }
    }

    function stopAutoPlay() {
        if (!isAutoPlaying) return;

        isAutoPlaying = false;
        const playBtn = document.querySelector('[data-action="play"]');
        if (playBtn) {
            playBtn.innerHTML = '▶';
            playBtn.classList.remove('active');
        }

        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Save/restore position
    function savePosition() {
        if (!currentSwiper || !contextInfo) return;
        const key = `${PLUGIN_NAME}_position_${contextInfo.type}_${contextInfo.id}`;
        sessionStorage.setItem(key, currentSwiper.activeIndex.toString());
    }

    function restorePosition() {
        if (!currentSwiper || !contextInfo) return;
        const key = `${PLUGIN_NAME}_position_${contextInfo.type}_${contextInfo.id}`;
        const savedPosition = sessionStorage.getItem(key);
        if (savedPosition) {
            const index = parseInt(savedPosition);
            if (!isNaN(index) && index < (currentSwiper.slides.length || currentImages.length)) {
                currentSwiper.slideTo(index, 0);
            }
        }
    }

    // Inject dynamic styles based on config
    function injectDynamicStyles() {
        const styleId = 'image-deck-dynamic-styles';
        let styleEl = document.getElementById(styleId);

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        const ambientHue = pluginConfig.ambientColorHue;
        const glowIntensity = pluginConfig.imageGlowIntensity;
        const pulseSpeed = pluginConfig.ambientPulseSpeed;
        const edgeIntensity = pluginConfig.edgeGlowIntensity / 100;

        styleEl.textContent = `
            .swiper-slide img {
                filter: drop-shadow(0 0 ${glowIntensity}px hsla(${ambientHue}, 70%, 65%, 0.4));
            }

            .image-deck-ambient {
                background: radial-gradient(
                    ellipse at center,
                    hsla(${ambientHue}, 70%, 50%, 0.2) 0%,
                    hsla(${ambientHue}, 60%, 40%, 0.15) 50%,
                    transparent 100%
                );
                animation: ambientPulse ${pulseSpeed}s ease-in-out infinite;
            }

            .image-deck-container::before {
                box-shadow: inset 0 0 ${100 * edgeIntensity}px hsla(${ambientHue}, 70%, 50%, ${0.2 * edgeIntensity});
                animation: edgeGlow 4s ease-in-out infinite alternate;
            }

            @keyframes edgeGlow {
                0% {
                    box-shadow: inset 0 0 ${100 * edgeIntensity}px hsla(${ambientHue}, 70%, 50%, ${0.2 * edgeIntensity});
                }
                100% {
                    box-shadow: inset 0 0 ${150 * edgeIntensity}px hsla(${ambientHue + 20}, 70%, 50%, ${0.3 * edgeIntensity});
                }
            }

            .image-deck-progress {
                background: linear-gradient(90deg,
                    hsl(${ambientHue}, 70%, 65%),
                    hsl(${ambientHue + 30}, 70%, 65%)
                );
            }
        `;
    }

    // Open the image deck
    async function openDeck() {
        // Load config
        pluginConfig = await getPluginConfig();

        // Inject dynamic styles
        injectDynamicStyles();

        // Get context
        contextInfo = detectContext();
        if (!contextInfo && document.querySelectorAll('img[src*="/image/"]').length === 0) {
            console.warn('[Image Deck] No image context detected');
            return;
        }

        // Fetch images
        currentImages = contextInfo ? await fetchContextImages(contextInfo) : getVisibleImages();

        if (currentImages.length === 0) {
            console.warn('[Image Deck] No images found');
            return;
        }

        console.log(`[Image Deck] Opening with ${currentImages.length} images`);

        // Clear image cache if it's getting too large
        if (imageCache.size > 100) {
            imageCache.clear();
        }

        // Create UI
        const container = createDeckUI();
        document.body.classList.add('image-deck-open');

        // Animate in with GPU acceleration
        requestAnimationFrame(() => {
            container.classList.add('active');
        });

        // Initialize Swiper
        initSwiper(container, currentImages);

        // Restore position
        restorePosition();

        // Initial UI update
        updateUI(container);

        // Setup event handlers
        setupEventHandlers(container);
    }

    // Close the deck
    function closeDeck() {
        stopAutoPlay();
        stopParticles();
        stopStrobe();

        const container = document.querySelector('.image-deck-container');
        if (container) {
            container.classList.remove('active');
            setTimeout(() => {
                container.remove();
                document.body.classList.remove('image-deck-open');
            }, 300);
        }

        if (currentSwiper) {
            currentSwiper.destroy(true, true);
            currentSwiper = null;
        }

        currentImages = [];
        contextInfo = null;
        loadingQueue = [];
    }

    // Setup event handlers
    function setupEventHandlers(container) {
        // Close button
        container.querySelector('.image-deck-close').addEventListener('click', closeDeck);

        // Fullscreen button
        const fullscreenBtn = container.querySelector('.image-deck-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }

        // Strobe button
        const strobeBtn = container.querySelector('.image-deck-strobe-btn');
        if (strobeBtn) {
            strobeBtn.addEventListener('click', toggleStrobe);
        }

        // Metadata modal close button
        const metadataCloseBtn = container.querySelector('.image-deck-metadata-close');
        if (metadataCloseBtn) {
            metadataCloseBtn.addEventListener('click', closeMetadataModal);
        }

        // Control buttons
        container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch(action) {
                case 'prev':
                    currentSwiper?.slidePrev();
                    break;
                case 'next':
                    currentSwiper?.slideNext();
                    break;
                case 'play':
                    if (isAutoPlaying) {
                        stopAutoPlay();
                    } else {
                        startAutoPlay();
                    }
                    break;
                case 'info':
                    openMetadataModal();
                    break;
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', handleKeyboard);

        // Swipe gestures (for touch devices) - OPTIMIZED
        let touchStartY = 0;
        let touchDeltaY = 0;
        let rafId = null;

        const swiperEl = container.querySelector('.image-deck-swiper');

        swiperEl.addEventListener('touchstart', (e) => {
            // Only handle touches on the swiper, not the modal
            if (e.target.closest('.image-deck-metadata-modal')) return;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        swiperEl.addEventListener('touchmove', (e) => {
            // Only handle touches on the swiper, not the modal
            if (e.target.closest('.image-deck-metadata-modal')) return;

            touchDeltaY = e.touches[0].clientY - touchStartY;

            // Swipe down to close
            if (touchDeltaY > 50) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    container.style.transform = `translateY(${touchDeltaY * 0.3}px)`;
                    container.style.opacity = Math.max(0.3, 1 - (touchDeltaY / 500));
                });
            }
            // Swipe up to open metadata (visual feedback)
            else if (touchDeltaY < -50) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    const modal = container.querySelector('.image-deck-metadata-modal');
                    if (modal && !modal.classList.contains('active')) {
                        // Preview the modal sliding up
                        modal.style.transform = `translateY(${Math.max(touchDeltaY, -200)}px)`;
                        modal.style.opacity = Math.min(Math.abs(touchDeltaY) / 150, 1);
                    }
                });
            }
        }, { passive: true });

        swiperEl.addEventListener('touchend', () => {
            // Only handle touches on the swiper, not the modal
            if (rafId) cancelAnimationFrame(rafId);

            // Swipe down to close
            if (touchDeltaY > 150) {
                closeDeck();
            }
            // Swipe up to open metadata
            else if (touchDeltaY < -100) {
                openMetadataModal();
            }
            // Reset transform
            else {
                requestAnimationFrame(() => {
                    container.style.transform = '';
                    container.style.opacity = '';
                    const modal = container.querySelector('.image-deck-metadata-modal');
                    if (modal && !modal.classList.contains('active')) {
                        modal.style.transform = '';
                        modal.style.opacity = '';
                    }
                });
            }
            touchDeltaY = 0;
        }, { passive: true });
    }

    // Keyboard handler
    function handleKeyboard(e) {
        if (!currentSwiper) return;

        // Don't interfere with typing in metadata modal inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                closeMetadataModal();
            }
            return;
        }

        switch(e.key) {
            case 'Escape':
                const modal = document.querySelector('.image-deck-metadata-modal');
                if (modal && modal.classList.contains('active')) {
                    closeMetadataModal();
                } else {
                    closeDeck();
                }
                break;
            case ' ':
                e.preventDefault();
                if (isAutoPlaying) {
                    stopAutoPlay();
                } else {
                    startAutoPlay();
                }
                break;
            case 'i':
            case 'I':
                e.preventDefault();
                const metadataModal = document.querySelector('.image-deck-metadata-modal');
                if (metadataModal && metadataModal.classList.contains('active')) {
                    closeMetadataModal();
                } else {
                    openMetadataModal();
                }
                break;
        }
    }

    // Create launch button
    function createLaunchButton() {
        // Check if we're on a relevant page
        if (!detectContext() && document.querySelectorAll('img[src*="/image/"]').length === 0) {
            return;
        }

        // Remove any existing button
        const existing = document.querySelector('.image-deck-launch-btn');
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.className = 'image-deck-launch-btn';
        button.innerHTML = '🎴';
        button.title = 'Open Image Deck';
        button.addEventListener('click', openDeck);

        document.body.appendChild(button);
    }

    // Retry creating launch button with exponential backoff
    function retryCreateButton(attempts = 0, maxAttempts = 5) {
        const delays = [100, 300, 500, 1000, 2000];

        if (attempts >= maxAttempts) {
            console.log('[Image Deck] Max retry attempts reached');
            return;
        }

        const hasContext = detectContext();
        const hasImages = document.querySelectorAll('img[src*="/image/"]').length > 0;

        if (hasContext || hasImages) {
            createLaunchButton();
        } else if (attempts < maxAttempts - 1) {
            setTimeout(() => retryCreateButton(attempts + 1, maxAttempts), delays[attempts]);
        }
    }

    // Initialize plugin
    function initialize() {
        console.log('[Image Deck] Initializing...');

        // Wait for Swiper to load
        if (typeof Swiper === 'undefined') {
            console.error('[Image Deck] Swiper not loaded!');
            return;
        }

        // Create launch button on relevant pages
        retryCreateButton();

        // Watch for DOM changes to detect when React renders new content
        let debounceTimer;
        const observer = new MutationObserver((mutations) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Check if button exists and we're still on a valid page
                const hasButton = document.querySelector('.image-deck-launch-btn');
                const shouldHaveButton = detectContext() || document.querySelectorAll('img[src*="/image/"]').length > 0;

                if (!hasButton && shouldHaveButton) {
                    createLaunchButton();
                }
            }, 300);
        });

        // Observe the main content area for changes
        const mainContent = document.querySelector('.main-content') ||
                          document.querySelector('[role="main"]') ||
                          document.body;

        observer.observe(mainContent, {
            childList: true,
            subtree: true // Watch subtree to catch React updates
        });

        console.log('[Image Deck] Initialized');
    }

    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 500);
    }

    // Track last URL to detect changes
    let lastUrl = location.href;

    // Handle SPA navigation - intercept both pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(history, arguments);
        handleNavigation();
    };

    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        handleNavigation();
    };

    // Handle back/forward navigation
    window.addEventListener('popstate', handleNavigation);

    // Poll for URL changes as fallback (React Router sometimes doesn't trigger history events)
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            handleNavigation();
        }
    }, 500);

    function handleNavigation() {
        lastUrl = location.href;
        closeDeck();
        retryCreateButton();
    }

})();
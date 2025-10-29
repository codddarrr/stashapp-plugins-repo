(function() {
    'use strict';

    const PLUGIN_NAME = 'living-cards';
    const ENHANCED_ATTR = `data-${PLUGIN_NAME}-enhanced`;

    let pluginConfig = null;
    let cardTimers = new Map(); // Map of element -> timer data
    let intersectionObserver = null;
    let isPageVisible = true;

    // Get random number with normal distribution (Box-Muller transform)
    function normalRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // Calculate randomized interval using normal distribution
    function getRandomInterval(baseInterval, randomnessFactor) {
        if (randomnessFactor === 0) return baseInterval;

        // Normal distribution with mean=0, stddev=1
        const normalValue = normalRandom();
        // Clamp to reasonable range (-2 to +2 standard deviations)
        const clampedNormal = Math.max(-2, Math.min(2, normalValue));
        // Scale by randomness factor
        const variation = (randomnessFactor / 100) * baseInterval * (clampedNormal / 2);
        // Add to base interval and ensure minimum 1 second
        return Math.max(1, baseInterval + variation);
    }

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

            // Set defaults - booleans default to true (enabled), but once user turns off, respect it
            // We check if the value has ever been set by looking at the raw config
            const rawConfig = data?.data?.configuration?.plugins?.[PLUGIN_NAME];
            if (settings.enableTags === undefined || !rawConfig || !('enableTags' in rawConfig)) settings.enableTags = true;
            if (settings.enablePerformers === undefined || !rawConfig || !('enablePerformers' in rawConfig)) settings.enablePerformers = true;
            if (settings.enableGalleries === undefined || !rawConfig || !('enableGalleries' in rawConfig)) settings.enableGalleries = true;
            if (settings.useScenes === undefined || !rawConfig || !('useScenes' in rawConfig)) settings.useScenes = true;
            if (settings.useImages === undefined || !rawConfig || !('useImages' in rawConfig)) settings.useImages = true;

            // For numbers, if they're 0 or not set, use sensible defaults
            if (!settings.baseInterval || settings.baseInterval === 0) settings.baseInterval = 5;
            if (settings.randomnessFactor === undefined || settings.randomnessFactor === 0) settings.randomnessFactor = 75;
            if (!settings.transitionStyle || settings.transitionStyle === '') settings.transitionStyle = 'random';
            if (!settings.transitionDuration || settings.transitionDuration === 0) settings.transitionDuration = 800;

            console.log(`[Living Cards] Settings loaded:`, settings);
            return settings;
        } catch (error) {
            console.error(`[Living Cards] Error loading settings:`, error);
            return {
                enableTags: true,
                enablePerformers: true,
                enableGalleries: true,
                useScenes: true,
                useImages: true,
                baseInterval: 5,
                randomnessFactor: 75,
                transitionStyle: 'random',
                transitionDuration: 800
            };
        }
    }

    // Detect current page type
    function detectPageType() {
        const path = window.location.pathname;
        if (path.includes('/tags')) return 'tags';
        if (path.includes('/performers')) return 'performers';
        if (path.includes('/galleries')) return 'galleries';
        return null;
    }

    // Check if plugin is enabled for current page
    function isEnabledForCurrentPage() {
        const pageType = detectPageType();
        if (!pageType) return false;

        switch(pageType) {
            case 'tags': return pluginConfig.enableTags;
            case 'performers': return pluginConfig.enablePerformers;
            case 'galleries': return pluginConfig.enableGalleries;
            default: return false;
        }
    }

    // GraphQL: Fetch random scene screenshot for a tag
    async function fetchRandomTagSceneImage(tagId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query FindScenes($filter: FindFilterType!, $scene_filter: SceneFilterType!) {
                        findScenes(filter: $filter, scene_filter: $scene_filter) {
                            scenes {
                                id
                                paths {
                                    screenshot
                                }
                            }
                        }
                    }`,
                    variables: {
                        filter: {
                            per_page: 1,
                            page: Math.floor(Math.random() * 10) + 1,
                            sort: "random"
                        },
                        scene_filter: {
                            tags: {
                                value: [tagId],
                                modifier: "INCLUDES"
                            }
                        }
                    }
                })
            });
            const data = await response.json();
            const scenes = data?.data?.findScenes?.scenes || [];
            return scenes.length > 0 ? scenes[0].paths.screenshot : null;
        } catch (error) {
            console.error(`[Living Cards] Error fetching tag scene:`, error);
            return null;
        }
    }

    // GraphQL: Fetch random tagged image
    async function fetchRandomTagImageImage(tagId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query FindImages($filter: FindFilterType!, $image_filter: ImageFilterType!) {
                        findImages(filter: $filter, image_filter: $image_filter) {
                            images {
                                id
                                paths {
                                    thumbnail
                                }
                            }
                        }
                    }`,
                    variables: {
                        filter: {
                            per_page: 1,
                            page: Math.floor(Math.random() * 10) + 1,
                            sort: "random"
                        },
                        image_filter: {
                            tags: {
                                value: [tagId],
                                modifier: "INCLUDES"
                            }
                        }
                    }
                })
            });
            const data = await response.json();
            const images = data?.data?.findImages?.images || [];
            return images.length > 0 ? images[0].paths.thumbnail : null;
        } catch (error) {
            console.error(`[Living Cards] Error fetching tag image:`, error);
            return null;
        }
    }

    // Wrapper: Fetch random tag image (scenes and/or images based on settings)
    async function fetchRandomTagImage(tagId) {
        const sources = [];
        if (pluginConfig.useScenes) sources.push('scene');
        if (pluginConfig.useImages) sources.push('image');

        if (sources.length === 0) return null;

        const source = sources[Math.floor(Math.random() * sources.length)];

        if (source === 'scene') {
            return await fetchRandomTagSceneImage(tagId);
        } else {
            return await fetchRandomTagImageImage(tagId);
        }
    }

    // GraphQL: Fetch random scene screenshot for a performer
    async function fetchRandomPerformerSceneImage(performerId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query FindScenes($filter: FindFilterType!, $scene_filter: SceneFilterType!) {
                        findScenes(filter: $filter, scene_filter: $scene_filter) {
                            scenes {
                                id
                                paths {
                                    screenshot
                                }
                            }
                        }
                    }`,
                    variables: {
                        filter: {
                            per_page: 1,
                            page: Math.floor(Math.random() * 10) + 1,
                            sort: "random"
                        },
                        scene_filter: {
                            performers: {
                                value: [performerId],
                                modifier: "INCLUDES"
                            }
                        }
                    }
                })
            });
            const data = await response.json();
            const scenes = data?.data?.findScenes?.scenes || [];
            return scenes.length > 0 ? scenes[0].paths.screenshot : null;
        } catch (error) {
            console.error(`[Living Cards] Error fetching performer scene:`, error);
            return null;
        }
    }

    // GraphQL: Fetch random performer image
    async function fetchRandomPerformerImageImage(performerId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query FindImages($filter: FindFilterType!, $image_filter: ImageFilterType!) {
                        findImages(filter: $filter, image_filter: $image_filter) {
                            images {
                                id
                                paths {
                                    thumbnail
                                }
                            }
                        }
                    }`,
                    variables: {
                        filter: {
                            per_page: 1,
                            page: Math.floor(Math.random() * 10) + 1,
                            sort: "random"
                        },
                        image_filter: {
                            performers: {
                                value: [performerId],
                                modifier: "INCLUDES"
                            }
                        }
                    }
                })
            });
            const data = await response.json();
            const images = data?.data?.findImages?.images || [];
            return images.length > 0 ? images[0].paths.thumbnail : null;
        } catch (error) {
            console.error(`[Living Cards] Error fetching performer image:`, error);
            return null;
        }
    }

    // Wrapper: Fetch random performer image (scenes and/or images based on settings)
    async function fetchRandomPerformerImage(performerId) {
        const sources = [];
        if (pluginConfig.useScenes) sources.push('scene');
        if (pluginConfig.useImages) sources.push('image');

        if (sources.length === 0) return null;

        const source = sources[Math.floor(Math.random() * sources.length)];

        if (source === 'scene') {
            return await fetchRandomPerformerSceneImage(performerId);
        } else {
            return await fetchRandomPerformerImageImage(performerId);
        }
    }

    // GraphQL: Fetch random gallery image
    async function fetchRandomGalleryImage(galleryId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query FindGallery($id: ID!) {
                        findGallery(id: $id) {
                            id
                            images {
                                id
                                paths {
                                    thumbnail
                                }
                            }
                        }
                    }`,
                    variables: {
                        id: galleryId
                    }
                })
            });
            const data = await response.json();
            const images = data?.data?.findGallery?.images || [];
            if (images.length === 0) return null;
            const randomImage = images[Math.floor(Math.random() * images.length)];
            return randomImage.paths.thumbnail;
        } catch (error) {
            console.error(`[Living Cards] Error fetching gallery image:`, error);
            return null;
        }
    }

    // Get appropriate fetch function based on page type
    function getFetchFunction(pageType) {
        switch(pageType) {
            case 'tags': return fetchRandomTagImage;
            case 'performers': return fetchRandomPerformerImage;
            case 'galleries': return fetchRandomGalleryImage;
            default: return null;
        }
    }

    // Extract entity ID from card element
    function extractEntityId(cardElement) {
        // Try to find link with entity ID
        const link = cardElement.querySelector('a[href*="/tags/"], a[href*="/performers/"], a[href*="/galleries/"]');
        if (!link) return null;

        const href = link.getAttribute('href');
        const match = href.match(/\/(tags|performers|galleries)\/(\d+)/);
        return match ? match[2] : null;
    }

    // Get random transition style (excluding 'random' itself)
    function getRandomTransitionStyle() {
        const styles = ['fade', 'slide', 'flip', 'zoom', 'rotate'];
        return styles[Math.floor(Math.random() * styles.length)];
    }

    // GSAP transition effects
    const transitions = {
        fade: (element, newSrc, duration) => {
            const timeline = gsap.timeline();
            timeline.to(element, {
                opacity: 0,
                duration: duration / 2000,
                ease: "power2.inOut",
                onComplete: () => {
                    element.src = newSrc;
                }
            });
            timeline.to(element, {
                opacity: 1,
                duration: duration / 2000,
                ease: "power2.inOut"
            });
        },

        slide: (element, newSrc, duration) => {
            const timeline = gsap.timeline();
            timeline.to(element, {
                x: -100,
                opacity: 0,
                duration: duration / 2000,
                ease: "power2.inOut",
                onComplete: () => {
                    element.src = newSrc;
                    gsap.set(element, { x: 100 });
                }
            });
            timeline.to(element, {
                x: 0,
                opacity: 1,
                duration: duration / 2000,
                ease: "power2.inOut"
            });
        },

        flip: (element, newSrc, duration) => {
            const timeline = gsap.timeline();
            timeline.to(element, {
                rotationY: 90,
                duration: duration / 2000,
                ease: "power2.inOut",
                onComplete: () => {
                    element.src = newSrc;
                }
            });
            timeline.to(element, {
                rotationY: 0,
                duration: duration / 2000,
                ease: "power2.inOut"
            });
        },

        zoom: (element, newSrc, duration) => {
            const timeline = gsap.timeline();
            timeline.to(element, {
                scale: 0,
                opacity: 0,
                duration: duration / 2000,
                ease: "power2.inOut",
                onComplete: () => {
                    element.src = newSrc;
                }
            });
            timeline.to(element, {
                scale: 1,
                opacity: 1,
                duration: duration / 2000,
                ease: "power2.inOut"
            });
        },

        rotate: (element, newSrc, duration) => {
            const timeline = gsap.timeline();
            timeline.to(element, {
                rotation: 180,
                scale: 0.5,
                opacity: 0,
                duration: duration / 2000,
                ease: "power2.inOut",
                onComplete: () => {
                    element.src = newSrc;
                }
            });
            timeline.to(element, {
                rotation: 360,
                scale: 1,
                opacity: 1,
                duration: duration / 2000,
                ease: "power2.inOut"
            });
        }
    };

    // Perform transition to new image
    async function transitionToNewImage(cardElement) {
        const pageType = detectPageType();
        const entityId = extractEntityId(cardElement);

        if (!entityId) {
            console.warn(`[Living Cards] Could not extract entity ID from card`);
            return;
        }

        const fetchFunc = getFetchFunction(pageType);
        if (!fetchFunc) return;

        const newImageUrl = await fetchFunc(entityId);
        if (!newImageUrl) {
            console.warn(`[Living Cards] No image found for entity ${entityId}`);
            return;
        }

        // Find the image element within the card
        const imgElement = cardElement.querySelector('img');
        if (!imgElement) return;

        // Apply transition - if random, pick a random style each time
        let transitionStyle = pluginConfig.transitionStyle;
        if (transitionStyle === 'random') {
            transitionStyle = getRandomTransitionStyle();
        }
        const transitionFunc = transitions[transitionStyle] || transitions.fade;
        transitionFunc(imgElement, newImageUrl, pluginConfig.transitionDuration);

        console.log(`[Living Cards] Transitioned card for entity ${entityId}`);
    }

    // Start animation timer for a card
    function startCardTimer(cardElement) {
        if (!isPageVisible) return; // Don't start if page hidden

        const interval = getRandomInterval(
            pluginConfig.baseInterval,
            pluginConfig.randomnessFactor
        );

        console.log(`[Living Cards] Starting timer for card: ${interval.toFixed(2)}s`);

        const timerId = setTimeout(async () => {
            await transitionToNewImage(cardElement);
            // Restart timer after transition
            startCardTimer(cardElement);
        }, interval * 1000);

        cardTimers.set(cardElement, { timerId, interval });
    }

    // Stop animation timer for a card
    function stopCardTimer(cardElement) {
        const timerData = cardTimers.get(cardElement);
        if (timerData) {
            clearTimeout(timerData.timerId);
            cardTimers.delete(cardElement);
            console.log(`[Living Cards] Stopped timer for card`);
        }
    }

    // Handle card visibility changes
    function handleIntersection(entries) {
        entries.forEach(entry => {
            const cardElement = entry.target;

            if (entry.isIntersecting) {
                // Card became visible
                if (!cardTimers.has(cardElement)) {
                    startCardTimer(cardElement);
                }
            } else {
                // Card left viewport
                stopCardTimer(cardElement);
            }
        });
    }

    // Setup intersection observer for cards
    function setupCardObservers() {
        // Find all card containers
        const selectors = [
            '.tag-card',
            '.performer-card',
            '.gallery-card',
            '.card',
            '[class*="Card"]',
            '[class*="card"]'
        ];

        const cards = document.querySelectorAll(selectors.join(', '));

        console.log(`[Living Cards] Found ${cards.length} potential cards`);

        cards.forEach(card => {
            // Skip if already enhanced
            if (card.getAttribute(ENHANCED_ATTR) === 'true') return;

            // Check if card has an image
            const img = card.querySelector('img');
            if (!img) return;

            // Check if it's a relevant entity
            const entityId = extractEntityId(card);
            if (!entityId) return;

            // Mark as enhanced
            card.setAttribute(ENHANCED_ATTR, 'true');

            // Observe this card
            intersectionObserver.observe(card);
        });
    }

    // Handle page visibility changes
    function handleVisibilityChange() {
        if (document.hidden) {
            isPageVisible = false;
            // Pause all timers
            cardTimers.forEach((timerData, cardElement) => {
                clearTimeout(timerData.timerId);
            });
            console.log(`[Living Cards] Page hidden - paused all timers`);
        } else {
            isPageVisible = true;
            // Resume all timers for visible cards
            const visibleCards = Array.from(cardTimers.keys());
            cardTimers.clear();
            visibleCards.forEach(card => {
                startCardTimer(card);
            });
            console.log(`[Living Cards] Page visible - resumed timers`);
        }
    }

    // Initialize plugin
    async function initialize() {
        console.log(`[Living Cards] Initializing...`);

        // Load configuration
        pluginConfig = await getPluginConfig();

        // Check if enabled for current page
        if (!isEnabledForCurrentPage()) {
            console.log(`[Living Cards] Not enabled for current page`);
            return;
        }

        // Wait for GSAP to load
        if (typeof gsap === 'undefined') {
            console.error(`[Living Cards] GSAP not loaded!`);
            return;
        }

        // Setup intersection observer
        intersectionObserver = new IntersectionObserver(handleIntersection, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });

        // Setup page visibility listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial setup
        setupCardObservers();

        // Re-scan for new cards periodically (for dynamic content)
        setInterval(() => {
            if (isEnabledForCurrentPage()) {
                setupCardObservers();
            }
        }, 2000);

        console.log(`[Living Cards] Initialized successfully`);
    }

    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also listen for navigation changes (SPA)
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        setTimeout(initialize, 500);
    };
    window.addEventListener('popstate', () => {
        setTimeout(initialize, 500);
    });

})();

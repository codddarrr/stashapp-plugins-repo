(function() {
    'use strict';

    // Capture VanillaTilt from global scope into our namespace
    // (loaded from vanilla-tilt.min.js before this script)
    const VanillaTilt = window.VanillaTilt;

    // Unique namespace prefix to avoid conflicts
    const PLUGIN_PREFIX = 'card-eye-candy';
    const TOGGLE_ID = `${PLUGIN_PREFIX}-toggle`;
    const TOGGLE_CONTAINER_ID = `${PLUGIN_PREFIX}-toggle-container`;
    const ENHANCED_ATTR = `data-${PLUGIN_PREFIX}-enhanced`;

    // Plugin state
    let pluginConfig = null;
    let isEnabled = false;
    let toggleButton = null;
    let tiltInstances = [];
    let cardObserver = null;

    // Fetch plugin settings from GraphQL
    async function getPluginSettings() {
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
            const settings = data?.data?.configuration?.plugins?.['card-eye-candy'] || {};

            // Set defaults
            if (settings.enabledByDefault === undefined) settings.enabledByDefault = false;
            if (settings.effectIntensity === undefined) settings.effectIntensity = 15;
            if (settings.glareEffect === undefined) settings.glareEffect = true;
            if (settings.maxGlare === undefined) settings.maxGlare = 0.3;
            if (settings.scaleOnHover === undefined) settings.scaleOnHover = true;
            if (settings.scaleAmount === undefined) settings.scaleAmount = 1.05;
            if (settings.perspective === undefined) settings.perspective = 1000;
            if (settings.speed === undefined) settings.speed = 400;
            if (settings.gyroscope === undefined) settings.gyroscope = true;
            if (settings.autoAnimate === undefined) settings.autoAnimate = false;
            if (settings.autoAnimateSpeed === undefined) settings.autoAnimateSpeed = 8;
            if (settings.randomizeParameters === undefined) settings.randomizeParameters = true;

            console.log('[Card Eye Candy] Settings loaded:', settings);
            return settings;
        } catch (error) {
            console.error('[Card Eye Candy] Error loading settings:', error);
            return {
                enabledByDefault: false,
                effectIntensity: 15,
                glareEffect: true,
                maxGlare: 0.3,
                scaleOnHover: true,
                scaleAmount: 1.05,
                perspective: 1000,
                speed: 400,
                gyroscope: true,
                autoAnimate: false,
                autoAnimateSpeed: 8,
                randomizeParameters: true
            };
        }
    }

    // Inject CSS for auto-animation
    function injectAutoAnimationCSS() {
        if (!pluginConfig || !pluginConfig.autoAnimate) return;

        const styleId = `${PLUGIN_PREFIX}-auto-animate-style`;
        if (document.getElementById(styleId)) return; // Already injected

        const animationSpeed = pluginConfig.autoAnimateSpeed || 8;
        const intensity = (pluginConfig.effectIntensity || 15) / 2; // Half the tilt intensity for subtle effect

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes ${PLUGIN_PREFIX}-auto-tilt {
                0%, 100% {
                    transform: perspective(${pluginConfig.perspective}px) rotateX(0deg) rotateY(0deg) scale(1);
                }
                25% {
                    transform: perspective(${pluginConfig.perspective}px) rotateX(${intensity * 0.5}deg) rotateY(${intensity}deg) scale(1.02);
                }
                50% {
                    transform: perspective(${pluginConfig.perspective}px) rotateX(${intensity}deg) rotateY(0deg) scale(1);
                }
                75% {
                    transform: perspective(${pluginConfig.perspective}px) rotateX(${intensity * 0.5}deg) rotateY(-${intensity}deg) scale(1.02);
                }
            }

            .${PLUGIN_PREFIX}-auto-animate {
                animation: ${PLUGIN_PREFIX}-auto-tilt ${animationSpeed}s ease-in-out infinite;
                transform-style: preserve-3d;
            }

            .${PLUGIN_PREFIX}-auto-animate:hover {
                animation-play-state: paused;
            }
        `;
        document.head.appendChild(style);
        console.log('[Card Eye Candy] Auto-animation CSS injected');
    }

    // Create toggle switch in top menu bar
    function createToggleSwitch() {
        // Prevent duplicate creation
        if (toggleButton || document.getElementById(TOGGLE_ID)) {
            console.log('[Card Eye Candy] Toggle already exists');
            return;
        }

        // Find the navbar - try multiple selectors
        const navbar = document.querySelector('.navbar-buttons') ||
                      document.querySelector('.navbar-nav.ms-auto') ||
                      document.querySelector('.navbar .ms-auto') ||
                      document.querySelector('.navbar');

        if (!navbar) {
            console.error('[Card Eye Candy] Could not find navbar');
            return;
        }

        // Create container for toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.id = TOGGLE_CONTAINER_ID;
        toggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            margin-left: 8px;
        `;

        // Create label
        const label = document.createElement('span');
        label.textContent = 'Eye Candy';
        label.style.cssText = `
            font-size: 13px;
            user-select: none;
            font-weight: 500;
            white-space: nowrap;
        `;

        // Create toggle switch
        toggleButton = document.createElement('label');
        toggleButton.id = TOGGLE_ID;
        toggleButton.className = 'switch';
        toggleButton.style.cssText = `
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;
            cursor: pointer;
            margin: 0;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isEnabled;
        checkbox.style.cssText = `
            opacity: 0;
            width: 0;
            height: 0;
        `;

        const slider = document.createElement('span');
        slider.style.cssText = `
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.3s;
            border-radius: 24px;
        `;

        const sliderButton = document.createElement('span');
        sliderButton.style.cssText = `
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        `;

        slider.appendChild(sliderButton);
        toggleButton.appendChild(checkbox);
        toggleButton.appendChild(slider);

        // Toggle handler
        checkbox.onchange = () => {
            isEnabled = checkbox.checked;
            if (isEnabled) {
                slider.style.backgroundColor = '#28a745';
                sliderButton.style.transform = 'translateX(24px)';
                enableEffects();
            } else {
                slider.style.backgroundColor = '#ccc';
                sliderButton.style.transform = 'translateX(0)';
                disableEffects();
            }
            console.log('[Card Eye Candy] Toggle:', isEnabled ? 'ON' : 'OFF');
        };

        // Assemble and append
        toggleContainer.appendChild(label);
        toggleContainer.appendChild(toggleButton);

        // Append to navbar
        navbar.appendChild(toggleContainer);

        console.log('[Card Eye Candy] Toggle switch created and attached to navbar');
    }

    // Helper function to randomize a value within ±25% range
    function randomizeValue(value, enabled) {
        if (!enabled) return value;
        const variance = 0.25; // ±25%
        const min = value * (1 - variance);
        const max = value * (1 + variance);
        return min + Math.random() * (max - min);
    }

    // Apply tilt effects to card elements
    function applyTiltEffects() {
        if (!isEnabled || !pluginConfig || !VanillaTilt) return;

        const selectors = [
            '.performer-card',
            '.tag-card',
            '.scene-card',
            '.gallery-card',
            '.wall-item',
            '.GalleryWallCard',
            '.react-photo-gallery--gallery img'
        ];

        // Inject auto-animation CSS if enabled
        if (pluginConfig.autoAnimate) {
            injectAutoAnimationCSS();
        }

        // Find all card elements
        selectors.forEach(selector => {
            const cards = document.querySelectorAll(selector);
            cards.forEach((card, index) => {
                // Skip if already enhanced
                if (card.getAttribute(ENHANCED_ATTR) === 'true') {
                    return;
                }

                // Mark as enhanced
                card.setAttribute(ENHANCED_ATTR, 'true');

                // Add wrapper styling for proper 3D effect
                card.style.transformStyle = 'preserve-3d';
                card.style.position = 'relative';

                // Add auto-animation class if enabled
                if (pluginConfig.autoAnimate) {
                    // Stagger the animation start for a wave effect, with optional randomization
                    const baseDelay = (index % 20) * (pluginConfig.autoAnimateSpeed / 20);
                    const delay = randomizeValue(baseDelay, pluginConfig.randomizeParameters);
                    card.style.animationDelay = `${delay}s`;

                    // Randomize animation duration if enabled
                    if (pluginConfig.randomizeParameters) {
                        const animDuration = randomizeValue(pluginConfig.autoAnimateSpeed, true);
                        card.style.animationDuration = `${animDuration}s`;
                    }

                    card.classList.add(`${PLUGIN_PREFIX}-auto-animate`);
                }

                // Initialize VanillaTilt with optional randomization
                const tiltOptions = {
                    max: randomizeValue(pluginConfig.effectIntensity, pluginConfig.randomizeParameters),
                    speed: randomizeValue(pluginConfig.speed, pluginConfig.randomizeParameters),
                    glare: pluginConfig.glareEffect,
                    'max-glare': randomizeValue(pluginConfig.maxGlare, pluginConfig.randomizeParameters),
                    scale: pluginConfig.scaleOnHover ? randomizeValue(pluginConfig.scaleAmount, pluginConfig.randomizeParameters) : 1,
                    perspective: randomizeValue(pluginConfig.perspective, pluginConfig.randomizeParameters),
                    gyroscope: pluginConfig.gyroscope,
                    reset: true,
                    transition: true
                };

                // Instantiate VanillaTilt
                new VanillaTilt(card, tiltOptions);
                tiltInstances.push(card);

                console.log('[Card Eye Candy] Applied tilt to:', selector);
            });
        });
    }

    // Remove all tilt effects
    function removeTiltEffects() {
        tiltInstances.forEach(element => {
            if (element && element.vanillaTilt) {
                element.vanillaTilt.destroy();
            }
            element.removeAttribute(ENHANCED_ATTR);
            element.style.transform = '';
            element.style.transition = '';
            element.style.animationDelay = '';
            element.style.animationDuration = '';
            element.classList.remove(`${PLUGIN_PREFIX}-auto-animate`);
        });
        tiltInstances = [];

        // Remove auto-animation CSS
        const styleId = `${PLUGIN_PREFIX}-auto-animate-style`;
        const styleEl = document.getElementById(styleId);
        if (styleEl) {
            styleEl.remove();
        }

        console.log('[Card Eye Candy] Removed all tilt effects');
    }

    // Enable effects
    function enableEffects() {
        applyTiltEffects();
        // Start observing for new cards
        if (!cardObserver) {
            cardObserver = new MutationObserver(() => {
                if (isEnabled) {
                    applyTiltEffects();
                }
            });
            cardObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Disable effects
    function disableEffects() {
        removeTiltEffects();
        if (cardObserver) {
            cardObserver.disconnect();
            cardObserver = null;
        }
    }

    // Initialize the plugin
    async function initialize() {
        console.log('[Card Eye Candy] Initializing...');
        console.log('[Card Eye Candy] document.readyState:', document.readyState);
        console.log('[Card Eye Candy] document.body exists:', !!document.body);

        try {
            // Load settings
            pluginConfig = await getPluginSettings();
            console.log('[Card Eye Candy] Settings loaded successfully');

            // Verify VanillaTilt is available
            if (!VanillaTilt) {
                console.error('[Card Eye Candy] VanillaTilt library not loaded!');
                return;
            }
            console.log('[Card Eye Candy] VanillaTilt library ready');

            // Create toggle switch with multiple retries
            let attempts = 0;
            const maxAttempts = 10;
            const tryCreateToggle = () => {
                attempts++;
                console.log(`[Card Eye Candy] Attempt ${attempts}/${maxAttempts} to create toggle`);

                if (document.body) {
                    console.log('[Card Eye Candy] Body found, creating toggle...');
                    createToggleSwitch();
                    console.log('[Card Eye Candy] Toggle creation attempted');
                } else if (attempts < maxAttempts) {
                    console.log('[Card Eye Candy] Body not ready, retrying in 500ms...');
                    setTimeout(tryCreateToggle, 500);
                } else {
                    console.error('[Card Eye Candy] Failed to create toggle after', maxAttempts, 'attempts');
                }
            };

            tryCreateToggle();

            // Enable effects automatically if configured
            if (pluginConfig.enabledByDefault) {
                console.log('[Card Eye Candy] Auto-enabling effects (enabledByDefault is true)');
                isEnabled = true;
                // Update toggle UI after it's created
                setTimeout(() => {
                    const checkbox = toggleButton?.querySelector('input[type="checkbox"]');
                    const slider = toggleButton?.querySelector('span');
                    const sliderButton = slider?.querySelector('span');
                    if (checkbox && slider && sliderButton) {
                        checkbox.checked = true;
                        slider.style.backgroundColor = '#28a745';
                        sliderButton.style.transform = 'translateX(24px)';
                    }
                    enableEffects();
                }, 1000);
            } else {
                console.log('[Card Eye Candy] Plugin initialized (effects disabled by default)');
            }
        } catch (error) {
            console.error('[Card Eye Candy] Error during initialization:', error);
        }
    }

    // Handle navigation changes (for SPAs)
    let lastPath = window.location.pathname;
    const checkNavigation = setInterval(async () => {
        if (window.location.pathname !== lastPath) {
            console.log('[Card Eye Candy] Navigation detected:', lastPath, '->', window.location.pathname);
            lastPath = window.location.pathname;

            // Reload settings
            pluginConfig = await getPluginSettings();

            // Recreate toggle if it was removed
            if (!document.getElementById(TOGGLE_ID)) {
                setTimeout(createToggleSwitch, 500);
            }

            // Reapply effects if enabled
            if (isEnabled) {
                setTimeout(applyTiltEffects, 500);
            }
        }
    }, 1000);

    // Start initialization
    console.log('[Card Eye Candy] ===== PLUGIN SCRIPT LOADED =====');
    console.log('[Card Eye Candy] Version: 1.0.0');
    console.log('[Card Eye Candy] VanillaTilt available:', !!VanillaTilt);
    console.log('[Card Eye Candy] document.readyState:', document.readyState);

    if (document.readyState === 'loading') {
        console.log('[Card Eye Candy] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        console.log('[Card Eye Candy] DOM already loaded, initializing in 100ms...');
        setTimeout(initialize, 100);
    }
})();

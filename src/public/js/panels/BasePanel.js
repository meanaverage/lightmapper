/**
 * Base Panel Class - Abstract base class for all panels in the system
 * @class BasePanel
 * @abstract
 * @description Provides common functionality for all panels including lifecycle methods,
 * event handling, and utility functions. All panels should extend this class.
 */
export class BasePanel {
    /**
     * Creates a new BasePanel instance
     * @constructor
     * @param {string} id - Unique identifier for the panel
     * @param {string} title - Display title for the panel
     * @param {string} icon - Font Awesome icon class (e.g., 'fa-lightbulb')
     */
    constructor(id, title, icon) {
        /** @type {string} Unique panel identifier */
        this.id = id;
        /** @type {string} Panel display title */
        this.title = title;
        /** @type {string} Font Awesome icon class */
        this.icon = icon;
        /** @type {HTMLElement|null} DOM container element */
        this.container = null;
        /** @type {boolean} Initialization status */
        this.isInitialized = false;
    }

    /**
     * Initialize the panel with its container element
     * @param {HTMLElement} container - The DOM element to render the panel into
     */
    init(container) {
        this.container = container;
        this.render();
        this.bindEvents();
        this.isInitialized = true;
    }

    /**
     * Render the panel content - must be implemented by subclasses
     * @abstract
     * @throws {Error} If not implemented by subclass
     */
    render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Render content for accordion-style panels (without redundant headers)
     * @param {string} contentHtml - The main content HTML
     * @param {string} actionsHtml - Optional action buttons HTML
     * @returns {string} The rendered HTML content
     */
    renderAccordionContent(contentHtml, actionsHtml = '') {
        return `
            <div class="panel-accordion-wrapper">
                ${actionsHtml ? `<div class="panel-actions">${actionsHtml}</div>` : ''}
                <div class="panel-body">
                    ${contentHtml}
                </div>
            </div>
        `;
    }

    /**
     * Bind event listeners - override in subclass if needed
     * @virtual
     */
    bindEvents() {
        // Override in subclass if needed
    }

    /**
     * Show the panel
     * @fires onShow
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.onShow();
        }
    }

    /**
     * Hide the panel
     * @fires onHide
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.onHide();
        }
    }

    /**
     * Called when panel is shown - override for custom behavior
     * @virtual
     */
    onShow() {
        // Override in subclass if needed
    }

    /**
     * Called when panel is hidden - override for custom behavior
     * @virtual
     */
    onHide() {
        // Override in subclass if needed
    }

    /**
     * Refresh panel content - override for custom refresh logic
     * @virtual
     */
    refresh() {
        // Override in subclass if needed
    }

    /**
     * Destroy the panel and clean up resources
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isInitialized = false;
    }

    /**
     * Utility method to create DOM elements
     * @param {string} tag - HTML tag name
     * @param {string} [className] - CSS class name(s)
     * @param {string} [innerHTML=''] - HTML content
     * @returns {HTMLElement} The created element
     */
    createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    /**
     * Utility method to fetch data from API
     * @param {string} url - The URL to fetch from
     * @param {Object} [options={}] - Fetch options
     * @returns {Promise<any>} The parsed JSON response
     * @throws {Error} If the request fails
     */
    async fetchData(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
}
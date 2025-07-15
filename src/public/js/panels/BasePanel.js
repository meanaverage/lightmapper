export class BasePanel {
    constructor(id, title, icon) {
        this.id = id;
        this.title = title;
        this.icon = icon;
        this.container = null;
        this.isInitialized = false;
    }

    init(container) {
        this.container = container;
        this.render();
        this.bindEvents();
        this.isInitialized = true;
    }

    render() {
        throw new Error('render() must be implemented by subclass');
    }

    bindEvents() {
        // Override in subclass if needed
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.onShow();
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.onHide();
        }
    }

    onShow() {
        // Override in subclass if needed
    }

    onHide() {
        // Override in subclass if needed
    }

    refresh() {
        // Override in subclass if needed
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isInitialized = false;
    }

    createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

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
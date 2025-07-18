// Main app initialization
const { createRoot } = ReactDOM;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
});
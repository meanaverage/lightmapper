// Top toolbar component
const Toolbar = ({ activeTool, onToolChange, activeView, onViewChange }) => {
    const quickTools = [
        { id: 'select', icon: 'fa-mouse-pointer', label: 'Select' },
        { id: 'room', icon: 'fa-vector-square', label: 'Room' },
        { id: 'wall', icon: 'fa-minus', label: 'Wall' },
        { id: 'door', icon: 'fa-door-open', label: 'Door' },
        { id: 'window', icon: 'fa-window-maximize', label: 'Window' }
    ];
    
    return (
        <div className="top-toolbar">
            {/* Quick access tools */}
            <div className="toolbar-group">
                {quickTools.map(tool => (
                    <button
                        key={tool.id}
                        className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => onToolChange(tool.id)}
                        title={tool.label}
                    >
                        <i className={`fas ${tool.icon}`}></i>
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>
            
            {/* Zoom controls would go here */}
            <div className="toolbar-group">
                <button className="tool-button" title="Zoom In">
                    <i className="fas fa-search-plus"></i>
                </button>
                <button className="tool-button" title="Zoom Out">
                    <i className="fas fa-search-minus"></i>
                </button>
                <button className="tool-button" title="Fit to Screen">
                    <i className="fas fa-expand"></i>
                </button>
            </div>
            
            {/* View toggle */}
            <div className="view-toggle">
                <button
                    className={`view-button ${activeView === '2D' ? 'active' : ''}`}
                    onClick={() => onViewChange('2D')}
                >
                    2D
                </button>
                <button
                    className={`view-button ${activeView === '3D' ? 'active' : ''}`}
                    onClick={() => onViewChange('3D')}
                >
                    3D
                </button>
            </div>
        </div>
    );
};
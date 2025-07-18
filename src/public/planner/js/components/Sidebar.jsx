// Sidebar component with icon navigation and tools panel
const Sidebar = ({ activeTab, onTabChange, activeTool, onToolChange }) => {
    const tabs = [
        { id: 'project', icon: 'fa-house', title: 'Project' },
        { id: 'build', icon: 'fa-hammer', title: 'Build' },
        { id: 'info', icon: 'fa-info-circle', title: 'Info' },
        { id: 'objects', icon: 'fa-cube', title: 'Objects' },
        { id: 'styles', icon: 'fa-palette', title: 'Styles' },
        { id: 'finishes', icon: 'fa-paint-roller', title: 'Finishes' },
        { id: 'export', icon: 'fa-download', title: 'Export' },
        { id: 'help', icon: 'fa-question-circle', title: 'Help' }
    ];
    
    const buildTools = [
        {
            category: 'Structure',
            tools: [
                { id: 'room', icon: 'fa-vector-square', label: 'Draw Room' },
                { id: 'wall', icon: 'fa-minus', label: 'Draw Wall' },
                { id: 'surface', icon: 'fa-draw-polygon', label: 'Draw Surface' }
            ]
        },
        {
            category: 'Openings',
            tools: [
                { id: 'door', icon: 'fa-door-open', label: 'Place Doors' },
                { id: 'window', icon: 'fa-window-maximize', label: 'Place Windows' }
            ]
        },
        {
            category: 'Structural',
            tools: [
                { id: 'column', icon: 'fa-monument', label: 'Place Column' },
                { id: 'beam', icon: 'fa-ruler-horizontal', label: 'Place Beam' }
            ]
        }
    ];
    
    return (
        <>
            {/* Icon sidebar */}
            <div className="icon-sidebar">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`sidebar-icon ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                        title={tab.title}
                    >
                        <i className={`fas ${tab.icon}`}></i>
                    </div>
                ))}
            </div>
            
            {/* Tools panel */}
            {activeTab === 'build' && (
                <div className="tools-panel">
                    <div className="tools-header">
                        <h2>Build</h2>
                    </div>
                    <div className="tools-content">
                        {buildTools.map(category => (
                            <div key={category.category} className="tool-category">
                                <div className="tool-category-title">{category.category}</div>
                                <div className="tool-list">
                                    {category.tools.map(tool => (
                                        <div
                                            key={tool.id}
                                            className={`tool-item ${activeTool === tool.id ? 'active' : ''}`}
                                            onClick={() => onToolChange(tool.id)}
                                        >
                                            <i className={`fas ${tool.icon}`}></i>
                                            <span>{tool.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Other panels would go here based on activeTab */}
        </>
    );
};
// Main App component
const App = () => {
    const [activeTool, setActiveTool] = React.useState('select');
    const [activeView, setActiveView] = React.useState('2D');
    const [showGrid, setShowGrid] = React.useState(true);
    const [sidebarTab, setSidebarTab] = React.useState('build');
    
    return (
        <div className="app-container">
            <Sidebar 
                activeTab={sidebarTab}
                onTabChange={setSidebarTab}
                activeTool={activeTool}
                onToolChange={setActiveTool}
            />
            
            <div className="main-content">
                <Toolbar 
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    activeView={activeView}
                    onViewChange={setActiveView}
                />
                
                <Canvas 
                    activeTool={activeTool}
                    showGrid={showGrid}
                    onGridToggle={setShowGrid}
                />
            </div>
        </div>
    );
};
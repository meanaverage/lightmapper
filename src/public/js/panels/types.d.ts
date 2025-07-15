// TypeScript type definitions for the Panel System

declare namespace PanelSystem {
    // Canvas Panel API
    interface CanvasPanel extends BasePanel {
        // Light Management
        getLights(): LightObject[];
        getAssignedEntities(): EntityData[];
        findLightByEntityId(entityId: string): LightObject | undefined;
        assignEntityToLight(light: LightObject, entityId: string): boolean;
        updateLightFromSceneSettings(entityId: string, settings: SceneSettings): void;
        
        // Canvas Control
        selectObject(object: fabric.Object): void;
        centerOnObject(object: fabric.Object): void;
        setTool(toolName: ToolName): void;
        toggleGrid(): void;
        toggleSnap(): void;
        clearCanvas(): void;
        
        // State Management
        getCanvasState(): CanvasState | null;
        loadLayout(layoutData: LayoutData, callback?: () => void): void;
        saveLayout(): LayoutData | null;
        
        // Display Modes
        setDisplayMode(showCurrentState: boolean): void;
        refreshLightStates(): void;
        
        // Network Labels
        showIPLabels(): void;
        showHostnameLabels(): void;
        showMACLabels(): void;
        clearNetworkLabels(): void;
        
        // Direct Access
        getCanvas(): fabric.Canvas | null;
        getEditor(): FloorplanEditor | null;
    }

    // Type Definitions
    interface LightObject extends fabric.Object {
        lightObject: boolean;
        entityId?: string;
        lightStyle?: string;
        radius?: number;
    }

    interface EntityData {
        entity_id: string;
        friendly_name?: string;
        state: 'on' | 'off' | string;
        attributes?: {
            brightness?: number;
            color_temp_kelvin?: number;
            rgb_color?: [number, number, number];
            hs_color?: [number, number];
            supported_features?: number;
        };
    }

    interface SceneSettings {
        brightness?: number;      // 0-100
        kelvin?: number;         // 2000-6500
        color?: {
            hue: number;         // 0-360
            saturation: number;  // 0-100
        };
    }

    interface CanvasState {
        objects: any[];
        viewport: number[];
        zoom: number;
    }

    interface LayoutData {
        version: string;
        timestamp: string;
        canvas: CanvasState;
        metadata?: Record<string, any>;
    }

    type ToolName = 'select' | 'light' | 'room' | 'line' | 'text';

    // Event Types
    interface PanelEvents {
        onObjectSelected: (data: { object: fabric.Object }) => void;
        onObjectDeselected: () => void;
        onLightModified: (data: { light: LightObject }) => void;
        onLightEntityAssigned: (data: { light: LightObject; entityId: string }) => void;
        onEntitySelected: (data: { entityId: string }) => void;
        onSceneSelected: (data: { scene: any }) => void;
    }

    // Panel Manager
    interface PanelManager {
        register(panel: BasePanel): void;
        init(): void;
        getPanel<T extends BasePanel>(panelId: string): T | undefined;
        showPanel(panelId: string): void;
        refreshPanel(panelId: string): void;
        refreshAllPanels(): void;
        broadcast<K extends keyof PanelEvents>(
            eventName: K, 
            data: Parameters<PanelEvents[K]>[0]
        ): void;
    }

    // Base Panel
    interface BasePanel {
        id: string;
        title: string;
        icon: string;
        container: HTMLElement | null;
        isInitialized: boolean;
        
        init(container: HTMLElement): void;
        render(): void;
        bindEvents(): void;
        show(): void;
        hide(): void;
        onShow(): void;
        onHide(): void;
        refresh(): void;
        destroy(): void;
    }
}

// Module declarations
declare module './panels/CanvasPanel.js' {
    export class CanvasPanel implements PanelSystem.CanvasPanel {}
}

declare module './panels/PanelManager.js' {
    export class PanelManager implements PanelSystem.PanelManager {}
}

// Global declarations
declare global {
    interface Window {
        panelManager: PanelSystem.PanelManager;
        floorplanEditor: any;
        sceneManager: any;
        lightEntities: Record<string, PanelSystem.EntityData>;
        API_BASE: string;
    }
}
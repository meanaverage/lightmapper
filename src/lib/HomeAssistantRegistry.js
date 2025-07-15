/**
 * Home Assistant Registry Access
 * 
 * This module provides direct access to Home Assistant's internal registries
 * for better entity, device, and area information.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class HomeAssistantRegistry {
    constructor(configPath = '/config') {
        this.configPath = configPath;
        this.coreConfigPath = path.join(configPath, '.storage');
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        
        console.log('🏠 HomeAssistantRegistry initialized');
        console.log('  Config path:', this.configPath);
        console.log('  Storage path:', this.coreConfigPath);
    }
    
    /**
     * Get cached data or return null if expired
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }
    
    /**
     * Set cached data with timestamp
     */
    setCached(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Read Home Assistant storage file
     */
    async readStorageFile(filename) {
        const cacheKey = `storage_${filename}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        try {
            const filePath = path.join(this.coreConfigPath, filename);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Storage file not found: ${filePath}`);
                return null;
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`❌ Error reading storage file ${filename}:`, error.message);
            return null;
        }
    }
    
    /**
     * Get entity registry data
     */
    async getEntityRegistry() {
        console.log('📋 Fetching entity registry...');
        
        const cached = this.getCached('entity_registry');
        if (cached) return cached;
        
        try {
            const data = await this.readStorageFile('core.entity_registry');
            if (!data || !data.data || !data.data.entities) {
                console.warn('⚠️ No entity registry data found');
                return [];
            }
            
            const entities = data.data.entities;
            console.log(`✅ Loaded ${entities.length} entities from registry`);
            
            this.setCached('entity_registry', entities);
            return entities;
        } catch (error) {
            console.error('❌ Error loading entity registry:', error.message);
            return [];
        }
    }
    
    /**
     * Get device registry data
     */
    async getDeviceRegistry() {
        console.log('🔧 Fetching device registry...');
        
        const cached = this.getCached('device_registry');
        if (cached) return cached;
        
        try {
            const data = await this.readStorageFile('core.device_registry');
            if (!data || !data.data || !data.data.devices) {
                console.warn('⚠️ No device registry data found');
                return [];
            }
            
            const devices = data.data.devices;
            console.log(`✅ Loaded ${devices.length} devices from registry`);
            
            this.setCached('device_registry', devices);
            return devices;
        } catch (error) {
            console.error('❌ Error loading device registry:', error.message);
            return [];
        }
    }
    
    /**
     * Get area registry data
     */
    async getAreaRegistry() {
        console.log('🏠 Fetching area registry...');
        
        const cached = this.getCached('area_registry');
        if (cached) return cached;
        
        try {
            const data = await this.readStorageFile('core.area_registry');
            if (!data || !data.data || !data.data.areas) {
                console.warn('⚠️ No area registry data found');
                return [];
            }
            
            const areas = data.data.areas;
            console.log(`✅ Loaded ${areas.length} areas from registry`);
            
            this.setCached('area_registry', areas);
            return areas;
        } catch (error) {
            console.error('❌ Error loading area registry:', error.message);
            return [];
        }
    }
    
    /**
     * Get enhanced light entities with full metadata
     */
    async getLightEntitiesWithMetadata() {
        console.log('💡 Fetching enhanced light entities...');
        
        const cached = this.getCached('enhanced_lights');
        if (cached) return cached;
        
        try {
            const [entities, devices, areas] = await Promise.all([
                this.getEntityRegistry(),
                this.getDeviceRegistry(),
                this.getAreaRegistry()
            ]);
            
            // Create lookup maps
            const deviceMap = new Map(devices.map(d => [d.id, d]));
            const areaMap = new Map(areas.map(a => [a.id, a]));
            
            // Filter and enhance light entities
            const lightEntities = entities
                .filter(entity => entity.entity_id.startsWith('light.'))
                .map(entity => {
                    const device = entity.device_id ? deviceMap.get(entity.device_id) : null;
                    const area = entity.area_id ? areaMap.get(entity.area_id) : 
                                (device && device.area_id ? areaMap.get(device.area_id) : null);
                    
                    return {
                        entity_id: entity.entity_id,
                        original_name: entity.original_name,
                        name: entity.name,
                        unique_id: entity.unique_id,
                        platform: entity.platform,
                        device_id: entity.device_id,
                        area_id: entity.area_id,
                        disabled: entity.disabled_by !== null,
                        hidden: entity.hidden_by !== null,
                        device: device ? {
                            id: device.id,
                            name: device.name,
                            manufacturer: device.manufacturer,
                            model: device.model,
                            sw_version: device.sw_version,
                            via_device_id: device.via_device_id,
                            area_id: device.area_id
                        } : null,
                        area: area ? {
                            id: area.id,
                            name: area.name,
                            normalized_name: area.normalized_name
                        } : null
                    };
                });
            
            console.log(`✅ Enhanced ${lightEntities.length} light entities with metadata`);
            
            this.setCached('enhanced_lights', lightEntities);
            return lightEntities;
        } catch (error) {
            console.error('❌ Error loading enhanced light entities:', error.message);
            return [];
        }
    }
    
    /**
     * Get entity by ID with full metadata
     */
    async getEntityById(entityId) {
        const entities = await this.getLightEntitiesWithMetadata();
        return entities.find(entity => entity.entity_id === entityId);
    }
    
    /**
     * Get entities by area
     */
    async getEntitiesByArea(areaId) {
        const entities = await this.getLightEntitiesWithMetadata();
        return entities.filter(entity => entity.area_id === areaId || entity.area?.id === areaId);
    }
    
    /**
     * Get entities by device
     */
    async getEntitiesByDevice(deviceId) {
        const entities = await this.getLightEntitiesWithMetadata();
        return entities.filter(entity => entity.device_id === deviceId);
    }
    
    /**
     * Search entities by name or ID
     */
    async searchEntities(query) {
        const entities = await this.getLightEntitiesWithMetadata();
        const lowerQuery = query.toLowerCase();
        
        return entities.filter(entity => 
            entity.entity_id.toLowerCase().includes(lowerQuery) ||
            entity.name?.toLowerCase().includes(lowerQuery) ||
            entity.original_name?.toLowerCase().includes(lowerQuery) ||
            entity.area?.name?.toLowerCase().includes(lowerQuery)
        );
    }
    
    /**
     * Get statistics about the registry
     */
    async getRegistryStats() {
        const [entities, devices, areas] = await Promise.all([
            this.getEntityRegistry(),
            this.getDeviceRegistry(),
            this.getAreaRegistry()
        ]);
        
        const lightEntities = entities.filter(e => e.entity_id.startsWith('light.'));
        const enabledLights = lightEntities.filter(e => e.disabled_by === null);
        const hiddenLights = lightEntities.filter(e => e.hidden_by !== null);
        
        return {
            total_entities: entities.length,
            total_devices: devices.length,
            total_areas: areas.length,
            light_entities: {
                total: lightEntities.length,
                enabled: enabledLights.length,
                disabled: lightEntities.length - enabledLights.length,
                hidden: hiddenLights.length
            },
            cache_stats: {
                cache_size: this.cache.size,
                cache_ttl: this.cacheTTL
            }
        };
    }
    
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Registry cache cleared');
    }
    
    /**
     * Check if Home Assistant config directory is accessible
     */
    isConfigAccessible() {
        try {
            return fs.existsSync(this.configPath) && fs.existsSync(this.coreConfigPath);
        } catch (error) {
            return false;
        }
    }
}

module.exports = HomeAssistantRegistry;
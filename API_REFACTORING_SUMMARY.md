# API Endpoint Refactoring Summary

## Overview
All LightMapper-specific endpoints have been moved from `/api/*` to `/api/internal/*`, while Home Assistant proxy endpoints remain at `/api/*`.

## Server-side Changes (server.js)

### Internal Endpoints (moved to /api/internal/*)
- `/api/scenes` → `/api/internal/scenes` (GET, POST)
- `/api/scenes/:id` → `/api/internal/scenes/:id` (GET, PUT, DELETE)
- `/api/scenes/:id/apply` → `/api/internal/scenes/:id/apply` (POST)
- `/api/mappings` → `/api/internal/mappings` (GET, POST)
- `/api/floorplan` → `/api/internal/floorplan` (GET, POST)
- `/api/config` → `/api/internal/config` (GET)
- `/api/layers/:layerId/bring-to-front` → `/api/internal/layers/:layerId/bring-to-front` (POST)
- `/api/layers/:layerId/send-to-back` → `/api/internal/layers/:layerId/send-to-back` (POST)
- `/api/layers/:layerId/bring-forward` → `/api/internal/layers/:layerId/bring-forward` (POST)
- `/api/layers/:layerId/send-backward` → `/api/internal/layers/:layerId/send-backward` (POST)

### HA Proxy Endpoints (remain at /api/*)
- `/api/lights` (GET) - Proxies to Home Assistant for light entities
- `/api/areas` (GET) - Proxies to Home Assistant for area information

## Client-side Changes

### Updated Files
1. **app.js** - Updated all fetch calls for:
   - `/api/config` → `/api/internal/config`
   - `/api/scenes` → `/api/internal/scenes`
   - `/api/mappings` → `/api/internal/mappings`
   - Scene CRUD operations

2. **panels/ScenesPanel.js** - Updated all fetch calls for:
   - Scene list loading
   - Scene CRUD operations
   - Scene application

3. **panels/SceneEditorPanel.js** - Updated all fetch calls for:
   - Scene saving (POST/PUT)
   - Scene deletion

4. **panels/LayersPanel.js** - Updated all fetch calls for:
   - Layer ordering operations

### Files NOT Changed (correctly using HA proxy endpoints)
- **WebSocketClient.js** - Uses `/api/lights` (HA proxy)
- **panels/LiveStatePanel.js** - Uses `/api/lights` (HA proxy)
- **panels/EntitiesPanel.js** - Uses `/api/lights` (HA proxy)

## Testing Checklist
- [ ] Test scene creation, loading, updating, and deletion
- [ ] Test scene application to lights
- [ ] Test light entity loading from Home Assistant
- [ ] Test area loading from Home Assistant
- [ ] Test layer operations (if used)
- [ ] Test configuration loading
- [ ] Test light mappings (if used)
- [ ] Test floorplan saving/loading (if used)
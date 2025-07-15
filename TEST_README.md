# LightMapper API Test Suite

## Overview
This test suite verifies that all documented API endpoints are working correctly.

## Running Tests

### Quick Start
```bash
# From the lightmapper directory
npm test

# Or run directly
node test-api.js
```

### Configuration
The test suite can be configured using environment variables:

- `API_BASE_URL` - The base URL of the API (default: `http://localhost:3000`)
- `API_KEY` - The API key for authenticated endpoints (default: `test-api-key`)

### Examples
```bash
# Test against local development server
npm test

# Test against production server
API_BASE_URL=http://homeassistant.local:8123/api/hassio_ingress/YOUR_TOKEN npm test

# Test with specific API key
API_KEY=your-actual-key npm test
```

## Test Coverage

The test suite covers all 25 documented API endpoints:

### ✅ System Endpoints
- `GET /health` - Health check

### ✅ Scene Management
- `GET /api/internal/scenes` - List all scenes
- `POST /api/internal/scenes` - Create new scene
- `GET /api/internal/scenes/:id` - Get specific scene
- `PUT /api/internal/scenes/:id` - Update scene
- `DELETE /api/internal/scenes/:id` - Delete scene
- `POST /api/internal/scenes/:id/apply` - Apply scene

### ✅ Configuration
- `GET /api/internal/config` - Get configuration
- `GET /api/internal/mappings` - Get entity mappings
- `POST /api/internal/mappings` - Update mappings

### ✅ Floorplan
- `GET /api/internal/floorplan` - Get floorplan layout
- `POST /api/internal/floorplan` - Save floorplan

### ✅ Floorplan Lights
- `GET /api/internal/floorplan/lights` - Get all lights with positions
- `POST /api/internal/floorplan/lights` - Add light to floorplan
- `GET /api/internal/floorplan/lights/:entityId` - Get specific light
- `PUT /api/internal/floorplan/lights/:entityId` - Update light position
- `DELETE /api/internal/floorplan/lights/:entityId` - Remove light
- `POST /api/internal/floorplan/lights/:entityId/highlight` - Highlight light

### ✅ Layer Operations
- `POST /api/internal/layers/:layerId/bring-to-front`
- `POST /api/internal/layers/:layerId/send-to-back`
- `POST /api/internal/layers/:layerId/bring-forward`
- `POST /api/internal/layers/:layerId/send-backward`

### ✅ Home Assistant Proxy
- `GET /api/lights` - Get lights from HA
- `GET /api/areas` - Get areas from HA

## Understanding Results

- **✓ PASSED** - Endpoint responded correctly
- **✗ FAILED** - Endpoint failed or returned unexpected response
- Tests verify:
  - Correct HTTP status codes
  - Response structure
  - Required fields
  - Basic CRUD operations

## Notes

1. **Authentication**: Most `/api/internal/*` endpoints require API key authentication
2. **Home Assistant**: The `/api/lights` and `/api/areas` endpoints may fail if Home Assistant is not configured
3. **WebSocket Tests**: WebSocket functionality is not tested by this suite
4. **Database State**: Tests create and delete test data, but assume a working database

## Future Improvements

- Add WebSocket testing
- Add performance benchmarks
- Add negative test cases (invalid data, missing auth)
- Add integration tests with real Home Assistant
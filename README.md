# LightMapper

A powerful Home Assistant add-on for managing complex lighting scenes with grid-based selection, individual light control, and beautiful web interface.

## Features

**CAD Canvas** - Custom FabricJS 6 CAD canvas for 2D visual representation and BlueprintJS for 3D previews
**Light Visualization** - Real-time RGB/hex color previews, brightness, and state direct in real time through WS
**Design, Store, and Playback Scenesk** - Reliable scene storage with full CRUD operations to develop scenes visually  
**Real-time Updates** - Live light status and state capture  
**Light Mapping** - Map entities to their locations in your home with support for custom labeling with help from the Unifi integration
**Modern Web Interface** - Built on Fabric JS 6, BlueprintJS, and probably eventually Lit for HA native theme support.

## Installation

### Add-on Store (Recommended)

1. **Add Repository**: In Home Assistant, go to **Supervisor** → **Add-on Store** → **⋮** → **Repositories** and add:
   ```
   https://github.com/meanaverage/lightmapper
   ```
   
2. **Install Add-on**: Find "LightMapper" in the store and click **Install**

3. **Configure**: Set your preferences in the **Configuration** tab

4. **Start**: Click **Start** and optionally (at your own risk) enable **Auto-start**

## Configuration

### Add-on Options

```yaml
log_level: info              # Logging level (trace|debug|info|notice|warning|error|fatal)
grid_size: 8                 # Number of light positions in grid (4-12)
default_brightness: 100      # Default brightness percentage (0-100)
default_color_temp: 3000     # Default color temperature in Kelvin (2000-6500)
default_hue: 60             # Default hue in degrees (0-360)
default_saturation: 100     # Default saturation percentage (0-100)
```

### Example Configuration

```yaml
log_level: info
grid_size: 8
default_brightness: 80
default_color_temp: 2700
default_hue: 30
default_saturation: 85
```

### Advanced Features

#### Capture Current State
- Click **📷 Capture Current State** to automatically select all currently-on lights in your plan and capture their settings

#### Individual Light Control
- Toggle **Individual Light Control** to customize each light separately
- Adjust brightness, color temperature, hue, and saturation per light
- Real-time color previews help indicate scene settings

## Database

The add-on uses SQLite for reliable data storage:

- **Location**: `/data/scenes.db` (persisted across restarts)
- **Tables**: `scenes`, `scene_lights`, `light_mappings`, `settings`
- **Automatic Backups**: Database is automatically backed up with Home Assistant snapshots

## API Endpoints

The add-on exposes a REST API for integration:

## Home Assistant Integration

### Required Light Entities

The add-on works with any Home Assistant light entities that support:
- `light.turn_on` / `light.turn_off` services
- `brightness` attribute (0-255)
- `color_temp_kelvin` attribute (Kelvin color temperature)
- `hs_color` attribute (Hue/Saturation array)

### Supervisor Token

The add-on automatically uses the Home Assistant Supervisor token for API access. No manual token configuration required.

## Troubleshooting

### Debug Mode

Enable debug logging for detailed troubleshooting:

```yaml
log_level: debug
```

View logs in: **Supervisor** → **Add-ons** → **LightMapper** → **Log**

### Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ha-lightmapper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ha-lightmapper/discussions)
- **Home Assistant Community**: [Forum Thread](https://community.home-assistant.io/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Home Assistant Team** - For the amazing home automation platform
- **Community Contributors** - For testing and feedback
- **MDI Icons** - For beautiful Material Design icons

---

**Made with ❤️ for the Home Assistant community** 

# Compact UI Implementation Guide

## Overview
This guide shows how to implement the clean, horizontal UI style similar to the reference design.

## Key Features of the New Compact Style

### 1. Settings Panel
- Floating gear icon in bottom-left corner
- Horizontal layout with inline controls
- Clean, minimal design with 11px font size
- Units and scale controls match the reference exactly

### 2. CSS Classes

#### Core Components:
- `.settings-panel` - Main floating panel
- `.inline-controls` - Horizontal control container
- `.inline-label` - Small labels (11px)
- `.inline-input` - Compact input fields
- `.inline-select` - Styled dropdowns
- `.compact-btn` - Small buttons with icons
- `.icon-btn` - Icon-only buttons

#### Layout Helpers:
- `.settings-spacer` - Vertical divider
- `.btn-group-horizontal` - Grouped buttons
- `.toggle-switch` - iOS-style toggles

### 3. Implementation Examples

#### Basic Settings Panel
```javascript
import { SettingsPanel } from './js/panels/SettingsPanel.js';
const settings = new SettingsPanel();
```

#### Compact Property Panel
```javascript
// Update existing PropertiesPanel to use compact styles
<div class="compact-property-row">
    <label class="compact-property-label">Width:</label>
    <div class="compact-property-value">
        <input type="number" class="inline-input" value="12.5">
        <span class="inline-label">ft</span>
    </div>
</div>
```

#### Inline Controls
```javascript
const controls = this.createInlineControls([
    {
        type: 'select',
        label: 'Units:',
        options: [
            { value: 'ft', label: 'ft' },
            { value: 'm', label: 'm' }
        ]
    },
    { type: 'spacer' },
    {
        type: 'input',
        label: 'Scale:',
        value: '3'
    }
]);
```

## Files Created/Modified

1. **New Files:**
   - `/css/settings-panel.css` - All compact UI styles
   - `/js/panels/SettingsPanel.js` - Settings panel component
   - `/js/panels/CompactLayersPanel.js` - Example compact panel
   - `/settings-demo.html` - Live demo of components

2. **Modified Files:**
   - `/js/panels/PropertiesPanel.js` - Updated to use compact styles
   - `/index.html` - Added settings-panel.css

## Usage

### To see the demo:
Open `http://localhost:3000/settings-demo.html`

### To add the floating settings panel:
```javascript
// In your main app initialization
import { SettingsPanel } from './js/panels/SettingsPanel.js';
window.settingsPanel = new SettingsPanel();
```

### To convert existing panels:
1. Extend `CompactPanel` instead of `BasePanel`
2. Use `compact-property-row` for property layouts
3. Apply `inline-input` and `inline-select` classes
4. Use `createInlineControls()` for horizontal controls

## Styling Guide

### Colors (CSS Variables):
- Background: `#262626` (dark) / `#fff` (light)
- Border: `#3a3a3a` (dark) / `#d0d0d0` (light)
- Text: `#e0e0e0` (dark) / `#282c33` (light)
- Accent: `#4a9eff`

### Spacing:
- Compact row height: 24px
- Input height: 24px
- Font size: 11px (labels), 12px (buttons)
- Gap between controls: 8px

### Responsive:
The compact style maintains usability on smaller screens while maximizing space efficiency.
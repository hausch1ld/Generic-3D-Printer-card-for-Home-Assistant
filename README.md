# Universal 3D Printer Card for Home Assistant

A configurable Lovelace dashboard card for 3D printers. It combines a printer view with a model overlay, switchable live camera, multi-filament display, print progress, freely selected information, metrics and printer controls.

The card does not hardcode Anycubic or other manufacturer-specific entity names. All entities, images, labels and actions are configured in YAML.

<p align="center">
<img width="20%" height="748" alt="Bildschirmfoto 2026-08-08 um 18 48 12" src="https://github.com/user-attachments/assets/ccec5c97-fc1a-4061-87d2-ea7bf9e13a9d" />
<img width="20%" height="599" alt="Bildschirmfoto 2026-08-08 um 18 47 48" src="https://github.com/user-attachments/assets/7b4ea512-93ee-4c58-ac5a-f0938e9c54cf"/>
<img width="20%" <img width="526" height="789" alt="Bildschirmfoto 2026-08-08 um 18 45 41" src="https://github.com/user-attachments/assets/e50f75c4-3ac1-43f1-a485-3029f1143881" />
<img width="20%" height="818" alt="Bildschirmfoto 2026-08-08 um 18 49 32" src="https://github.com/user-attachments/assets/76840c14-372c-4347-a30e-8f887504ef82" />

</p>

## Features

- Full-width printer image with a dynamic model-image overlay
- Tap the printer area to switch between printer and live-camera views
- Visual dashboard editor; YAML is optional
- Independently switchable header and five content sections
- ACE/AMS area with up to five automatically centered spool images
- Filename, progress and up to four freely configurable information entities
- Up to four large metric buttons with a sensor value and a clickable secondary entity
- Clickable metric fields that open the target entity's Home Assistant dialog
- Small action buttons for `button`, `switch` and `light` entities
- Per-button labels and icon overrides
- Normal and compact layouts
- Image path fields plus Home Assistant's native image upload/media picker
- Automatic English/German editor localization
- Tabbed visual editor that keeps its active position while values are changed
- Home Assistant entity display precision for sensor and information values
- Model image size slider from 1% to 100%
- Optional themed/custom progress color and background gradients
- Clickable status and information values
- Stable display for missing, `unknown` and `unavailable` entities
- Responsive design using the active Home Assistant theme in light and dark mode

## Installation with HACS

This repository can be installed as a HACS custom repository:

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu in the top-right corner and choose **Custom repositories**.
3. Enter:
   `https://github.com/hausch1ld/Universal-3D-Printer-card-for-Home-Assistant`
4. Select **Dashboard** as the category and click **Add**.
5. Open **Universal 3D Printer Card**, click **Download**, and reload the browser when installation is complete.

HACS should add the JavaScript resource automatically. If it does not, open **Settings → Dashboards → Resources** and add:

```text
/hacsfiles/Universal-3D-Printer-card-for-Home-Assistant/3d-printer-card.js
```

Select **JavaScript module** as the resource type.

## Manual installation

1. Copy `dist/3d-printer-card.js` to `/config/www/3d-printer-card/3d-printer-card.js`.
2. In **Settings → Dashboards → Resources**, add `/local/3d-printer-card/3d-printer-card.js` as a **JavaScript module**.
3. Reload the browser completely.

The resource URL can stay unchanged on future updates. Replace the file and perform a hard refresh (`Cmd+Shift+R` on macOS or `Ctrl+F5` on Windows).

## Add the card

Add a **Manual** card to a dashboard and start with:

```yaml
type: custom:three-d-printer-card
name: My 3D Printer
printer_image: /local/3d-printer-card/printer.png
model_image_entity: image.printer_current_model
camera_entity: camera.printer
status_entity: sensor.printer_status
filename_entity: sensor.printer_filename
progress_entity: sensor.printer_progress
infos:
  - label: Layer
    entity: sensor.printer_current_layer
  - label: Remaining
    entity: sensor.printer_remaining_time
```

After adding the card, use Home Assistant's regular dashboard editor to configure it. The header can be switched independently, and the editor provides tabs for:

1. **Filaments**
2. **3D Printer**
3. **Progress bar and information**
4. **Large button bar**
5. **Small button bar**

Every image control includes a plain path/URL field and Home Assistant's native image upload/media picker. Uploaded images are converted into a directly usable `/api/image/serve/...` path. The full configuration remains available in YAML for advanced use.

The editor and built-in default labels use German when Home Assistant's configured language starts with `de`. English is used for all other languages. User-defined labels are never translated.

> The Lovelace type is `custom:three-d-printer-card`. Web Component names cannot begin with a number, so `custom:3d-printer-card` is not valid. The JavaScript filename remains `3d-printer-card.js`.

See [`example.yaml`](example.yaml) for a complete configuration with ACE/AMS, metrics and actions.

## Configuration

### Main view

| Option | Description |
|---|---|
| `name`, `subtitle` | Card title and optional subtitle |
| `printer_image` | Image URL, `/local/...` path or image entity |
| `model_image_entity` | Current model image entity |
| `model_image` | Static model image fallback |
| `model_size` | Model image size from `1` to `100` percent; the legacy `small`, `medium` and `large` values remain supported |
| `camera_entity` | Camera entity used for the live view |
| `default_view` | Set to `camera` to start in camera view |
| `status_entity` | Printer status |
| `filename_entity` | Print job or filename |
| `progress_entity` | Progress from 0 to 100 |
| `infos` | Up to four entries containing a freely selectable `entity` and `label` |
| `sections` | Switches `header` and the five content sections on or off |
| `design` | `normal` or `compact` |
| `printer_background_color` | Background color behind the printer/model |
| `printer_use_gradient` | Enables the radial printer-area gradient; defaults to `true` |
| `printer_height` | Printer area height in pixels; compact mode displays it 30% shorter |
| `progress_color` | Optional progress bar color; defaults to the active Home Assistant accent color |

Tapping the printer/model area switches to the live camera and back. Without `camera_entity`, the view remains unchanged.

### ACE/AMS and images

`ace.spools` supports up to five entries. Spools are centered automatically and remain symmetrical for every item count. Set `entity` to a sensor whose state is the filament label and whose `entity_picture` attribute contains the spool image. An explicit `label` overrides the state. The older `image_entity` option remains supported. A static `image` can also be selected or uploaded for each spool.

`ace.image` adds an optional background image, while `ace.background_color` defines a plain fallback/background color. `ace.use_gradient` enables the same radial gradient used by the printer area and defaults to `true`. Use `ace.title_alignment` with `left`, `center` or `right` to align the section title.

Leave `ace.label` empty to hide the Multi-Filament title completely. No automatic `ACE / AMS` fallback title is added.

Transparent model images work best for the model overlay. Printer and ACE images are not bundled, so you can use assets matching your own hardware.

### Large button bar

Configure up to four entries under `large_buttons` with:

- `entity`: the main sensor shown as the large value
- optional `secondary_entity`: any entity shown below and opened on click
- optional `label`, `icon` and `unit`
- optional `secondary_label` and `secondary_unit`

Without an explicit unit, the entity's `unit_of_measurement` is used. If `secondary_entity` is set, clicking the metric opens that entity's Home Assistant more-info dialog. Existing `metrics.nozzle`, `metrics.bed` and `metrics.fan` configurations from version 0.2.x remain supported.

In normal mode, a configured label replaces the icon; with an empty label only the icon is shown. Compact mode always shows the icon to the left of the large value and keeps the secondary value below.

### Small button bar

Each entry under `small_buttons` accepts a `button`, `switch` or `light` entity plus optional `label` and `icon`. A `button` entity is pressed; a `switch` or `light` entity is toggled. A configured icon overrides the entity's icon.

Set `small_button_layout` to `vertical` for the icon above the label, `horizontal` for the icon to its left, or `text-only` to hide icons in the normal layout. Compact mode remains icon-only by design.

The compact design places up to four small action buttons in a centered vertical overlay on the right side of the printer image, together with the camera/model toggle. All five controls use identical square dimensions and omit their text labels. Existing `actions` configurations from version 0.2.x remain operational for backward compatibility.

### Compact design

Set `design: compact` in YAML or select **Compact** in the editor. The printer area becomes 30% shorter. Up to five filament spools move into a vertically centered translucent overlay on its left side, while the action controls are centered on the right. The configured Multi-Filament background image and color are intentionally ignored in this layout. The large metric buttons use a shorter horizontal icon/value layout. Images continue to use `object-fit: contain`, preserving their aspect ratio.

The model image size is adjustable from 1% to 100%. Existing configurations using `small`, `medium` or `large` are interpreted as 30%, 65% and 100%. The image keeps its aspect ratio with `object-fit: contain`.

Numeric entity values are formatted through Home Assistant itself. This means the card follows the display precision configured in the entity settings, including locale-specific decimal separators.

The outer card does not override Home Assistant's `ha-card` background, so it follows the active light, dark or custom theme exactly.

Unconfigured sections and buttons are hidden. Missing, `unknown` and `unavailable` values display as `—`.

## Version

Current build: **0.6.0**

This card has been tested with [hass-anycubic](https://github.com/Nino6689/hass-anycubic) by [@Nino6689](https://github.com/Nino6689), but is designed to work with any integration that exposes suitable Home Assistant entities.

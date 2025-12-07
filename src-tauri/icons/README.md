# App Icons

Place application icons in this directory.

## Required Files

Tauri requires the following icon formats:

| File | Purpose | Platforms |
|------|---------|-----------|
| `icon.icns` | macOS app icon | macOS |
| `icon.ico` | Windows app icon | Windows |
| `32x32.png` | Small icon | Linux, tray |
| `128x128.png` | Medium icon | Linux |
| `128x128@2x.png` | Retina medium | macOS |
| `icon.png` | Source icon (1024x1024 recommended) | All |

## Generating Icons

You can use the Tauri CLI to generate all required formats from a single source icon:

```bash
# Install icon generator (if needed)
pnpm add -D @tauri-apps/cli

# Generate from source PNG (1024x1024 recommended)
pnpm tauri icon path/to/source-icon.png
```

This will generate all required icon formats automatically.

## Placeholder Icons

If no icons are provided, Tauri will use default placeholder icons.

For a production release, replace these with proper branded icons.

## Icon Design Guidelines

- **Size:** Start with 1024x1024px for best quality
- **Format:** PNG with transparency
- **Content:** Keep important content in center (safe area)
- **Style:** Simple, clear, recognizable at small sizes
- **Colors:** High contrast, avoid thin lines
- **Background:** Transparent or solid color

# Electron App Icons

This directory contains the icons used by the Electron app.

## Icon Files

- `icon.svg` - Source SVG for the app icon
- `tray-icon.svg` - Source SVG for the system tray icon
- `icon.png` - PNG version of the app icon (512x512)
- `icon.icns` - macOS icon file
- `icon.ico` - Windows icon file

## PNG Directory

The `png` directory contains various sizes of the app icon for different platforms:

- `16x16.png` - 16x16 icon for Windows
- `32x32.png` - 32x32 icon for Windows
- `64x64.png` - 64x64 icon for Windows
- `128x128.png` - 128x128 icon for macOS
- `256x256.png` - 256x256 icon for macOS
- `512x512.png` - 512x512 icon for macOS

## Icon Generation

To generate the icon files from the SVG source, you can use the following tools:

- For macOS: `iconutil` or online converters
- For Windows: `png2ico` or online converters
- For Linux: PNG files are sufficient

## Usage

These icons are referenced in the Electron app configuration in `main.js` and `package.json`.

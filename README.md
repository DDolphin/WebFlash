# 🔧 NXP USB ISP Programming Tool

A modern web-based In-System Programming (ISP) tool for NXP LPC55S28 microcontrollers using WebHID API. This tool provides a fast, reliable, and user-friendly interface for flash programming directly from your web browser.

## 🌐 Online Access

<div align="center">

### 🚀 **[LAUNCH TOOL](https://ddolphin.github.io/WebFlash/webhid_connector_separated.html)** 🚀

**No installation required!** Works directly in your browser.

[![Launch Tool](https://img.shields.io/badge/🔧_Launch_Tool-Online-brightgreen?style=for-the-badge)](https://ddolphin.github.io/WebFlash/webhid_connector_separated.html)

</div>

> Compatible with Chrome, Edge, and Opera browsers. Simply connect your NXP device and start programming!

## ✨ Features

### 🚀 High-Performance Programming
- **Ultra-fast flash programming** with optimized packet sizes (up to 4KB chunks)
- **Smart retry mechanism** for robust communication
- **Zero-delay transfers** for maximum speed
- **Intelligent logging control** to prevent performance bottlenecks

### 🔌 Smart Device Management
- **Auto-detection** of LPC55S28 devices on page load
- **Automatic USB device selection** (VID: 0x1FC9)
- **Connection state validation** before programming
- **Real-time device diagnostics** and property reading

### 📁 Advanced File Management
- **Path memory system** for continuous programming
- **Smart file reloading** without re-selection
- **Support for multiple formats**: .bin, .hex, .elf
- **File validation** and size checking
- **Complete path tracking** for better workflow

### 🎯 Professional Interface
- **Always-visible progress tracking** with real-time status
- **Modern responsive design** with intuitive controls
- **Comprehensive error handling** and user guidance
- **Optional operation logging** with performance optimization

## 🛠️ Supported Operations

| Operation | Description | Status |
|-----------|-------------|--------|
| **Flash Erase** | Complete flash memory erase | ✅ |
| **Flash Programming** | Binary file programming with verification | ✅ |
| **Device Reset** | Automatic device reset after programming | ✅ |
| **Device Diagnostics** | Comprehensive device info and property reading | ✅ |
| **Command Analysis** | ISP command compatibility checking | ✅ |

## 🔧 Requirements

### Browser Compatibility
- **Chrome/Chromium** 89+ (Recommended)
- **Edge** 89+
- **Opera** 75+

> **Note**: Firefox and Safari are not supported due to WebHID API limitations.

### Hardware Requirements
- **NXP LPC55S28** microcontroller
- **USB connection** for ISP communication
- **Device in ISP mode** (bootloader mode)

## 🚀 Quick Start

### 1. Setup Device
1. Connect your LPC55S28 device via USB
2. Ensure device is in ISP/bootloader mode
3. Verify device appears in system (VID: 0x1FC9)

### 2. Open Tool
**Option A: Online (Recommended)**
1. Visit: [https://ddolphin.github.io/WebFlash/webhid_connector_separated.html](https://ddolphin.github.io/WebFlash/webhid_connector_separated.html)
2. The tool will auto-detect and connect to your device
3. Grant USB device permissions when prompted

**Option B: Local**
1. Download and open `webhid_connector_separated.html` in a supported browser
2. The tool will auto-detect and connect to your device
3. Grant USB device permissions when prompted

### 3. Program Device
1. **Select File**: Click "📁 Browse" or enter file path
2. **Verify Connection**: Ensure device shows as connected
3. **Start Programming**: Click "🚀 Start Programming"
4. **Monitor Progress**: Watch real-time progress and status

### 4. Continuous Programming
- Once a file is selected, subsequent programming sessions will automatically reuse the same file
- The tool remembers file paths for seamless workflow
- Simply click "🚀 Start Programming" for repeated flashing

## 📋 Interface Guide

### Main Controls
- **🔌 Connect NXP Device**: Manual device connection/reconnection
- **🔍 Full Device Diagnostic**: Complete device analysis and testing
- **🗑️ Erase Flash**: Erase entire flash memory
- **🚀 Start Programming**: Begin flash programming process
- **🔄 Reset Device**: Reset device after programming

### File Management
- **📂 Binary File Path**: File path input with memory
- **📁 Browse**: File selection dialog
- **Progress Bar**: Real-time programming progress
- **📝 Operation Log**: Detailed operation logging (optional)

### Status Panels
- **📊 Device Status & Properties**: Device information and capabilities
- **📝 Operation Log**: Detailed operation history and diagnostics

## ⚡ Performance Optimization

### Speed Features
- **Dynamic packet size detection** (16B to 4KB)
- **Optimized chunk transfers** with minimal delays
- **Bulk operation logging suspension** during programming
- **Smart retry mechanisms** with exponential backoff

### Typical Performance
- **Small files (10KB)**: ~1-2 seconds
- **Medium files (100KB)**: ~5-10 seconds
- **Large files (512KB)**: ~20-30 seconds

## 🔒 Security & Safety

### Built-in Protections
- **File size validation** (max 512KB for LPC55S28)
- **File format verification** (.bin, .hex, .elf)
- **Device connection validation** before operations
- **Error recovery** with detailed diagnostics
- **Safe defaults** for all operations

### Browser Security
- All operations use secure WebHID API
- No file system access beyond selected files
- User permission required for device access
- Sandboxed execution environment

## 🛠️ Troubleshooting

### Common Issues

#### Device Not Detected
- **Solution**: Ensure device is in ISP mode and USB cable is connected
- **Check**: Windows Device Manager for VID:0x1FC9 device
- **Try**: Different USB port or cable

#### Programming Fails
- **Solution**: Check file format and size (max 512KB)
- **Try**: Enable operation logging for detailed diagnostics
- **Check**: Device connection stability

#### Browser Compatibility
- **Use**: Chrome, Edge, or Opera browsers
- **Enable**: Hardware acceleration in browser settings
- **Check**: Browser version (89+ required)

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Device not connected" | No USB device found | Connect device and click Re-Connect |
| "File too large" | File exceeds 512KB | Use smaller file or check device specs |
| "Invalid file format" | Unsupported file type | Use .bin, .hex, or .elf files |
| "Programming failed" | Communication error | Check connection, try again |

## 📝 Development

### File Structure
```
WebFlash/
├── webhid_connector_separated.html    # Main interface
├── webhid_connector.js               # Core functionality
├── webhid_connector.html            # Simple connector (legacy)
├── LPC55_USBHID_BOOT.py             # Reference Python implementation
└── README.md                        # This documentation
```

### Key Components
- **WebHID Interface**: Device communication layer
- **ISP Protocol**: LPC55S28 bootloader command implementation
- **File Management**: Path memory and smart reloading
- **Progress Tracking**: Real-time status and error handling
- **UI Management**: Modern responsive interface

### Technical Features
- **48-byte packet limit** auto-detection
- **Command/data phase separation** for WriteMemory
- **Exponential backoff retry** mechanisms
- **Asynchronous logging** for performance
- **LocalStorage** for persistent settings

## 🤝 Contributing

This tool is designed for professional firmware development workflows. For suggestions or improvements:

1. Test thoroughly with your specific hardware
2. Document any compatibility issues
3. Provide detailed error logs when reporting issues
4. Consider security implications of any changes

## ⚠️ Disclaimer

This tool is provided for development and testing purposes. Always:
- **Backup** existing firmware before programming
- **Verify** file integrity before programming
- **Test** programmed devices thoroughly
- **Follow** your organization's development procedures

The tool implements defensive security measures and refuses malicious operations, but users are responsible for their firmware and development practices.

## 📜 License

This project is provided as-is for educational and development purposes. Please respect NXP's intellectual property and licensing terms when using with their hardware and software.

---

**🔧 Built for modern firmware development workflows**  
**⚡ Optimized for speed and reliability**  
**🛡️ Designed with security in mind**
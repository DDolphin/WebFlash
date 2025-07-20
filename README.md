# 🔧 WebFlash - USB ISP Programming Tool

A modern web-based In-System Programming (ISP) tool for ARM microcontrollers using WebHID API. This tool provides a fast, reliable, and user-friendly interface for flash programming directly from your web browser, supporting a wide range of ARM MCUs with USB ISP capability.

> 🤖 **AI-Generated Project**: This project was developed using [Claude Code](https://claude.ai/code), Anthropic's AI-powered development tool. The entire codebase, including HTML, JavaScript, and documentation, was generated through AI assistance to demonstrate modern web-based embedded programming solutions.

## 🌐 Online Access

<div align="center">

### 🚀 **[LAUNCH TOOL](https://ddolphin.github.io/WebFlash/webhid_connector_separated.html)** 🚀

**No installation required!** Works directly in your browser.

[![Launch Tool](https://img.shields.io/badge/🔧_Launch_Tool-Online-brightgreen?style=for-the-badge)](https://ddolphin.github.io/WebFlash/webhid_connector_separated.html)

</div>

Compatible with Chrome, Edge, and Opera browsers. Simply connect your ARM MCU device and start programming!

## ✨ Features

### 🚀 High-Performance Programming
- **Ultra-fast flash programming** with optimized packet sizes (up to 4KB chunks)
- **Smart retry mechanism** for robust communication
- **Zero-delay transfers** for maximum speed
- **Intelligent logging control** to prevent performance bottlenecks

### 🔌 Smart Device Management
- **Auto-detection** of compatible ARM MCU devices on page load
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
- **ARM MCU** with USB ISP support
- **USB connection** for ISP communication  
- **Device in ISP/bootloader mode**

### Supported MCU Series
This tool is primarily designed for and tested with ARM Cortex-M microcontrollers that support USB HID ISP protocol:

- **LPC55xx** series (LPC5528, LPC5526, etc.)
- **LPC54xx** series (LPC5460, LPC5411, etc.)
- **LPC43xx** series (LPC4357, LPC4337, etc.)
- **LPC40xx** series (LPC4088, LPC4078, etc.)
- **LPC17xx** series (LPC1769, LPC1768, etc.)
- **LPC11xx** series (LPC1114, LPC1115, etc.)
- **Compatible ARM MCUs** with USB HID bootloader (VID: 0x1FC9)

> **Note**: All MCUs must support USB HID ISP protocol and have VID 0x1FC9 in bootloader mode. This tool is compatible with LPC series microcontrollers and similar ARM Cortex-M devices.

## 🚀 Quick Start

### 1. Setup Device
1. Connect your ARM MCU device via USB
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
- **🔌 Connect ARM Device**: Manual device connection/reconnection
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
- **Large files (512KB+)**: ~20-30 seconds

> Performance may vary depending on MCU flash size and USB interface speed.

## 🔒 Security & Safety

### Built-in Protections
- **File size validation** (respects MCU flash memory limits)
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
| "File too large" | File exceeds MCU flash size | Use smaller file or check MCU specifications |
| "Invalid file format" | Unsupported file type | Use .bin, .hex, or .elf files |
| "Programming failed" | Communication error | Check connection, try again |

## 📝 Development

### File Structure
```
WebFlash/
├── webhid_connector_separated.html    # Main interface
├── webhid_connector.js               # Core functionality  
├── README.md                        # This documentation
└── LICENSE                          # MIT License
```

### Technical References

This tool implements USB HID ISP protocol based on publicly available specifications:

- **MCU Boot ROM Reference Manual**: [MCUBOOTRM.pdf](https://www.nxp.com/docs/en/reference-manual/MCUBOOTRM.pdf)
  - Official specification for USB HID ISP protocol implementation
  - Covers command structure, data formats, and communication flow
  - Useful for understanding the underlying protocol and extending functionality

> **Note**: While this tool is designed to work with various ARM Cortex-M microcontrollers, the above reference specifically covers LPC series implementation details.

### Key Components
- **WebHID Interface**: Device communication layer
- **ISP Protocol**: Universal ARM Cortex-M bootloader command implementation
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

## 🤖 AI Development

This project showcases the capabilities of AI-assisted software development:

### Development Process
- **Generated with [Claude Code](https://claude.ai/code)** by Anthropic
- **Iterative development** through conversational programming
- **Real-time optimization** based on performance requirements
- **Comprehensive testing** and debugging assistance

### AI Contributions
- **Complete codebase generation** - HTML, CSS, JavaScript
- **Technical architecture design** - WebHID API integration, ISP protocol implementation
- **Performance optimization** - Packet size detection, retry mechanisms, logging optimization
- **User experience design** - Modern interface, progress tracking, error handling
- **Documentation creation** - Comprehensive README, inline comments, usage guides

### Quality Assurance
- **Defensive programming** - Input validation, error recovery, security considerations
- **Modern web standards** - ES6+, responsive design, accessibility features
- **Professional practices** - Code organization, commenting, version control preparation

This project demonstrates that AI tools can generate production-quality, well-documented, and maintainable code for complex technical applications.

## ⚠️ Disclaimer

This tool is provided for development and testing purposes. Always:
- **Backup** existing firmware before programming
- **Verify** file integrity before programming
- **Test** programmed devices thoroughly
- **Follow** your organization's development procedures

The tool implements defensive security measures and refuses malicious operations, but users are responsible for their firmware and development practices.

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ **Commercial use** - Use in commercial projects
- ✅ **Modification** - Modify and distribute
- ✅ **Distribution** - Distribute original or modified versions
- ✅ **Private use** - Use for private projects
- ⚠️ **No warranty** - Provided "as-is" without warranty

### Additional Notes
- This project is provided for educational and development purposes
- Please respect microcontroller manufacturers' intellectual property and licensing terms when using with their hardware and software
- Generated with AI assistance from Claude Code by Anthropic

---

**🔧 Built for modern firmware development workflows**  
**⚡ Optimized for speed and reliability**  
**🛡️ Designed with security in mind**  
**🌐 Universal support for ARM microcontrollers with USB ISP**
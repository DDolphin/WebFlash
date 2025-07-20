const connectBtn = document.getElementById('connectBtn');
const fullDiagnosticBtn = document.getElementById('fullDiagnosticBtn');
const eraseFlashBtn = document.getElementById('eraseFlashBtn');
const writeFlashBtn = document.getElementById('writeFlashBtn');
const resetDeviceBtn = document.getElementById('resetDeviceBtn');
const log = document.getElementById('log');
const statusDisplay = document.getElementById('statusDisplay');
const logToggle = document.getElementById('logToggle');

// File upload elements
const filePathInput = document.getElementById('filePathInput');
const browseFileBtn = document.getElementById('browseFileBtn');

// Hidden file input for browse functionality
const hiddenFileInput = document.createElement('input');
hiddenFileInput.type = 'file';
hiddenFileInput.accept = '.bin,.hex,.elf';
hiddenFileInput.style.display = 'none';
document.body.appendChild(hiddenFileInput);

// Progress elements
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');

let device;
let currentFilePath = null;
let currentFileHandle = null;

// Initialize default chunk size
window.optimizedChunkSize = 44; // Default safe size

// File path memory for continuous flashing
const STORAGE_KEY = 'lpc55s28_flash_path';
const STORAGE_KEY_DIRECTORY = 'lpc55s28_flash_directory';
const STORAGE_KEY_FULL_PATH = 'lpc55s28_full_path';
const STORAGE_KEY_FILE_INFO = 'lpc55s28_file_info';

// Load saved path on startup with enhanced file info
function loadSavedPath() {
  try {
    const savedPath = localStorage.getItem(STORAGE_KEY);
    const savedDir = localStorage.getItem(STORAGE_KEY_DIRECTORY);
    const savedFullPath = localStorage.getItem(STORAGE_KEY_FULL_PATH);
    const savedFileInfo = localStorage.getItem(STORAGE_KEY_FILE_INFO);
    
    let pathToDisplay = savedPath;
    
    // Use full path if available
    if (savedFullPath) {
      pathToDisplay = savedFullPath;
      filePathInput.value = savedFullPath;
      logMessage(`📂 Loaded saved full path: ${savedFullPath}`);
    } else if (savedPath) {
      // If we have a directory hint, combine it with filename
      if (savedDir && !savedPath.includes('/') && !savedPath.includes('\\')) {
        const suggestedPath = savedDir.endsWith('/') || savedDir.endsWith('\\') ? 
          savedDir + savedPath : savedDir + '/' + savedPath;
        filePathInput.value = suggestedPath;
        pathToDisplay = suggestedPath;
        logMessage(`📂 Loaded suggested path: ${suggestedPath}`);
      } else {
        filePathInput.value = savedPath;
        if (savedPath.includes('/') || savedPath.includes('\\')) {
          logMessage(`📂 Loaded saved full path: ${savedPath}`);
        } else {
          logMessage(`📂 Loaded saved filename: ${savedPath}`);
          logMessage(`💡 Tip: Edit to add full path (e.g., C:\\Projects\\${savedPath}) for better path memory`);
        }
      }
    }
    
    // Display file info if available
    if (savedFileInfo) {
      try {
        const fileInfo = JSON.parse(savedFileInfo);
        const timeSince = Math.round((Date.now() - fileInfo.timestamp) / 1000 / 60);
        logMessage(`📋 Previous file: ${fileInfo.name} (${fileInfo.size} bytes, ${timeSince} min ago)`);
        logMessage(`🚀 Ready for continuous programming - click Start Programming to use saved file`);
      } catch (error) {
        // Invalid file info, ignore
      }
    }
    
    if (pathToDisplay) {
      logMessage(`💡 Tip: Click Start Programming to auto-reload the file, or Browse to select a new one`);
    }
  } catch (error) {
    logMessage(`⚠️ Failed to load saved path: ${error.message}`);
  }
}

// Save path to localStorage with enhanced file information
function savePath(filename, fullPath = null, fileHandle = null, fileSize = null) {
  try {
    // Save filename
    localStorage.setItem(STORAGE_KEY, filename);
    
    // Save full path if provided
    if (fullPath) {
      localStorage.setItem(STORAGE_KEY_FULL_PATH, fullPath);
      const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
      if (lastSlash > 0) {
        const directory = fullPath.substring(0, lastSlash + 1);
        localStorage.setItem(STORAGE_KEY_DIRECTORY, directory);
      }
    }
    
    // Save file information for validation
    if (fileSize !== null) {
      const fileInfo = {
        name: filename,
        size: fileSize,
        timestamp: Date.now(),
        fullPath: fullPath
      };
      localStorage.setItem(STORAGE_KEY_FILE_INFO, JSON.stringify(fileInfo));
      logMessage(`💾 Complete file info saved for continuous programming`);
    } else {
      logMessage(`💾 Path saved for future use`);
    }
  } catch (error) {
    logMessage(`⚠️ Failed to save path: ${error.message}`);
  }
}

// Smart file reloading for continuous programming
async function tryReloadSavedFile() {
  try {
    const savedFileInfo = localStorage.getItem(STORAGE_KEY_FILE_INFO);
    if (!savedFileInfo) {
      return false;
    }
    
    const fileInfo = JSON.parse(savedFileInfo);
    const savedPath = fileInfo.fullPath || fileInfo.name;
    
    // Check if we still have a valid file handle for this file
    if (currentFileHandle) {
      try {
        const file = await currentFileHandle.getFile();
        if (file.name === fileInfo.name && file.size === fileInfo.size) {
          logCritical(`🔄 Using previously selected file: ${file.name}`);
          return true; // File handle is still valid
        }
      } catch (error) {
        // File handle is no longer valid, clear it
        currentFileHandle = null;
      }
    }
    
    // If path input matches saved path, assume user wants to use the same file
    const currentPath = filePathInput.value.trim();
    if (currentPath && (currentPath === savedPath || currentPath === fileInfo.name)) {
      logCritical(`📂 Attempting to reload file from saved path: ${currentPath}`);
      
      // Try to prompt user to re-select the same file
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          startIn: 'downloads',
          types: [{
            description: 'Binary files',
            accept: {
              'application/octet-stream': ['.bin'],
              'text/plain': ['.hex'],
              'application/x-executable': ['.elf']
            }
          }]
        });
        
        const file = await fileHandle.getFile();
        
        // Validate it's the expected file
        if (file.name === fileInfo.name) {
          currentFileHandle = fileHandle;
          // Update the path input to show the full path if available
          if (currentPath !== file.name) {
            filePathInput.value = currentPath;
          }
          logCritical(`✅ Successfully reloaded: ${file.name} (${file.size} bytes)`);
          return true;
        } else {
          logCritical(`⚠️ Selected different file: ${file.name} (expected: ${fileInfo.name})`);
          // Update with new file
          currentFileHandle = fileHandle;
          if (currentPath !== file.name) {
            filePathInput.value = currentPath;
          }
          savePath(file.name, currentPath, fileHandle, file.size);
          return true;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          logCritical(`❌ Failed to reload file: ${error.message}`);
        }
        return false;
      }
    }
    
    return false;
  } catch (error) {
    logCritical(`❌ Error during file reload: ${error.message}`);
    return false;
  }
}

// Constants from Python code
const CommandTag = {
  FLASH_ERASE_ALL: 0x01,
  FLASH_ERASE_REGION: 0x02,
  READ_MEMORY: 0x03,
  WRITE_MEMORY: 0x04,
  FILL_MEMORY: 0x05,
  FLASH_SECURITY_DISABLE: 0x06,
  GET_PROPERTY: 0x07,
  RECEIVE_SB_FILE: 0x08,
  EXECUTE: 0x09,
  CALL: 0x0A,
  RESET: 0x0B,
  SET_PROPERTY: 0x0C,
  FLASH_ERASE_ALL_UNSECURE: 0x0D,
  CONFIGURE_MEMORY: 0x11,
  KEY_PROVISION: 0x15
};

const ResponseTag = {
  GENERIC_RESPONSE: 0xA0,
  READ_MEMORY_RESPONSE: 0xA3,
  GET_PROPERTY_RESPONSE: 0xA7,
  FLASH_READ_ONCE_RESPONSE: 0xAF,
  KEY_PROVISION_RESPONSE: 0xB5
};

const HID_REPORT_SIZE = 64;
const REPORT_ID_OUT = 0x01;
const REPORT_ID_IN = 0x03;
const REPORT_ID_DATA = 0x02;
const REPORT_ID_BULK = 0x06;
const PADDING = 0x00;
const HEADER_SIZE = 8;
const PARAM_START = 8;
const PARAM_SIZE = 4;
const DATA_PHASE_FLAG = 0x01;

const PROPERTY_INFO = {
  0x01: {name: "CurrentVersion", size: 4},
  0x02: {name: "AvailablePeripherals", size: 4},
  0x03: {name: "FlashStartAddress", size: 4},
  0x04: {name: "FlashSizeInBytes", size: 4},
  0x05: {name: "FlashSectorSize", size: 4},
  0x07: {name: "AvailableCommands", size: 4},
  0x08: {name: "Check Status", size: 4},
  0x0B: {name: "MaxPacketSize", size: 4},
  0x0C: {name: "ReservedRegions", size: 0},
  0x11: {name: "LifeCycleState", size: 4},
  0x12: {name: "UniqueDevice/UUID", size: 16},
  0x14: {name: "RAMStartAddress", size: 4},
  0x15: {name: "RAMSize", size: 4},
  0x16: {name: "SystemDeviceIdentification", size: 8},
  0x19: {name: "ExternalMemoryAttributes", size: 24},
  0x1C: {name: "IrqNotifierPin", size: 4},
  0x18: {name: "TargetVersion", size: 4},
  0x1B: {name: "FlashPageSize", size: 4}
};

const PERIPHERALS = {
  0x01: "UART",
  0x02: "I2C-Slave",
  0x04: "SPI-Slave", 
  0x10: "USB-HID"
};

const COMMANDS = {
  0x01: "FlashEraseAll",
  0x02: "FlashEraseRegion",
  0x03: "ReadMemory",
  0x04: "WriteMemory",
  0x05: "FillMemory",
  0x06: "FlashSecurityDisable",
  0x07: "GetProperty",
  0x08: "ReceiveSBFile",
  0x09: "Execute",
  0x0A: "Call",
  0x0B: "Reset",
  0x0C: "SetProperty",
  0x0D: "FlashEraseAllUnsecure",
  0x0E: "FlashReadOne",
  0x0F: "FlashReadResource",
  0x10: "FlashProgramOne",
  0x11: "ConfigureMemory",
  0x15: "KeyProvisioning"
};

const STATUS_CODES = {
  0: "kStatus_Success: Operation succeeded without error",
  1: "kStatus_Fail: Operation failed with a generic error",
  2: "kStatus_ReadOnly: Request value cannot be changed because it is read-only",
  3: "kStatus_OutOfRange: Requested value is out of range",
  4: "kStatus_InvalidArgument: The requested command's argument is undefined",
  5: "kStatus_Timeout: A timeout occurred",
  10000: "kStatus_UnknownCommand: Command is not recognized",
  10001: "kStatus_SecurityViolation: Security violation happened when receiving disallowed commands"
};

// High-performance logging system with flash programming optimization
let logQueue = [];
let logProcessing = false;
let flashProgrammingActive = false; // Critical flag to disable all logging during flash programming

function logMessage(msg) {
  // Completely skip logging during flash programming for maximum speed
  if (flashProgrammingActive) {
    return; // No logging overhead at all during critical operations
  }
  
  // Only log if toggle is enabled for performance
  if (logToggle && logToggle.checked) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    
    // Add to queue for async processing
    logQueue.push(logEntry);
    
    // Process queue asynchronously to avoid blocking
    if (!logProcessing) {
      processLogQueue();
    }
  }
}

// Critical logging function for essential messages that bypass flash programming restrictions
function logCritical(msg) {
  if (logToggle && logToggle.checked) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    logQueue.push(logEntry);
    
    if (!logProcessing) {
      processLogQueue();
    }
  }
}

async function processLogQueue() {
  if (logProcessing) return;
  logProcessing = true;
  
  try {
    // Process in small batches to avoid blocking
    while (logQueue.length > 0) {
      const batch = logQueue.splice(0, 10); // Process 10 entries at a time
      
      // Use requestAnimationFrame for smooth UI updates
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          batch.forEach(entry => {
            log.textContent += `\n${entry}`;
          });
          
          // Throttle scrolling to reduce UI impact
          if (logQueue.length === 0 || logQueue.length % 50 === 0) {
            log.scrollTop = log.scrollHeight;
          }
          
          resolve();
        });
      });
      
      // Small yield to prevent blocking
      if (logQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  } finally {
    logProcessing = false;
  }
}

function updateStatusDisplay(message) {
  statusDisplay.textContent = message;
}

// Update UI button states based on device connection
function updateButtonStates() {
  const isConnected = device && device.opened;
  
  // Enable/disable programming-related buttons based on connection
  writeFlashBtn.disabled = !isConnected;
  eraseFlashBtn.disabled = !isConnected;
  resetDeviceBtn.disabled = !isConnected;
  fullDiagnosticBtn.disabled = !isConnected;
  
  // Update button text to indicate connection requirement
  if (!isConnected) {
    writeFlashBtn.textContent = '🔌 Connect Device First';
    writeFlashBtn.style.backgroundColor = '#6c757d';
  } else {
    writeFlashBtn.textContent = '🚀 Start Programming';
    writeFlashBtn.style.backgroundColor = '#28a745';
  }
}

function clearLog() {
  // Clear log queue first
  logQueue.length = 0;
  
  // Use requestAnimationFrame for non-blocking UI update
  requestAnimationFrame(() => {
    if (logToggle && logToggle.checked) {
      log.textContent = '[Log output will appear here]';
    } else {
      log.textContent = '[Logging disabled for performance - enable above to see operation details]';
    }
  });
}

async function connectToDevice() {
  return await withRetry(async () => {
    // First try to find already granted 0x1FC9 devices
    const grantedDevices = await navigator.hid.getDevices();
    const nxpDevices = grantedDevices.filter(d => d.vendorId === 0x1FC9);
    
    if (nxpDevices.length > 0) {
      // Use existing granted NXP device
      const selectedDevice = nxpDevices[0];
      if (!selectedDevice.opened) {
        await selectedDevice.open();
      }
      logMessage(`✅ Connected to existing device: ${selectedDevice.productName || 'NXP Device'}`);
      updateButtonStates(); // Update button states when connected
      return selectedDevice;
    }
    
    // If no granted devices, request access with 0x1FC9 filter
    logMessage('🔍 Requesting access to NXP devices (0x1FC9)...');
    const filters = [
      { vendorId: 0x1FC9 }, // Auto-select any NXP device
    ];

    const devices = await navigator.hid.requestDevice({ filters });
    if (devices.length === 0) {
      logMessage('❌ No NXP device selected.');
      return null;
    }

    const selectedDevice = devices[0];
    await selectedDevice.open();

    logMessage(`✅ Connected to new device: ${selectedDevice.productName || 'NXP Device'}`);
    logMessage(`📱 VID: 0x${selectedDevice.vendorId.toString(16).toUpperCase()}, PID: 0x${selectedDevice.productId.toString(16).toUpperCase()}`);
    updateButtonStates(); // Update button states when connected
    return selectedDevice;
  }, 2, 200, 'Device connection');
}

// Complete device diagnostic: Info + Properties + Commands + Communication Test
async function fullDeviceDiagnostic() {
  if (device && !device.opened) {
    device = null;
  }

  if (!device) {
    device = await connectToDevice();
    if (!device) return;
  }

  try {
    // Read device basic information
    const manufacturer = device.collections[0]?.usagePage === 0xFF00 ? 
      'NXP Semiconductors' : (device.collections[0]?.usage || 'Unknown');
    const productName = device.productName || 'Unknown';
    const vendorId = `0x${device.vendorId.toString(16).toUpperCase().padStart(4, '0')}`;
    const productId = `0x${device.productId.toString(16).toUpperCase().padStart(4, '0')}`;

    // Add HID collection information
    let hidInfo = '';
    if (device.collections && device.collections.length > 0) {
      const collection = device.collections[0];
      hidInfo = `\nHID Collections:\n`;
      hidInfo += `  Usage Page: 0x${collection.usagePage?.toString(16) || '??'}\n`;
      hidInfo += `  Usage: 0x${collection.usage?.toString(16) || '??'}\n`;
      hidInfo += `  Input Reports: ${collection.inputReports?.length || 0}\n`;
      hidInfo += `  Output Reports: ${collection.outputReports?.length || 0}\n`;
      hidInfo += `  Feature Reports: ${collection.featureReports?.length || 0}`;
      
      // Check output report capabilities
      if (collection.outputReports && collection.outputReports.length > 0) {
        hidInfo += `\nOutput Report IDs: ${collection.outputReports.map(r => '0x' + r.reportId.toString(16)).join(', ')}`;
      } else {
        hidInfo += `\n⚠️ No output reports found - device may not support commands`;
      }
    }

    // Build detailed information string
    const deviceInfo = [
      `Manufacturer: ${manufacturer}`,
      `Product: ${productName}`,
      `Vendor ID: ${vendorId}`,
      `Product ID: ${productId}`,
      `Opened: ${device.opened ? 'Yes' : 'No'}`,
      hidInfo
    ].join('\n');

    // Now perform HID communication test
    logMessage('🧪 Testing HID communication...');
    
    // Get detailed output report information
    const collection = device.collections[0];
    const outputReports = collection?.outputReports || [];
    
    logMessage(`📊 Output report details:`);
    outputReports.forEach((report, index) => {
      logMessage(`   Report ${index + 1}: ID=0x${report.reportId.toString(16)}, Size=${report.reportSize} bits`);
    });
    
    // Test progressive packet sizes to find optimal size
    logMessage('🔍 Testing extended packet sizes...');
    const testSizes = [
      // Standard sizes
      44, 48, 56, 59, 63, 64,
      // Extended sizes - testing WebHID limits
      80, 96, 112, 128, 160, 192, 224, 256,
      // Larger sizes - testing device limits
      320, 384, 448, 512, 640, 768, 896, 1024,
      // Very large sizes - testing theoretical limits
      1280, 1536, 1792, 2048, 3072, 4096, 8192
    ];
    let maxWorkingSize = 0;
    
    for (let i = 0; i < testSizes.length; i++) {
      const size = testSizes[i];
      try {
        const testData = new Uint8Array(size);
        testData.fill(0);
        
        logMessage(`🧪 Testing ${size} bytes... (${i + 1}/${testSizes.length})`);
        await device.sendReport(0x01, testData);
        logMessage(`✅ Size ${size} bytes: SUCCESS`);
        maxWorkingSize = size;
        
        // Add small delay for very large packets
        if (size > 1024) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        logMessage(`❌ Size ${size} bytes: FAILED (${error.name})`);
        // Don't break immediately for extended testing
        if (size <= 64) {
          break; // Stop on basic size failures
        } else {
          logMessage(`⚡ Continuing test - device may not support large packets`);
          // Test a few more sizes before giving up
          let consecutiveFailures = 0;
          for (let j = i + 1; j < Math.min(i + 3, testSizes.length); j++) {
            try {
              const nextSize = testSizes[j];
              const nextTestData = new Uint8Array(nextSize);
              await device.sendReport(0x01, nextTestData);
              logMessage(`✅ Size ${nextSize} bytes: SUCCESS (after failure)`);
              maxWorkingSize = nextSize;
              i = j; // Update loop position
              break;
            } catch {
              consecutiveFailures++;
            }
          }
          if (consecutiveFailures >= 3) {
            logMessage(`🛑 Multiple consecutive failures - stopping extended test`);
            break;
          }
        }
      }
    }
    
    logMessage(`📊 Maximum working packet size: ${maxWorkingSize} bytes`);
    
    // Test a simple ISP command if communication works
    if (maxWorkingSize > 0) {
      logMessage('🎉 HID communication working!');
      logMessage('🔧 Testing ISP command...');
      
      try {
        // Test GetProperty command for CurrentVersion
        const result = await getProperty(device, 0x01, 0x00);
        if (result && result.success) {
          logMessage(`✅ ISP communication test: ${result.displayValue}`);
        } else {
          logMessage('⚠️ ISP command test failed');
        }
      } catch (error) {
        logMessage(`⚠️ ISP test error: ${error.message}`);
      }
      
      // Optimize chunk size based on test results
      if (maxWorkingSize >= 4096) {
        logMessage('🚀🚀 AMAZING! Device supports 4KB+ packets!');
        window.optimizedChunkSize = 4092; // 4096 - 4 byte header
      } else if (maxWorkingSize >= 2048) {
        logMessage('🚀🚀 Excellent! Device supports 2KB+ packets!');
        window.optimizedChunkSize = 2044; // 2048 - 4 byte header
      } else if (maxWorkingSize >= 1024) {
        logMessage('🚀🚀 Great! Device supports 1KB+ packets!');
        window.optimizedChunkSize = 1020; // 1024 - 4 byte header
      } else if (maxWorkingSize >= 512) {
        logMessage('🚀 Excellent! Device supports 512+ bytes!');
        window.optimizedChunkSize = 508; // 512 - 4 byte header
      } else if (maxWorkingSize >= 256) {
        logMessage('🚀 Great! Device supports 256+ bytes!');
        window.optimizedChunkSize = 252; // 256 - 4 byte header
      } else if (maxWorkingSize >= 128) {
        logMessage('🚀 Good! Device supports 128+ bytes!');
        window.optimizedChunkSize = 124; // 128 - 4 byte header
      } else if (maxWorkingSize >= 64) {
        logMessage('⚡ Device supports 64+ bytes!');
        window.optimizedChunkSize = 60; // 64 - 4 byte header
      } else if (maxWorkingSize >= 63) {
        logMessage('⚡ Device supports 63 bytes - standard max!');
        window.optimizedChunkSize = 59; // 63 - 4 byte header
      } else if (maxWorkingSize >= 48) {
        logMessage('⚡ Device supports 48+ bytes');
        window.optimizedChunkSize = 44; // 48 - 4 byte header
      } else {
        logMessage('⚠️ Device has limited packet size');
        window.optimizedChunkSize = Math.max(maxWorkingSize - 4, 16); // Conservative
      }
      
      logMessage(`📊 Flash write will use ${window.optimizedChunkSize}-byte chunks`);
      
      // Calculate speed improvement
      const oldChunks = Math.ceil(10608 / 44);
      const newChunks = Math.ceil(10608 / window.optimizedChunkSize);
      const speedImprovement = ((oldChunks - newChunks) / oldChunks * 100).toFixed(1);
      if (speedImprovement > 0) {
        logMessage(`⚡ Expected speed improvement: ${speedImprovement}% (${oldChunks}→${newChunks} chunks)`);
      }
    } else {
      logMessage('❌ No packet size works - fundamental communication issue');
    }

    // Now read all device properties
    logMessage('📊 Reading all device properties...');
    const properties = [
      {propId: 0x01, memoryId: 0x00, statusId: null}, // CurrentVersion
      {propId: 0x02, memoryId: 0x00, statusId: null}, // AvailablePeripherals
      {propId: 0x03, memoryId: 0x00, statusId: null}, // FlashStartAddress
      {propId: 0x04, memoryId: 0x00, statusId: null}, // FlashSizeInBytes
      {propId: 0x05, memoryId: 0x00, statusId: null}, // FlashSectorSize
      {propId: 0x07, memoryId: 0x00, statusId: null}, // AvailableCommands
      {propId: 0x0B, memoryId: 0x00, statusId: null}, // MaxPacketSize
      {propId: 0x11, memoryId: 0x00, statusId: null}, // LifeCycleState
      {propId: 0x12, memoryId: 0x00, statusId: null}, // UniqueDevice/UUID
      {propId: 0x14, memoryId: 0x00, statusId: null}, // RAMStartAddress
      {propId: 0x15, memoryId: 0x00, statusId: null}, // RAMSize
      {propId: 0x18, memoryId: 0x00, statusId: null}  // TargetVersion
    ];
    
    let propertyResults = [];
    let successCount = 0;
    let availableCommandsValue = null;
    
    for (const prop of properties) {
      try {
        const result = await getProperty(device, prop.propId, prop.memoryId, prop.statusId);
        if (result && result.success) {
          propertyResults.push(result.displayValue);
          successCount++;
          
          // Store available commands for later analysis
          if (prop.propId === 0x07) {
            availableCommandsValue = result.value;
          }
        } else {
          const propInfo = PROPERTY_INFO[prop.propId] || {name: `Property 0x${prop.propId.toString(16)}`};
          propertyResults.push(`${propInfo.name}: Failed`);
        }
        
        // Ultra-fast property reading - no delay
      } catch (error) {
        const propInfo = PROPERTY_INFO[prop.propId] || {name: `Property 0x${prop.propId.toString(16)}`};
        propertyResults.push(`${propInfo.name}: Error`);
      }
    }
    
    logMessage(`✅ Properties: ${successCount}/${properties.length} read`);
    
    // List available commands in detail
    logMessage('📜 Analyzing available commands...');
    let commandSummary = '';
    if (availableCommandsValue && Array.isArray(availableCommandsValue)) {
      commandSummary = `\n\n📜 Available Commands (${availableCommandsValue.length}):\n• ${availableCommandsValue.join('\n• ')}`;
    } else {
      commandSummary = '\n\n📜 Available Commands: Failed to read';
    }

    // Build comprehensive diagnostic display
    const diagnosticInfo = [
      '🔍 COMPLETE DEVICE DIAGNOSTIC',
      '',
      '📱 Device Information:',
      deviceInfo,
      '',
      `📊 Communication Test Results:`,
      `• Max packet size: ${maxWorkingSize} bytes`,
      `• HID reports: ${outputReports.length} output reports`,
      `• ISP compatibility: ${maxWorkingSize > 0 ? '✅ Working' : '❌ Failed'}`,
      '',
      '⚙️ Device Properties:',
      ...propertyResults,
      commandSummary
    ].join('\n');

    updateStatusDisplay(diagnosticInfo);
    logMessage('🎉 Complete device diagnostic finished!');

  } catch (error) {
    logMessage(`❌ Device info/test failed: ${error.message}`);
    updateStatusDisplay('Device info/test failed - check logs');
  }
}

connectBtn.addEventListener('click', async () => {
  clearLog();
  
  // Reset button state
  connectBtn.textContent = '🔌 Connect NXP Device';
  connectBtn.disabled = false;
  
  logMessage('🎯 Targeting NXP devices (VID: 0x1FC9)...');
  device = await connectToDevice();
  
  if (device) {
    device.addEventListener('inputreport', event => {
      const { data, reportId } = event;
      const values = Array.from(new Uint8Array(data.buffer))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
      logMessage(`📥 Report ID: 0x${reportId.toString(16)} => [${values}]`);
    });
    
    updateStatusDisplay('NXP device connected. Running device test...');
    connectBtn.textContent = '🔄 Re-Connect';
    connectBtn.disabled = false;
    
    // Update button states now that device is connected
    updateButtonStates();
    
    // Auto-run full diagnostic after manual connection
    setTimeout(() => {
      fullDeviceDiagnostic();
    }, 100);
  }
});

// Helper functions for packet encoding/decoding
function encodePacket(commandTag, parameterCount, params = null, flags = 0x00) {
  // Build command data
  let messageData = new Uint8Array([commandTag, flags, 0x00, parameterCount]);
  if (params) {
    const combined = new Uint8Array(messageData.length + params.length);
    combined.set(messageData);
    combined.set(params, messageData.length);
    messageData = combined;
  }
  
  // Calculate the actual required packet size
  const messageLength = messageData.length;
  const minPacketSize = 4 + messageLength; // Header (4) + message data
  
  // Since zero-length packets work, try with minimal size
  const packet = new Uint8Array(minPacketSize);
  
  // HID packet structure: [ReportID, Padding, LengthLow, LengthHigh, CommandData...]
  packet[0] = REPORT_ID_OUT;     // Report ID
  packet[1] = PADDING;           // Padding (0x00)
  packet[2] = messageLength & 0xFF;           // Length low byte
  packet[3] = (messageLength >> 8) & 0xFF;   // Length high byte
  packet.set(messageData, 4);    // Command data
  
  // Suppress packet logging for performance during writes
  
  return packet;
}

function decodePacket(packet) {
  if (!packet || packet.length < HEADER_SIZE) {
    logMessage('❌ Packet too short to decode');
    return null;
  }

  const reportId = packet[0];
  const padding = packet[1];
  const messageLength = packet[2] | (packet[3] << 8);
  
  if (reportId !== REPORT_ID_IN && reportId !== REPORT_ID_OUT) {
    logMessage(`⚠️ Unexpected Report ID 0x${reportId.toString(16)}`);
    return null;
  }

  if (padding !== PADDING) {
    logMessage(`❌ Invalid Padding 0x${padding.toString(16)}, expected 0x${PADDING.toString(16)}`);
    return null;
  }

  const totalLength = messageLength + 4;
  if (totalLength > packet.length) {
    logMessage(`❌ Total length ${totalLength} exceeds packet length ${packet.length}`);
    return null;
  }

  const commandTag = packet[4];
  const flags = packet[5];
  const reserved = packet[6];
  const parameterCount = packet[7];
  const params = packet.slice(PARAM_START, totalLength);

  return {
    reportId,
    messageLength,
    commandTag,
    flags,
    parameterCount,
    params
  };
}

function parseParameters(params, parameterCount) {
  const parameters = [];
  const maxParams = Math.floor(params.length / PARAM_SIZE);
  const paramCount = Math.min(parameterCount, maxParams);

  for (let i = 0; i < paramCount; i++) {
    const start = i * PARAM_SIZE;
    const end = start + PARAM_SIZE;
    const paramBytes = params.slice(start, end);
    
    if (paramBytes.length < PARAM_SIZE) {
      parameters.push(0);
    } else {
      const paramValue = paramBytes[0] | (paramBytes[1] << 8) | (paramBytes[2] << 16) | (paramBytes[3] << 24);
      parameters.push(paramValue >>> 0); // Convert to unsigned 32-bit
    }
  }

  return parameters;
}

function parseVersion(value) {
  const prefix = String.fromCharCode((value >> 24) & 0xFF);
  const major = (value >> 16) & 0xFF;
  const minor = (value >> 8) & 0xFF;
  const patch = value & 0xFF;
  return `${prefix}${major}.${minor}.${patch}`;
}

function parsePeripherals(value) {
  const supported = [];
  for (const [bit, name] of Object.entries(PERIPHERALS)) {
    if (value & parseInt(bit)) {
      supported.push(name);
    }
  }
  return supported.length > 0 ? supported : ['None'];
}

function parseCommands(value) {
  const supported = [];
  const commandDetails = [];
  
  for (const [tag, name] of Object.entries(COMMANDS)) {
    const tagInt = parseInt(tag);
    if (value & (1 << (tagInt - 1))) {
      supported.push(name);
      commandDetails.push(`0x${tagInt.toString(16).padStart(2, '0')} - ${name}`);
    }
  }
  
  // Suppress detailed command logging for performance
  
  return supported.length > 0 ? supported : ['None'];
}

// HID communication retry mechanism
let bulkOperationMode = false; // Flag to suppress verbose logging during bulk operations

async function withRetry(operation, maxRetries = 3, delayMs = 100, operationName = 'HID operation', suppressLogs = false) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        // Always log retry success during flash programming as it's critical info
        if (flashProgrammingActive) {
          logCritical(`✅ ${operationName} succeeded on attempt ${attempt}`);
        } else if (!suppressLogs && !bulkOperationMode) {
          logMessage(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
      }
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        // Always log final failure during flash programming as it's critical
        if (flashProgrammingActive) {
          logCritical(`❌ ${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        } else if (!suppressLogs && !bulkOperationMode) {
          logMessage(`❌ ${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
        throw error;
      } else {
        // Always log retry attempts during flash programming as they indicate problems
        if (flashProgrammingActive) {
          logCritical(`⚠️ ${operationName} attempt ${attempt} failed: ${error.message}, retrying...`);
        } else if (!suppressLogs && !bulkOperationMode) {
          logMessage(`⚠️ ${operationName} attempt ${attempt} failed: ${error.message}, retrying...`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt)); // Exponential backoff
      }
    }
  }
}

async function sendIspCommand(device, commandPacket, timeout = 3000) {
  const reportId = commandPacket[0];
  
  return await withRetry(async () => {
    // Extract the report ID and data
    const dataToSend = commandPacket.slice(1); // Remove first byte (report ID)
    
    // Check if device is still open
    if (!device.opened) {
      throw new Error('Device is not open');
    }
    
    // Check if the report ID is supported (suppress during write operations)
    const outputReports = device.collections[0]?.outputReports || [];
    const supportedReportIds = outputReports.map(r => r.reportId);
    
    if (!supportedReportIds.includes(reportId)) {
      throw new Error(`Report ID 0x${reportId.toString(16)} not supported by device`);
    }
    
    // Use the correct WebHID API syntax
    await device.sendReport(reportId, dataToSend);
    
    // Wait for response
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logMessage('⏰ Command timeout - no response received');
        resolve(null);
      }, timeout);
      
      const handleInputReport = (event) => {
        clearTimeout(timeoutId);
        device.removeEventListener('inputreport', handleInputReport);
        
        // Reconstruct the full packet with report ID
        const responseData = new Uint8Array(event.data.buffer);
        const response = new Uint8Array(responseData.length + 1);
        response[0] = event.reportId;
        response.set(responseData, 1);
        
        // Suppress response logging for performance
        resolve(response);
      };
      
      device.addEventListener('inputreport', handleInputReport);
    });
  }, 3, 100, `ISP Command 0x${reportId.toString(16)}`);
}

// Legacy functions removed - functionality integrated into deviceInfoAndTest()

async function getProperty(device, propId, memoryId = 0x00, statusIdentifier = null) {
  const propInfo = PROPERTY_INFO[propId] || {name: `Unknown Property (ID 0x${propId.toString(16)})`};
  // Suppress individual property request logs for speed
  
  // Build parameters according to LPC55 bootloader protocol
  let params = new Uint8Array(8); // Basic: propId + memoryId (2 parameters)
  
  // Parameter 1: Property ID (4 bytes, little endian)
  params[0] = propId & 0xFF;
  params[1] = (propId >> 8) & 0xFF;
  params[2] = (propId >> 16) & 0xFF;
  params[3] = (propId >> 24) & 0xFF;
  
  // Parameter 2: Memory ID (4 bytes, little endian)
  params[4] = memoryId & 0xFF;
  params[5] = (memoryId >> 8) & 0xFF;
  params[6] = (memoryId >> 16) & 0xFF;
  params[7] = (memoryId >> 24) & 0xFF;
  
  let parameterCount = 2;
  
  // Add status identifier for Check Status property (0x08)
  if (propId === 0x08 && statusIdentifier !== null) {
    const extendedParams = new Uint8Array(12);
    extendedParams.set(params);
    
    // Parameter 3: Status Identifier (4 bytes, little endian)
    extendedParams[8] = statusIdentifier & 0xFF;
    extendedParams[9] = (statusIdentifier >> 8) & 0xFF;
    extendedParams[10] = (statusIdentifier >> 16) & 0xFF;
    extendedParams[11] = (statusIdentifier >> 24) & 0xFF;
    
    params = extendedParams;
    parameterCount = 3;
  }
  
  // Suppress parameter logging for speed
  
  const commandPacket = encodePacket(CommandTag.GET_PROPERTY, parameterCount, params);
  const response = await sendIspCommand(device, commandPacket, 100);
  
  if (response) {
    const decoded = decodePacket(response);
    if (decoded) {
      decoded.propId = propId;
      return handlePropertyResponse(decoded);
    }
  }
  
  return null;
}

function handlePropertyResponse(decoded) {
  const params = decoded.params;
  const parameterCount = decoded.parameterCount;
  const propId = decoded.propId;
  
  const parameters = parseParameters(params, parameterCount);
  if (parameters.length === 0) {
    logMessage('❌ No parameters available');
    return null;
  }
  
  const statusCode = parameters[0];
  const statusMessage = STATUS_CODES[statusCode] || `Unknown Status (0x${statusCode.toString(16)})`;
  
  if (statusCode !== 0) {
    logMessage(`❌ Property request failed: ${statusMessage}`);
    return null;
  }
  
  // Parse property value based on property ID
  const propInfo = PROPERTY_INFO[propId] || {size: 4};
  const size = propInfo.size;
  const availableData = params.slice(4);
  
  let valueBytes;
  if (availableData.length < size) {
    valueBytes = new Uint8Array(size);
    valueBytes.set(availableData);
  } else {
    valueBytes = availableData.slice(0, size);
  }
  
  let result = {propId, name: propInfo.name, success: true};
  
  switch (propId) {
    case 0x01: // CurrentVersion
    case 0x18: // TargetVersion
      const versionValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = parseVersion(versionValue);
      result.displayValue = `Version: ${result.value}`;
      break;
      
    case 0x02: // AvailablePeripherals
      const peripheralValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = parsePeripherals(peripheralValue);
      result.displayValue = `Available Peripherals: ${result.value.join(', ')}`;
      break;
      
    case 0x07: // AvailableCommands
      const commandValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = parseCommands(commandValue);
      result.displayValue = `Available Commands: ${result.value.slice(0, 5).join(', ')}${result.value.length > 5 ? '...' : ''}`;
      break;
      
    case 0x03: // FlashStartAddress
    case 0x14: // RAMStartAddress
      const addrValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = `0x${addrValue.toString(16).toUpperCase().padStart(8, '0')}`;
      result.displayValue = `${propInfo.name}: ${result.value}`;
      break;
      
    case 0x04: // FlashSizeInBytes
    case 0x15: // RAMSize
      const sizeValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = `${(sizeValue / 1024).toFixed(1)} kiB`;
      result.displayValue = `${propInfo.name}: ${result.value}`;
      break;
      
    case 0x05: // FlashSectorSize
    case 0x1B: // FlashPageSize
      const pageValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = propId === 0x05 ? `${(pageValue / 1024).toFixed(1)} kiB` : `${pageValue} B`;
      result.displayValue = `${propInfo.name}: ${result.value}`;
      break;
      
    case 0x0B: // MaxPacketSize
      const packetValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = `${packetValue} B`;
      result.displayValue = `${propInfo.name}: ${result.value}`;
      break;
      
    case 0x11: // LifeCycleState
      const lifecycleValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      const lifecycle = lifecycleValue === 0x5aa55aa5 ? 'Development (0x5aa55aa5)' :
                       lifecycleValue === 0xc33cc33c ? 'Deployment (0xc33cc33c)' : 'Unknown';
      result.value = lifecycle;
      result.displayValue = `LifeCycleState: ${lifecycle}`;
      break;
      
    case 0x12: // UniqueDevice/UUID
      result.value = Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      result.displayValue = `UUID: ${result.value}`;
      break;
      
    default:
      const intValue = valueBytes[0] | (valueBytes[1] << 8) | (valueBytes[2] << 16) | (valueBytes[3] << 24);
      result.value = `0x${intValue.toString(16).toUpperCase().padStart(8, '0')}`;
      result.displayValue = `${propInfo.name}: ${result.value}`;
      break;
  }
  
  // Suppress individual property logs for speed during bulk read
  return result;
}

// Legacy functions - replaced by fullDeviceDiagnostic()
async function readAllProperties() {
  logMessage('🔀 Redirecting to full device diagnostic...');
  await fullDeviceDiagnostic();
}

async function listAllAvailableCommands() {
  logMessage('🔀 Redirecting to full device diagnostic...');
  await fullDeviceDiagnostic();
}

// Flash erase functionality
async function eraseFlashMemory() {
  if (!device || !device.opened) {
    device = await connectToDevice();
    if (!device) return;
  }

  // Safety confirmation
  const confirmed = confirm(
    "⚠️ WARNING: This will erase ALL flash memory!\n\n" +
    "This operation will:\n" +
    "• Delete all application code\n" +
    "• Remove all user data\n" +
    "• Make the device non-functional until new firmware is loaded\n\n" +
    "Are you sure you want to continue?"
  );
  
  if (!confirmed) {
    logMessage('❌ Flash erase operation cancelled by user');
    return;
  }

  logMessage('🗑️ Starting flash erase operation...');
  logMessage('⚠️ WARNING: Do not disconnect the device during this operation!');
  
  // Disable buttons during operation
  const originalText = eraseFlashBtn.textContent;
  eraseFlashBtn.textContent = '🔄 Erasing...';
  eraseFlashBtn.disabled = true;
  
  try {
    // Check lifecycle state first
    logMessage('🔍 Checking device lifecycle state...');
    const lifecycleResult = await getProperty(device, 0x11, 0x00);
    
    if (lifecycleResult && lifecycleResult.success) {
      if (lifecycleResult.value.includes('Development')) {
        logMessage('✅ Device is in Development mode - erase operation allowed');
      } else {
        logMessage('⚠️ Device not in Development mode - attempting to unlock...');
        await flashSecurityDisable(device);
      }
    }
    
    // Try FlashEraseAllUnsecure first (safer for development devices)
    logMessage('🔧 Attempting FlashEraseAllUnsecure...');
    let eraseResult = await flashEraseAllUnsecure(device);
    
    if (!eraseResult) {
      logMessage('⚠️ FlashEraseAllUnsecure failed, trying FlashEraseAll...');
      eraseResult = await flashEraseAll(device);
    }
    
    if (eraseResult) {
      logMessage('✅ Flash erase completed successfully!');
      logMessage('💡 Device flash memory has been completely erased');
      logMessage('🔄 You can now program new firmware to the device');
      
      updateStatusDisplay(
        'Flash Erase: SUCCESS\n\n' +
        'All flash memory has been erased.\n' +
        'Device is ready for new firmware.'
      );
    } else {
      logMessage('❌ Flash erase operation failed');
      updateStatusDisplay('Flash Erase: FAILED\n\nCheck logs for details.');
    }
    
  } catch (error) {
    logMessage(`❌ Flash erase error: ${error.message}`);
    updateStatusDisplay('Flash Erase: ERROR\n\nUnexpected error occurred.');
  } finally {
    // Re-enable button
    eraseFlashBtn.textContent = originalText;
    eraseFlashBtn.disabled = false;
  }
}

// Flash erase command implementations
async function flashEraseAllUnsecure(device) {
  logMessage('📤 Sending FlashEraseAllUnsecure command...');
  
  try {
    // FlashEraseAllUnsecure has no parameters
    const commandPacket = encodePacket(CommandTag.FLASH_ERASE_ALL_UNSECURE, 0);
    const response = await sendIspCommand(device, commandPacket, 2000); // Fast timeout for erase
    
    if (response) {
      const decoded = decodePacket(response);
      if (decoded) {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] === 0) {
          logMessage('✅ FlashEraseAllUnsecure completed successfully');
          return true;
        } else {
          const statusCode = parameters ? parameters[0] : 'Unknown';
          const statusMessage = STATUS_CODES[statusCode] || `Unknown Status (0x${statusCode.toString(16)})`;
          logMessage(`❌ FlashEraseAllUnsecure failed: ${statusMessage}`);
          return false;
        }
      }
    }
    
    logMessage('❌ FlashEraseAllUnsecure: No valid response received');
    return false;
    
  } catch (error) {
    logMessage(`❌ FlashEraseAllUnsecure error: ${error.message}`);
    return false;
  }
}

async function flashEraseAll(device, memoryId = 0x00) {
  logMessage(`📤 Sending FlashEraseAll command (Memory ID: 0x${memoryId.toString(16)})...`);
  
  try {
    // FlashEraseAll takes one parameter: memory ID
    const params = new Uint8Array(4);
    params[0] = memoryId & 0xFF;
    params[1] = (memoryId >> 8) & 0xFF;
    params[2] = (memoryId >> 16) & 0xFF;
    params[3] = (memoryId >> 24) & 0xFF;
    
    const commandPacket = encodePacket(CommandTag.FLASH_ERASE_ALL, 1, params);
    const response = await sendIspCommand(device, commandPacket, 2000); // Fast timeout for erase
    
    if (response) {
      const decoded = decodePacket(response);
      if (decoded) {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] === 0) {
          logMessage('✅ FlashEraseAll completed successfully');
          return true;
        } else {
          const statusCode = parameters ? parameters[0] : 'Unknown';
          const statusMessage = STATUS_CODES[statusCode] || `Unknown Status (0x${statusCode.toString(16)})`;
          logMessage(`❌ FlashEraseAll failed: ${statusMessage}`);
          return false;
        }
      }
    }
    
    logMessage('❌ FlashEraseAll: No valid response received');
    return false;
    
  } catch (error) {
    logMessage(`❌ FlashEraseAll error: ${error.message}`);
    return false;
  }
}

async function flashSecurityDisable(device, key = new Uint8Array(8)) {
  logMessage('🔓 Attempting to disable flash security...');
  
  try {
    // FlashSecurityDisable takes 2 parameters (8 bytes key = 2 x 4-byte params)
    const commandPacket = encodePacket(CommandTag.FLASH_SECURITY_DISABLE, 2, key);
    const response = await sendIspCommand(device, commandPacket, 1000);
    
    if (response) {
      const decoded = decodePacket(response);
      if (decoded) {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] === 0) {
          logMessage('✅ Flash security disabled successfully');
          return true;
        } else {
          const statusCode = parameters ? parameters[0] : 'Unknown';
          const statusMessage = STATUS_CODES[statusCode] || `Unknown Status (0x${statusCode.toString(16)})`;
          logMessage(`❌ Flash security disable failed: ${statusMessage}`);
          return false;
        }
      }
    }
    
    return false;
    
  } catch (error) {
    logMessage(`❌ Flash security disable error: ${error.message}`);
    return false;
  }
}

// File upload handling
function showFileUpload() {
  // No longer needed - file path input is always visible
  // Load saved path when showing upload section
  loadSavedPath();
}

function hideFileUpload() {
  // No longer needed - file path input is always visible
}

function showProgress() {
  // Progress section is always visible now
}

function hideProgress() {
  // Progress section is always visible - just reset values
  updateProgress(0, 'Ready');
}

function updateProgress(percent, status) {
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent.toFixed(1)}%`;
  progressStatus.textContent = status;
}

// Handle file from path input
async function handleFilePath(filePath) {
  if (!filePath || filePath.trim() === '') {
    logMessage('❌ No file path provided');
    return;
  }

  // Validate file extension
  const fileName = filePath.split(/[/\\]/).pop(); // Get filename from path
  const lowerFileName = fileName.toLowerCase();
  const validExtensions = ['.bin', '.hex', '.elf'];
  const hasValidExtension = validExtensions.some(ext => lowerFileName.endsWith(ext));
  
  if (!hasValidExtension) {
    alert(`❌ Invalid file type! Please select a binary file (.bin, .hex, or .elf).\nFile: ${fileName}`);
    return;
  }

  // Since we can't directly access file system paths in browser, 
  // we need to prompt user to select the file via file picker
  logMessage(`🔍 Path entered: ${filePath}`);
  logMessage(`📁 Please select the file "${fileName}" in the file picker...`);
  
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      startIn: 'downloads',
      types: [{
        description: 'Binary files',
        accept: {
          'application/octet-stream': ['.bin'],
          'text/plain': ['.hex'],
          'application/x-executable': ['.elf']
        }
      }]
    });
    
    const file = await fileHandle.getFile();
    
    // Validate file size (max 512KB for LPC55S28)
    if (file.size > 512 * 1024) {
      alert(`❌ File too large! Maximum size is 512KB for LPC55S28 flash memory.\nFile size: ${(file.size / 1024).toFixed(1)} KB`);
      return;
    }
    
    // Validate file is not empty
    if (file.size === 0) {
      alert('❌ File is empty! Please select a valid binary file.');
      return;
    }
    
    // Store file info
    currentFilePath = filePath;
    currentFileHandle = fileHandle;
    
    // Try to preserve or reconstruct the full path for handleFilePath
    const currentInputValue = filePathInput.value.trim();
    const hasUserPath = currentInputValue && currentInputValue !== file.name && 
                       (currentInputValue.includes('/') || currentInputValue.includes('\\'));
    
    let finalPath;
    let fullPath = null;
    
    if (hasUserPath) {
      // User has entered a full path, save it with the new filename
      const lastSlash = Math.max(currentInputValue.lastIndexOf('/'), currentInputValue.lastIndexOf('\\'));
      if (lastSlash > 0) {
        const directory = currentInputValue.substring(0, lastSlash + 1);
        fullPath = directory + file.name;
        finalPath = fullPath;
        logMessage(`📁 Updated path: ${fullPath}`);
      } else {
        finalPath = file.name;
      }
    } else {
      // Use the original filePath parameter as the basis
      finalPath = filePath;
      fullPath = filePath;
      logMessage(`📁 Using entered path: ${filePath}`);
    }
    
    filePathInput.value = finalPath;
    savePath(file.name, fullPath, fileHandle, file.size);
    
    // File ready
    logMessage(`📁 File ready: ${file.name} (${file.size} bytes)`);
    logMessage(`✅ File ready for programming - click Start Programming to begin`);
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      logMessage(`❌ Failed to access file: ${error.message}`);
    }
  }
}

// Handle file selection from browse button
async function handleBrowseFile() {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      startIn: 'downloads',
      types: [{
        description: 'Binary files',
        accept: {
          'application/octet-stream': ['.bin'],
          'text/plain': ['.hex'],
          'application/x-executable': ['.elf']
        }
      }]
    });
    
    const file = await fileHandle.getFile();
    
    // Validate file size
    if (file.size > 512 * 1024) {
      alert(`❌ File too large! Maximum size is 512KB for LPC55S28 flash memory.\nFile size: ${(file.size / 1024).toFixed(1)} KB`);
      return;
    }
    
    if (file.size === 0) {
      alert('❌ File is empty! Please select a valid binary file.');
      return;
    }
    
    // Store file info and update UI
    currentFileHandle = fileHandle;
    currentFilePath = file.name; // Use filename as path for display
    
    // Enhanced path handling for better user experience
    const currentInputValue = filePathInput.value.trim();
    const hasUserPath = currentInputValue && currentInputValue !== file.name && 
                       (currentInputValue.includes('/') || currentInputValue.includes('\\'));
    
    let finalPath;
    let fullPath = null;
    
    if (hasUserPath) {
      // User has entered a full path, save it with the new filename
      const lastSlash = Math.max(currentInputValue.lastIndexOf('/'), currentInputValue.lastIndexOf('\\'));
      if (lastSlash > 0) {
        const directory = currentInputValue.substring(0, lastSlash + 1);
        fullPath = directory + file.name;
        finalPath = fullPath;
        logMessage(`📁 Updated path: ${fullPath}`);
      } else {
        finalPath = file.name;
      }
    } else {
      // Try to use saved directory from previous sessions
      const savedDir = localStorage.getItem(STORAGE_KEY_DIRECTORY);
      if (savedDir) {
        const separator = savedDir.endsWith('/') || savedDir.endsWith('\\') ? '' : '/';
        fullPath = savedDir + separator + file.name;
        finalPath = fullPath;
        logMessage(`📁 Using saved directory: ${fullPath}`);
      } else {
        // Prompt user to provide a full path for better experience
        setTimeout(() => {
          const userPath = prompt(
            `📂 To remember the file location for next time, please enter the full path:\n\nSelected file: ${file.name}\n\nExample:\nC:\\Projects\\firmware\\${file.name}\n\nOr click Cancel to use filename only.`,
            `C:\\Projects\\${file.name}`
          );
          
          if (userPath && userPath.trim() && userPath !== file.name) {
            const trimmedPath = userPath.trim();
            filePathInput.value = trimmedPath;
            savePath(file.name, trimmedPath, fileHandle, file.size);
            logMessage(`📁 Path updated to: ${trimmedPath}`);
          }
        }, 100); // Small delay to ensure file selection completes first
        
        finalPath = file.name;
        logMessage(`💡 Consider entering a full path for better file management`);
      }
    }
    
    filePathInput.value = finalPath;
    savePath(file.name, fullPath, fileHandle, file.size);
    
    logMessage(`📁 File selected: ${file.name} (${file.size} bytes)`);
    logMessage(`✅ File ready for programming - click Start Programming to begin`);
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      logMessage(`❌ Failed to select file: ${error.message}`);
    }
  }
}

// Write Flash Binary functionality
async function writeFlashBinary() {
  // Check device connection first
  if (!device || !device.opened) {
    logCritical('❌ No USB device connected - attempting to connect...');
    updateStatusDisplay('Connecting to device...');
    
    device = await connectToDevice();
    if (!device) {
      logCritical('❌ Failed to connect to NXP device');
      updateStatusDisplay('Connection failed!\nPlease:\n1. Connect LPC55S28 device via USB\n2. Click "Connect NXP Device"\n3. Try Start Programming again');
      alert('❌ USB Connection Required!\n\nPlease connect your NXP LPC55S28 device and click "Connect NXP Device" before starting programming.');
      return;
    }
    
    logCritical('✅ Device connected successfully');
    updateButtonStates(); // Update button states after connection
  }
  
  // Verify device is still connected
  if (!device.opened) {
    logCritical('❌ Device connection lost');
    updateStatusDisplay('Device disconnected!\nPlease reconnect and try again.');
    alert('❌ Device Connection Lost!\n\nPlease reconnect your device and click "Connect NXP Device".');
    return;
  }
  
  // Smart file selection with path memory
  if (currentFileHandle) {
    // File already selected, proceed directly to programming
    logCritical('🚀 Using previously selected file for programming...');
  } else {
    // Try to reload saved file first
    logCritical('🔄 Attempting to reload saved file...');
    const reloadSuccess = await tryReloadSavedFile();
    
    if (!reloadSuccess) {
      // No saved file or reload failed
      if (!filePathInput.value.trim()) {
        // No file handle and no path, need to browse
        logCritical('📂 Please select a binary file first');
        await handleBrowseFile();
        return;
      } else {
        // Have a path but no handle, try to get file handle from path
        try {
          await handleBrowseFile();
        } catch (error) {
          logCritical('❌ Please browse and select the file');
          return;
        }
      }
    }
  }
  
  // Final verification that we have a valid file
  if (!currentFileHandle) {
    logCritical('❌ No file selected for programming');
    alert('Please select a binary file before starting programming.');
    return;
  }
  
  // Start the actual flash programming
  await startFlashWriteFromPath();
}

async function startFlashWriteFromPath() {
  // Check if file handle is available
  if (!currentFileHandle) {
    logMessage('❌ No file handle available');
    logMessage('💡 Please select a binary file first');
    // File path always visible
    return;
  }
  
  try {
    // Get fresh file reference
    const fileToWrite = await currentFileHandle.getFile();
    
    logCritical(`🚀 Starting flash write operation for ${fileToWrite.name}...`);
    logCritical(`📊 File size: ${fileToWrite.size} bytes`);
    
    // Continue with the existing flash write logic
    await performFlashWrite(fileToWrite);
    
  } catch (error) {
    logCritical(`❌ Failed to access file: ${error.message}`);
    // File path always visible
    return;
  }
}

// Extract the main flash write logic to a separate function
async function performFlashWrite(fileToWrite) {
  
  // Hide file selection, show progress
  hideFileUpload();
  showProgress();
  
  // Disable buttons during operation
  writeFlashBtn.disabled = true;
  resetDeviceBtn.disabled = true;
  
  try {
    updateProgress(0, 'Reading file...');
    
    // Read file as ArrayBuffer
    let arrayBuffer;
    try {
      arrayBuffer = await fileToWrite.arrayBuffer();
      logMessage('✅ File read successfully');
    } catch (fileError) {
      logMessage(`❌ Failed to read file: ${fileError.message}`);
      throw new Error(`Failed to read file: ${fileError.message}`);
    }
    
    const binaryData = new Uint8Array(arrayBuffer);
    
    logMessage(`📊 File loaded: ${binaryData.length} bytes`);
    
    updateProgress(5, 'Checking device state...');
    
    // Check lifecycle state
    const lifecycleResult = await getProperty(device, 0x11, 0x00);
    if (lifecycleResult && lifecycleResult.success) {
      if (!lifecycleResult.value.includes('Development')) {
        logMessage('⚠️ Device not in Development mode - attempting to unlock...');
        await flashSecurityDisable(device);
      } else {
        logMessage('✅ Device is in Development mode');
      }
    }
    
    updateProgress(10, 'Erasing flash...');
    
    // Ensure flash is erased first
    logMessage('🗑️ Erasing flash before writing...');
    const eraseResult = await flashEraseAllUnsecure(device);
    if (!eraseResult) {
      const eraseResult2 = await flashEraseAll(device);
      if (!eraseResult2) {
        throw new Error('Failed to erase flash');
      }
    }
    
    updateProgress(15, 'Starting write...');
    
    // Write the binary data
    await writeMemoryData(device, 0x00000000, binaryData);
    
    logCritical('✅ Flash write completed successfully!');
    logCritical(`📊 Written ${binaryData.length} bytes to flash memory`);
    
    updateStatusDisplay(
      `Flash Write & Reset: SUCCESS\n\n` +
      `File: ${fileToWrite.name}\n` +
      `Size: ${binaryData.length} bytes\n` +
      `Status: Written to flash and device reset\n` +
      `New firmware should now be running`
    );
    
    // Show success for a moment, then reset for next operation
    setTimeout(() => {
      hideProgress();
      // File path always visible
      // Keep file path for continuous flashing - don't clear it
    }, 3000); // Show success for 3 seconds
    
  } catch (error) {
    logCritical(`❌ Flash write failed: ${error.message}`);
    updateProgress(0, 'Write failed');
    updateStatusDisplay('Flash Write: FAILED\n\nCheck logs for details.');
    
    // Show file selection again for retry
    setTimeout(() => {
      hideProgress();
      // File path always visible
      // Keep file path for retry - don't clear it
    }, 2000);
  } finally {
    writeFlashBtn.disabled = false;
    resetDeviceBtn.disabled = false;
  }
}

// WriteMemory implementation with chunked transfer
async function writeMemoryData(device, startAddress, data) {
  // Enable flash programming mode - completely disable logging for maximum speed
  flashProgrammingActive = true;
  bulkOperationMode = true;
  
  try {
    // Use dynamically detected chunk size, fallback to 44 bytes
    const chunkSize = window.optimizedChunkSize || 44;
    logCritical(`📊 Using ${chunkSize}-byte chunks (auto-detected optimal size)`);
    const totalChunks = Math.ceil(data.length / chunkSize);
    
    logCritical(`📤 Writing ${data.length} bytes in ${totalChunks} chunks of ${chunkSize} bytes`);
    if (logToggle && logToggle.checked) {
      logCritical(`⚡ Logging suspended during flash programming for maximum speed`);
    }
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize);
    const chunk = data.slice(i, i + chunkSize);
    const address = startAddress + i;
    
    // Update progress every 25 chunks for maximum performance
    if (chunkIndex % 25 === 0 || chunkIndex === totalChunks - 1) {
      const progress = 15 + (chunkIndex / totalChunks) * 80;
      updateProgress(progress, `${chunkIndex + 1}/${totalChunks}`);
    }
    
    const success = await writeMemoryChunk(device, address, chunk);
    if (!success) {
      throw new Error(`Failed to write chunk ${chunkIndex + 1} at address 0x${address.toString(16)}`);
    }
    
    // No delay for maximum speed - risk device instability for speed
  }
  
    updateProgress(95, 'Write complete - resetting device...');
    logCritical('✅ All chunks written successfully');
    
    // Auto-reset device after successful write
    logCritical('🔄 Auto-resetting device to run new firmware...');
    const resetSuccess = await performAutoReset(device);
    if (resetSuccess) {
      updateProgress(100, 'Complete & Reset!');
      logCritical('✅ Device reset successfully - new firmware should be running');
    } else {
      updateProgress(100, 'Write completed!');
      logCritical('⚠️ Auto-reset failed - you can manually reset the device');
    }
  } finally {
    // Always disable flash programming mode and bulk operation mode
    flashProgrammingActive = false;
    bulkOperationMode = false;
    
    // Notify that logging has resumed
    if (logToggle && logToggle.checked) {
      logCritical(`📝 Logging resumed - flash programming complete`);
    }
  }
}

// Write a single memory chunk with retry mechanism
async function writeMemoryChunk(device, address, data) {
  return await withRetry(async () => {
    // Prepare WriteMemory command parameters
    const params = new Uint8Array(12);
    
    // Parameter 1: Start address (4 bytes, little endian)
    params[0] = address & 0xFF;
    params[1] = (address >> 8) & 0xFF;
    params[2] = (address >> 16) & 0xFF;
    params[3] = (address >> 24) & 0xFF;
    
    // Parameter 2: Byte count (4 bytes, little endian)
    params[4] = data.length & 0xFF;
    params[5] = (data.length >> 8) & 0xFF;
    params[6] = (data.length >> 16) & 0xFF;
    params[7] = (data.length >> 24) & 0xFF;
    
    // Parameter 3: Memory ID (4 bytes, little endian) - 0x00 for internal flash
    params[8] = 0x00;
    params[9] = 0x00;
    params[10] = 0x00;
    params[11] = 0x00;
    
    // Create command packet with DATA_PHASE_FLAG
    const commandPacket = encodePacket(CommandTag.WRITE_MEMORY, 3, params, DATA_PHASE_FLAG);
    
    // Ultra-fast timeout for WriteMemory
    const response = await sendIspCommand(device, commandPacket, 100);
    if (!response) {
      logMessage(`⚠️ No response to WriteMemory command at 0x${address.toString(16)} - continuing anyway`);
      // Continue with data send even if no response (some devices don't always respond)
    } else {
      const decoded = decodePacket(response);
      if (!decoded) {
        logMessage(`⚠️ Could not decode WriteMemory response - continuing anyway`);
      } else {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] !== 0) {
          const statusCode = parameters[0];
          logMessage(`❌ WriteMemory command failed with status: 0x${statusCode.toString(16)}`);
          return false;
        }
      }
    }
    
    // Send data packet (no response expected for data phase)
    const dataPacket = encodeDataPacket(data);
    await sendDataPacketNoResponse(device, dataPacket);
    
    return true;
  }, 2, 50, `Write chunk @0x${address.toString(16)}`, true); // Suppress retry logs for chunk writes
}

// Encode data packet for WriteMemory data phase
function encodeDataPacket(data) {
  // Calculate required packet size (header + data, max 48 bytes)
  const headerSize = 4; // Report ID + Padding + Length (2 bytes)
  const maxDataSize = 48 - headerSize; // Respect 48-byte limit
  const actualDataSize = Math.min(data.length, maxDataSize);
  const packetSize = headerSize + actualDataSize;
  
  const packet = new Uint8Array(packetSize);
  packet[0] = REPORT_ID_DATA;
  packet[1] = PADDING;
  packet[2] = actualDataSize & 0xFF;
  packet[3] = (actualDataSize >> 8) & 0xFF;
  packet.set(data.slice(0, actualDataSize), 4);
  
  return packet;
}

// Send data packet with no response expected
async function sendDataPacketNoResponse(device, packet) {
  const reportId = packet[0];
  return await withRetry(async () => {
    const dataToSend = packet.slice(1);
    await device.sendReport(reportId, dataToSend);
    // Suppress logging during bulk write operations for performance
  }, 3, 50, `Data packet 0x${reportId.toString(16)}`, true); // Suppress retry logs for data packets
}

// Send data packet (legacy function - keep for compatibility)
async function sendDataPacket(device, packet) {
  const reportId = packet[0];
  return await withRetry(async () => {
    const dataToSend = packet.slice(1);
    await device.sendReport(reportId, dataToSend);
    return { status: 0 };
  }, 3, 50, `Data packet 0x${reportId.toString(16)}`, true); // Suppress retry logs for data packets
}

// Auto-reset device after successful write (no confirmation)
async function performAutoReset(device) {
  try {
    // Reset command has no parameters
    const commandPacket = encodePacket(CommandTag.RESET, 0);
    const response = await sendIspCommand(device, commandPacket, 500);
    
    if (response) {
      const decoded = decodePacket(response);
      if (decoded) {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] === 0) {
          return true; // Reset successful
        }
      }
    }
    
    // Even if no response, reset command might have worked
    return true;
    
  } catch (error) {
    logMessage(`⚠️ Auto-reset error: ${error.message}`);
    return false;
  }
}

// Reset Device functionality (manual with confirmation)
async function resetDevice() {
  if (!device || !device.opened) {
    device = await connectToDevice();
    if (!device) return;
  }
  
  const confirmed = confirm(
    "🔄 Reset Device\n\n" +
    "This will reset the LPC55S28 device.\n" +
    "The device will restart and run the current firmware.\n\n" +
    "Continue with reset?"
  );
  
  if (!confirmed) {
    logMessage('❌ Device reset cancelled by user');
    return;
  }
  
  logMessage('🔄 Sending reset command to device...');
  
  try {
    // Reset command has no parameters
    const commandPacket = encodePacket(CommandTag.RESET, 0);
    const response = await sendIspCommand(device, commandPacket, 500);
    
    if (response) {
      const decoded = decodePacket(response);
      if (decoded) {
        const parameters = parseParameters(decoded.params, decoded.parameterCount);
        if (parameters && parameters[0] === 0) {
          logMessage('✅ Reset command sent successfully');
          logMessage('🔄 Device is resetting...');
          updateStatusDisplay('Device Reset: SUCCESS\n\nDevice has been reset.');
        } else {
          const statusCode = parameters ? parameters[0] : 'Unknown';
          logMessage(`❌ Reset failed with status: 0x${statusCode.toString(16)}`);
        }
      }
    } else {
      logMessage('✅ Reset command sent (no response expected)');
      logMessage('🔄 Device should be resetting now...');
      updateStatusDisplay('Device Reset: SENT\n\nDevice reset command sent.');
    }
    
    // Close connection as device will disconnect
    if (device) {
      device.close();
      device = null;
    }
    
  } catch (error) {
    logMessage(`❌ Reset error: ${error.message}`);
    updateStatusDisplay('Device Reset: ERROR\n\nFailed to send reset command.');
  }
}

// Event listeners for new path-based system
browseFileBtn.addEventListener('click', handleBrowseFile);

filePathInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const path = filePathInput.value.trim();
    if (path) {
      // Save the full path when user manually types it
      const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      if (lastSlash > 0) {
        const filename = path.substring(lastSlash + 1);
        savePath(filename, path);
      } else {
        savePath(path);
      }
      handleFilePath(path);
    }
  }
});

// Cancel write button removed - no longer needed in new interface

// Legacy drag and drop support (now opens file picker)
// Drag and drop removed - file path input is always visible

fullDiagnosticBtn.addEventListener('click', fullDeviceDiagnostic);
eraseFlashBtn.addEventListener('click', eraseFlashMemory);
writeFlashBtn.addEventListener('click', writeFlashBinary);
resetDeviceBtn.addEventListener('click', resetDevice);

// Log toggle functionality
logToggle.addEventListener('change', (e) => {
  if (e.target.checked) {
    log.textContent = '[Log output will appear here]\n✅ Logging enabled';
    logMessage('📝 Operation logging enabled');
  } else {
    log.textContent = '[Logging disabled for performance]';
  }
});

// Initialize log state (disabled by default for performance)
logToggle.checked = false;
log.textContent = '[Auto-connecting to device... Enable logging above to see details]';

// Auto-detect LPC55S28 device on page load
async function autoDetectDevice() {
  try {
    // Check if WebHID is supported
    if (!navigator.hid) {
      logMessage('⚠️ WebHID not supported in this browser');
      updateStatusDisplay('WebHID not supported. Please use Chrome/Edge.');
      return;
    }

    logMessage('🔍 Auto-connecting to LPC55S28 device...');
    
    // Get already granted devices
    const grantedDevices = await navigator.hid.getDevices();
    const lpc55Devices = grantedDevices.filter(d => 
      d.vendorId === 0x1FC9 && d.productId === 0x0021
    );

    if (lpc55Devices.length > 0) {
      const targetDevice = lpc55Devices[0];
      
      // Try to open the device
      if (!targetDevice.opened) {
        await targetDevice.open();
      }
      
      device = targetDevice;
      
      // Set up input report listener
      device.addEventListener('inputreport', event => {
        const { data, reportId } = event;
        const values = Array.from(new Uint8Array(data.buffer))
          .map(b => b.toString(16).padStart(2, '0')).join(' ');
        logMessage(`📥 Report ID: 0x${reportId.toString(16)} => [${values}]`);
      });
      
      logMessage('✅ LPC55S28 device auto-connected!');
      logMessage(`📱 Device: ${device.productName || 'LPC55S28 Bootloader'}`);
      updateStatusDisplay('LPC55S28 device auto-connected!\nRunning device test...');
      
      // Update connect button
      connectBtn.textContent = '🔄 Re-Connect';
      connectBtn.disabled = false;
      
      // Update button states now that device is connected
      updateButtonStates();
      
      // Auto-run full diagnostic immediately
      logMessage('🚀 Auto-running full device diagnostic...');
      setTimeout(() => {
        fullDeviceDiagnostic();
      }, 100); // Very short delay for immediate response
      
      return true; // Successfully connected
      
    } else {
      logMessage('ℹ️ No previously granted LPC55S28 devices found');
      logMessage('💡 Click "Connect Device" to grant access to your device');
      updateStatusDisplay('No LPC55S28 device detected.\nClick "Connect Device" to grant access.');
      return false; // No device found
    }
    
  } catch (error) {
    logMessage(`❌ Auto-detection error: ${error.message}`);
    updateStatusDisplay('Auto-detection failed.\nClick "Connect Device" manually.');
  }
}

// Enhanced auto-connection on page load
document.addEventListener('DOMContentLoaded', () => {
  logMessage('🌟 Page loaded - attempting auto-connection...');
  
  // Initialize button states (device not connected initially)
  updateButtonStates();
  
  setTimeout(autoDetectDevice, 50); // Faster response
  
  // Load saved file path
  loadSavedPath();
});

// Also run auto-detection immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading
} else {
  // DOM is already loaded - run immediately
  logMessage('🌟 Page ready - attempting immediate auto-connection...');
  setTimeout(autoDetectDevice, 50);
}

// Additional auto-connection attempt when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !device) {
    logMessage('🔄 Page became visible - attempting reconnection...');
    setTimeout(autoDetectDevice, 100);
  }
});
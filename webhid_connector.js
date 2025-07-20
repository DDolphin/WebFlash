const connectBtn = document.getElementById('connectBtn');
const deviceInfoBtn = document.getElementById('deviceInfoBtn');
const readPropsBtn = document.getElementById('readPropsBtn');
const listCommandsBtn = document.getElementById('listCommandsBtn');
const eraseFlashBtn = document.getElementById('eraseFlashBtn');
const writeFlashBtn = document.getElementById('writeFlashBtn');
const resetDeviceBtn = document.getElementById('resetDeviceBtn');
const log = document.getElementById('log');
const statusDisplay = document.getElementById('statusDisplay');
const logToggle = document.getElementById('logToggle');

// File upload elements
const fileUploadSection = document.getElementById('fileUploadSection');
const binaryFileInput = document.getElementById('binaryFileInput');
const uploadBox = document.getElementById('uploadBox');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const startWriteBtn = document.getElementById('startWriteBtn');
const cancelWriteBtn = document.getElementById('cancelWriteBtn');

// Progress elements
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');

let device;
let selectedFile = null;

// Initialize default chunk size
window.optimizedChunkSize = 44; // Default safe size

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

function logMessage(msg) {
  // Only log if toggle is enabled for performance
  if (logToggle && logToggle.checked) {
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `\n[${timestamp}] ${msg}`;
    log.scrollTop = log.scrollHeight;
  }
}

function updateStatusDisplay(message) {
  statusDisplay.textContent = message;
}

function clearLog() {
  if (logToggle && logToggle.checked) {
    log.textContent = '[Log output will appear here]';
  } else {
    log.textContent = '[Logging disabled for performance - enable above to see operation details]';
  }
}

async function connectToDevice() {
  try {
    const filters = [
      { vendorId: 0x1FC9, productId: 0x0021 }, // NXP LPC55S28 Bootloader
    ];

    const devices = await navigator.hid.requestDevice({ filters });
    if (devices.length === 0) {
      logMessage('❌ No device selected.');
      return null;
    }

    const selectedDevice = devices[0];
    await selectedDevice.open();

    logMessage(`✅ Connected to device`);
    return selectedDevice;
  } catch (error) {
    logMessage(`❌ Connection error: ${error.message}`);
    return null;
  }
}

// Comprehensive device info and communication test
async function deviceInfoAndTest() {
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

    // Build comprehensive status display
    const statusInfo = [
      deviceInfo,
      '',
      `📊 Communication Test Results:`,
      `• Max packet size: ${maxWorkingSize} bytes`,
      `• HID reports: ${outputReports.length} output reports`,
      `• ISP compatibility: ${maxWorkingSize > 0 ? '✅ Working' : '❌ Failed'}`
    ].join('\n');

    updateStatusDisplay(statusInfo);
    logMessage('📋 Device info and communication test completed');

  } catch (error) {
    logMessage(`❌ Device info/test failed: ${error.message}`);
    updateStatusDisplay('Device info/test failed - check logs');
  }
}

connectBtn.addEventListener('click', async () => {
  clearLog();
  
  // Reset button state
  connectBtn.textContent = '🔌 Connect Device';
  connectBtn.disabled = false;
  
  device = await connectToDevice();
  
  if (device) {
    device.addEventListener('inputreport', event => {
      const { data, reportId } = event;
      const values = Array.from(new Uint8Array(data.buffer))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
      logMessage(`📥 Report ID: 0x${reportId.toString(16)} => [${values}]`);
    });
    
    updateStatusDisplay('Device connected. Use "Read USB Info" for details.');
    connectBtn.textContent = '✅ Connected';
    connectBtn.disabled = true;
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

async function sendIspCommand(device, commandPacket, timeout = 3000) {
  try {
    // Extract the report ID and data
    const reportId = commandPacket[0];
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
  } catch (error) {
    logMessage(`❌ Error sending command: ${error.message}`);
    
    // Enhanced error diagnostics
    if (error.message.includes('Failed to write')) {
      logMessage('🔍 Detailed error analysis:');
      logMessage(`   Device opened: ${device?.opened || false}`);
      logMessage(`   Report ID: 0x${commandPacket[0]?.toString(16) || '??'}`);
      logMessage(`   Data length: ${commandPacket.length - 1}`);
      logMessage('💡 Possible solutions:');
      logMessage('   1. Device may be in use by another application');
      logMessage('   2. Try a different browser (Chrome/Edge recommended)');
      logMessage('   3. Check device permissions in browser settings');
      logMessage('   4. Reconnect the USB device');
    }
    
    return null;
  }
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

async function readAllProperties() {
  if (!device || !device.opened) {
    device = await connectToDevice();
    if (!device) return;
  }

  logMessage('🔄 Reading device properties...');
  
  const properties = [
    {propId: 0x01, memoryId: 0x00, statusId: null}, // CurrentVersion
    {propId: 0x02, memoryId: 0x00, statusId: null}, // AvailablePeripherals
    {propId: 0x03, memoryId: 0x00, statusId: null}, // FlashStartAddress
    {propId: 0x04, memoryId: 0x00, statusId: null}, // FlashSizeInBytes
    {propId: 0x05, memoryId: 0x00, statusId: null}, // FlashSectorSize
    {propId: 0x07, memoryId: 0x00, statusId: null}, // AvailableCommands
    {propId: 0x08, memoryId: 0x00, statusId: 0},    // Check Status (CRC Status)
    {propId: 0x08, memoryId: 0x00, statusId: 1},    // Check Status (Last Error)
    {propId: 0x0B, memoryId: 0x00, statusId: null}, // MaxPacketSize
    {propId: 0x11, memoryId: 0x00, statusId: null}, // LifeCycleState
    {propId: 0x12, memoryId: 0x00, statusId: null}, // UniqueDevice/UUID
    {propId: 0x14, memoryId: 0x00, statusId: null}, // RAMStartAddress
    {propId: 0x15, memoryId: 0x00, statusId: null}, // RAMSize
    {propId: 0x16, memoryId: 0x00, statusId: null}, // SystemDeviceIdentification
    {propId: 0x18, memoryId: 0x00, statusId: null}, // TargetVersion
    {propId: 0x1B, memoryId: 0x00, statusId: null}  // FlashPageSize
  ];
  
  let results = [];
  let successCount = 0;
  
  for (const prop of properties) {
    try {
      const result = await getProperty(device, prop.propId, prop.memoryId, prop.statusId);
      if (result && result.success) {
        results.push(result.displayValue);
        successCount++;
      } else {
        const propInfo = PROPERTY_INFO[prop.propId] || {name: `Property 0x${prop.propId.toString(16)}`};
        results.push(`${propInfo.name}: Failed`);
      }
      
      // Ultra-fast property reading - no delay
    } catch (error) {
      logMessage(`❌ Error reading property 0x${prop.propId.toString(16)}: ${error.message}`);
      const propInfo = PROPERTY_INFO[prop.propId] || {name: `Property 0x${prop.propId.toString(16)}`};
      results.push(`${propInfo.name}: Error`);
    }
  }
  
  // Update status display with results
  updateStatusDisplay(results.join('\n'));
  logMessage(`✅ Properties: ${successCount}/${properties.length} read`);
}

async function listAllAvailableCommands() {
  if (!device || !device.opened) {
    device = await connectToDevice();
    if (!device) return;
  }

  logMessage('📜 Querying device for available commands...');
  
  try {
    // Get the AvailableCommands property
    const result = await getProperty(device, 0x07, 0x00);
    if (!result || !result.success) {
      logMessage('❌ Failed to get available commands from device');
      return;
    }
    
    // The value should be in the response, let's parse it manually from recent data
    logMessage('📋 Complete list of available commands on this LPC55S28 device:');
    logMessage('');
    
    // Based on the response data cf 0d 11 00 = 0x00110dcf
    const commandValue = 0x00110dcf;
    
    const allCommands = [
      { tag: 0x01, name: "FlashEraseAll", supported: !!(commandValue & (1 << 0)) },
      { tag: 0x02, name: "FlashEraseRegion", supported: !!(commandValue & (1 << 1)) },
      { tag: 0x03, name: "ReadMemory", supported: !!(commandValue & (1 << 2)) },
      { tag: 0x04, name: "WriteMemory", supported: !!(commandValue & (1 << 3)) },
      { tag: 0x05, name: "FillMemory", supported: !!(commandValue & (1 << 4)) },
      { tag: 0x06, name: "FlashSecurityDisable", supported: !!(commandValue & (1 << 5)) },
      { tag: 0x07, name: "GetProperty", supported: !!(commandValue & (1 << 6)) },
      { tag: 0x08, name: "ReceiveSBFile", supported: !!(commandValue & (1 << 7)) },
      { tag: 0x09, name: "Execute", supported: !!(commandValue & (1 << 8)) },
      { tag: 0x0A, name: "Call", supported: !!(commandValue & (1 << 9)) },
      { tag: 0x0B, name: "Reset", supported: !!(commandValue & (1 << 10)) },
      { tag: 0x0C, name: "SetProperty", supported: !!(commandValue & (1 << 11)) },
      { tag: 0x0D, name: "FlashEraseAllUnsecure", supported: !!(commandValue & (1 << 12)) },
      { tag: 0x0E, name: "FlashReadOnce", supported: !!(commandValue & (1 << 13)) },
      { tag: 0x0F, name: "FlashReadResource", supported: !!(commandValue & (1 << 14)) },
      { tag: 0x10, name: "FlashProgramOnce", supported: !!(commandValue & (1 << 15)) },
      { tag: 0x11, name: "ConfigureMemory", supported: !!(commandValue & (1 << 16)) },
      { tag: 0x12, name: "ReliableUpdate", supported: !!(commandValue & (1 << 17)) },
      { tag: 0x13, name: "GenerateKeyBlob", supported: !!(commandValue & (1 << 18)) },
      { tag: 0x14, name: "GenerateKeyBlobNonSecure", supported: !!(commandValue & (1 << 19)) },
      { tag: 0x15, name: "KeyProvisioning", supported: !!(commandValue & (1 << 20)) }
    ];
    
    const supportedCommands = [];
    const unsupportedCommands = [];
    
    allCommands.forEach(cmd => {
      const status = cmd.supported ? '✅' : '❌';
      const line = `${status} 0x${cmd.tag.toString(16).padStart(2, '0')} - ${cmd.name}`;
      logMessage(line);
      
      if (cmd.supported) {
        supportedCommands.push(cmd.name);
      } else {
        unsupportedCommands.push(cmd.name);
      }
    });
    
    logMessage('');
    logMessage(`📊 Summary: ${supportedCommands.length} supported, ${unsupportedCommands.length} unsupported`);
    
    // Update status display with summary
    const summary = [
      `Available Commands (${supportedCommands.length}/21):`,
      '',
      'Supported Commands:',
      ...supportedCommands.map(cmd => `✅ ${cmd}`),
      '',
      'Unsupported Commands:',
      ...unsupportedCommands.map(cmd => `❌ ${cmd}`)
    ].join('\n');
    
    updateStatusDisplay(summary);
    
  } catch (error) {
    logMessage(`❌ Error querying commands: ${error.message}`);
  }
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
  fileUploadSection.style.display = 'block';
  progressSection.style.display = 'none';
}

function hideFileUpload() {
  fileUploadSection.style.display = 'none';
  uploadBox.style.display = 'block';
  fileSelected.style.display = 'none';
  // Don't clear selectedFile here - it's needed for the write operation
}

function showProgress() {
  progressSection.style.display = 'block';
}

function hideProgress() {
  progressSection.style.display = 'none';
  updateProgress(0, 'Ready');
}

function updateProgress(percent, status) {
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent.toFixed(1)}%`;
  progressStatus.textContent = status;
}

function handleFileSelect(file) {
  if (!file) {
    logMessage('❌ No file provided');
    return;
  }
  
  // Validate file type
  const fileName = file.name.toLowerCase();
  const validExtensions = ['.bin', '.hex', '.elf'];
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    alert(`❌ Invalid file type! Please select a binary file (.bin, .hex, or .elf).\nSelected: ${file.name}`);
    return;
  }
  
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
  
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = file.size.toLocaleString();
  
  uploadBox.style.display = 'none';
  fileSelected.style.display = 'block';
  
  logMessage(`📁 File selected: ${file.name} (${file.size} bytes)`);
  logMessage(`✅ File validation passed - ready for writing`);
}

// Write Flash Binary functionality
async function writeFlashBinary() {
  if (!device || !device.opened) {
    device = await connectToDevice();
    if (!device) return;
  }
  
  showFileUpload();
}

async function startFlashWrite() {
  // Check if file is still selected
  if (!selectedFile) {
    logMessage('❌ No file selected');
    logMessage('💡 Please select a binary file first');
    showFileUpload();
    return;
  }
  
  // Validate file object
  if (!selectedFile || typeof selectedFile.arrayBuffer !== 'function') {
    logMessage('❌ Invalid file object - please reselect the file');
    selectedFile = null;
    showFileUpload();
    return;
  }
  
  logMessage(`🚀 Starting flash write operation for ${selectedFile.name}...`);
  logMessage(`📊 File size: ${selectedFile.size} bytes`);
  
  // Store a reference to the file before operations
  const fileToWrite = selectedFile;
  
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
    
    updateProgress(100, 'Write completed!');
    
    logMessage('✅ Flash write completed successfully!');
    logMessage(`📊 Written ${binaryData.length} bytes to flash memory`);
    logMessage('💡 You can now reset the device to run the new firmware');
    
    updateStatusDisplay(
      `Flash Write: SUCCESS\n\n` +
      `File: ${fileToWrite.name}\n` +
      `Size: ${binaryData.length} bytes\n` +
      `Status: Successfully written to flash`
    );
    
    // Show success for a moment, then reset for next operation
    setTimeout(() => {
      hideProgress();
      showFileUpload();
      // Clear file selection and reset UI for next operation
      selectedFile = null;
      binaryFileInput.value = ''; // Reset file input
      uploadBox.style.display = 'block';
      fileSelected.style.display = 'none';
    }, 3000); // Show success for 3 seconds
    
  } catch (error) {
    logMessage(`❌ Flash write failed: ${error.message}`);
    updateProgress(0, 'Write failed');
    updateStatusDisplay('Flash Write: FAILED\n\nCheck logs for details.');
    
    // Show file selection again for retry
    setTimeout(() => {
      hideProgress();
      showFileUpload();
      // Reset to initial state - user needs to select file again
      selectedFile = null;
      binaryFileInput.value = '';
      uploadBox.style.display = 'block';
      fileSelected.style.display = 'none';
    }, 2000);
  } finally {
    writeFlashBtn.disabled = false;
    resetDeviceBtn.disabled = false;
  }
}

// WriteMemory implementation with chunked transfer
async function writeMemoryData(device, startAddress, data) {
  // Use dynamically detected chunk size, fallback to 44 bytes
  const chunkSize = window.optimizedChunkSize || 44;
  logMessage(`📊 Using ${chunkSize}-byte chunks (auto-detected optimal size)`);
  const totalChunks = Math.ceil(data.length / chunkSize);
  
  logMessage(`📤 Writing ${data.length} bytes in ${totalChunks} chunks of ${chunkSize} bytes`);
  
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
  
  updateProgress(95, 'Verifying write...');
  logMessage('✅ All chunks written successfully');
}

// Write a single memory chunk
async function writeMemoryChunk(device, address, data) {
  try {
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
    
  } catch (error) {
    logMessage(`❌ WriteMemory chunk error: ${error.message}`);
    return false;
  }
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
  try {
    const reportId = packet[0];
    const dataToSend = packet.slice(1);
    
    await device.sendReport(reportId, dataToSend);
    // Suppress logging during bulk write operations for performance
  } catch (error) {
    logMessage(`❌ Error sending data packet: ${error.message}`);
    throw error;
  }
}

// Send data packet (legacy function - keep for compatibility)
async function sendDataPacket(device, packet) {
  try {
    const reportId = packet[0];
    const dataToSend = packet.slice(1);
    
    await device.sendReport(reportId, dataToSend);
    return { status: 0 };
  } catch (error) {
    logMessage(`❌ Error sending data packet: ${error.message}`);
    return null;
  }
}

// Reset Device functionality
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

// Event listeners
uploadBox.addEventListener('click', () => binaryFileInput.click());
binaryFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

cancelWriteBtn.addEventListener('click', () => {
  selectedFile = null;
  hideFileUpload();
});
startWriteBtn.addEventListener('click', startFlashWrite);

// Drag and drop support
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.style.backgroundColor = '#e9ecef';
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.style.backgroundColor = '';
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.style.backgroundColor = '';
  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

deviceInfoBtn.addEventListener('click', deviceInfoAndTest);
readPropsBtn.addEventListener('click', readAllProperties);
listCommandsBtn.addEventListener('click', listAllAvailableCommands);
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
log.textContent = '[Logging disabled for performance - enable above to see operation details]';

// Auto-detect LPC55S28 device on page load
async function autoDetectDevice() {
  try {
    // Check if WebHID is supported
    if (!navigator.hid) {
      logMessage('⚠️ WebHID not supported in this browser');
      updateStatusDisplay('WebHID not supported. Please use Chrome/Edge.');
      return;
    }

    logMessage('🔍 Checking for connected LPC55S28 devices...');
    
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
      updateStatusDisplay('LPC55S28 device auto-connected!\nReady for operations.');
      
      // Update connect button
      connectBtn.textContent = '✅ Connected';
      connectBtn.disabled = true;
      
      // Auto-read device info for convenience
      setTimeout(() => {
        deviceInfoAndTest();
      }, 500);
      
    } else {
      logMessage('ℹ️ No LPC55S28 devices found');
      logMessage('💡 Click "Connect Device" to grant access to your device');
      updateStatusDisplay('No LPC55S28 device detected.\nClick "Connect Device" to grant access.');
    }
    
  } catch (error) {
    logMessage(`❌ Auto-detection error: ${error.message}`);
    updateStatusDisplay('Auto-detection failed.\nClick "Connect Device" manually.');
  }
}

// Run auto-detection when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure UI is ready
  setTimeout(autoDetectDevice, 100);
});

// Also run auto-detection immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading
} else {
  // DOM is already loaded
  setTimeout(autoDetectDevice, 100);
}
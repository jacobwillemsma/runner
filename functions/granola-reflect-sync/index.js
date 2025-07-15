const fs = require('fs');
const path = require('path');
const GranolaClient = require('../../shared/clients/granola');
const ReflectClient = require('../../shared/clients/reflect');
const logger = require('../../shared/logger');

// Constants
const CONSTANTS = {
  RATE_LIMIT_DELAY: 500,
  DEFAULT_START_DATE: '2025-07-15T00:00:00.000Z',
  TRACKING_FILE_NAME: 'granola-sync-tracking.json'
};

const DEFAULT_TRACKING_DATA = {
  processedDocuments: [],
  startDate: CONSTANTS.DEFAULT_START_DATE,
  lastSync: null,
  totalProcessed: 0,
  lastError: null
};

/**
 * Loads tracking data from file or returns default data
 * @param {string} trackingFilePath - Path to tracking file
 * @returns {Object} Tracking data object
 */
function loadTrackingData(trackingFilePath) {
  try {
    if (!fs.existsSync(trackingFilePath)) {
      return { ...DEFAULT_TRACKING_DATA };
    }

    const trackingContent = fs.readFileSync(trackingFilePath, 'utf8');
    const loadedData = JSON.parse(trackingContent);
    
    // Merge with defaults to ensure all properties exist
    return { ...DEFAULT_TRACKING_DATA, ...loadedData };
  } catch (error) {
    logger.error('Error loading tracking data:', error);
    return { ...DEFAULT_TRACKING_DATA };
  }
}

/**
 * Saves tracking data to file
 * @param {string} trackingFilePath - Path to tracking file
 * @param {Object} trackingData - Data to save
 * @returns {boolean} Success status
 */
function saveTrackingData(trackingFilePath, trackingData) {
  try {
    // Ensure directory exists
    const dir = path.dirname(trackingFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(trackingFilePath, JSON.stringify(trackingData, null, 2));
    return true;
  } catch (error) {
    logger.error('Error saving tracking data:', error);
    return false;
  }
}

/**
 * Processes a single document and creates a note in Reflect
 * @param {Object} doc - Document to process
 * @param {ReflectClient} reflectClient - Reflect client instance
 * @returns {Promise<boolean>} Success status
 */
async function processDocument(doc, reflectClient) {
  try {
    console.log(`Processing: ${doc.title}`);
    
    await reflectClient.createNoteFromGranola(doc);
    
    console.log(`✓ Created note in Reflect: ${doc.title}`);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, CONSTANTS.RATE_LIMIT_DELAY));
    
    return true;
  } catch (error) {
    console.error(`✗ Error processing ${doc.title}:`, error.message);
    logger.error(`Error processing Granola document ${doc.id}:`, error);
    return false;
  }
}

/**
 * Processes all new documents
 * @param {Array} newDocuments - Array of documents to process
 * @param {ReflectClient} reflectClient - Reflect client instance
 * @param {Object} trackingData - Current tracking data
 * @returns {Promise<Object>} Processing results
 */
async function processDocuments(newDocuments, reflectClient, trackingData) {
  let processedCount = 0;
  let errorCount = 0;
  
  for (const doc of newDocuments) {
    const success = await processDocument(doc, reflectClient);
    
    if (success) {
      trackingData.processedDocuments.push(doc.id);
      processedCount++;
    } else {
      errorCount++;
    }
  }
  
  return { processedCount, errorCount };
}

/**
 * Updates tracking data with error information
 * @param {string} trackingFilePath - Path to tracking file
 * @param {string} errorMessage - Error message
 */
function updateTrackingWithError(trackingFilePath, errorMessage) {
  try {
    if (fs.existsSync(trackingFilePath)) {
      const trackingData = loadTrackingData(trackingFilePath);
      trackingData.lastError = errorMessage;
      trackingData.lastSync = new Date().toISOString();
      saveTrackingData(trackingFilePath, trackingData);
    }
  } catch (trackingError) {
    logger.error('Failed to update tracking file:', trackingError);
  }
}

/**
 * Logs sync status information
 * @param {Object} trackingData - Current tracking data
 */
function logSyncStatus(trackingData) {
  console.log(`Last sync: ${trackingData.lastSync ? new Date(trackingData.lastSync).toLocaleString() : 'Never'}`);
  console.log(`Total processed: ${trackingData.totalProcessed}`);
}

/**
 * Logs sync results
 * @param {number} processedCount - Number of documents processed
 * @param {number} errorCount - Number of errors encountered
 */
function logSyncResults(processedCount, errorCount) {
  console.log(`Sync completed: ${processedCount} notes created, ${errorCount} errors`);
  
  if (processedCount > 0) {
    console.log(`Successfully synced ${processedCount} Granola notes to Reflect!`);
  }
  
  if (errorCount > 0) {
    console.log(`Warning: ${errorCount} documents failed to process`);
  }
}

module.exports = {
  name: "Sync Granola to Reflect",
  description: "Take Granola Notes to Reflect",
  schedule: "0 9 * * *", // Daily at 9 AM
  execute: async () => {
    console.log("Starting Granola to Reflect sync...");
    
    const trackingFilePath = path.join(__dirname, '../../data', CONSTANTS.TRACKING_FILE_NAME);
    
    try {
      // Load tracking data
      let trackingData = loadTrackingData(trackingFilePath);
      logSyncStatus(trackingData);
      
      // Initialize clients
      const granolaClient = new GranolaClient();
      const reflectClient = new ReflectClient();
      
      // Validate Reflect configuration
      reflectClient.validateConfig();
      console.log("Reflect configuration validated");
      
      // Get Granola documents
      console.log("Fetching documents from Granola...");
      const granolaDocuments = await granolaClient.getMeetingDocuments(trackingData.startDate);
      console.log(`Found ${granolaDocuments.length} documents from Granola`);
      
      // Filter out already processed documents
      const newDocuments = granolaDocuments.filter(doc => !trackingData.processedDocuments.includes(doc.id));
      console.log(`${newDocuments.length} new documents to process`);
      
      if (newDocuments.length === 0) {
        console.log("No new documents to sync");
        trackingData.lastSync = new Date().toISOString();
        trackingData.lastError = null;
        saveTrackingData(trackingFilePath, trackingData);
        return;
      }
      
      // Process all new documents
      const { processedCount, errorCount } = await processDocuments(newDocuments, reflectClient, trackingData);
      
      // Update tracking data
      trackingData.totalProcessed += processedCount;
      trackingData.lastSync = new Date().toISOString();
      trackingData.lastError = errorCount > 0 ? `${errorCount} documents failed to process` : null;
      
      // Save tracking data
      saveTrackingData(trackingFilePath, trackingData);
      
      // Log results
      logSyncResults(processedCount, errorCount);
      
    } catch (error) {
      console.error("Sync failed:", error.message);
      logger.error("Granola to Reflect sync failed:", error);
      
      // Update tracking with error
      updateTrackingWithError(trackingFilePath, error.message);
      
      throw error;
    }
  }
};
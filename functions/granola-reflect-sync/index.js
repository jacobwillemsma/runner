const fs = require('fs');
const path = require('path');
const GranolaClient = require('../../shared/clients/granola');
const ReflectClient = require('../../shared/clients/reflect');
const logger = require('../../shared/logger');

module.exports = {
  name: "Sync Granola to Reflect",
  description: "Take Granola Notes to Reflect",
  schedule: "0 9 * * *", // Daily at 9 AM
  execute: async () => {
    console.log("Starting Granola to Reflect sync...");
    
    const trackingFilePath = path.join(__dirname, '../../data/granola-sync-tracking.json');
    
    try {
      // Load tracking data
      let trackingData = {
        processedDocuments: [],
        startDate: "2025-07-15T00:00:00.000Z",
        lastSync: null,
        totalProcessed: 0,
        lastError: null
      };
      
      if (fs.existsSync(trackingFilePath)) {
        const trackingContent = fs.readFileSync(trackingFilePath, 'utf8');
        trackingData = { ...trackingData, ...JSON.parse(trackingContent) };
      }
      
      console.log(`Last sync: ${trackingData.lastSync ? new Date(trackingData.lastSync).toLocaleString() : 'Never'}`);
      console.log(`Total processed: ${trackingData.totalProcessed}`);
      
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
      const newDocuments = granolaDocuments.filter(doc => 
        !trackingData.processedDocuments.includes(doc.id)
      );
      
      console.log(`${newDocuments.length} new documents to process`);
      
      if (newDocuments.length === 0) {
        console.log("No new documents to sync");
        trackingData.lastSync = new Date().toISOString();
        trackingData.lastError = null;
        
        // Save tracking data
        fs.writeFileSync(trackingFilePath, JSON.stringify(trackingData, null, 2));
        return;
      }
      
      // Process each new document
      let processedCount = 0;
      let errorCount = 0;
      
      for (const doc of newDocuments) {
        try {
          console.log(`Processing: ${doc.title}`);
          
          // Create note in Reflect
          const reflectNote = await reflectClient.createNoteFromGranola(doc);
          
          // Mark as processed
          trackingData.processedDocuments.push(doc.id);
          processedCount++;
          
          console.log(`✓ Created note in Reflect: ${doc.title}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          errorCount++;
          console.error(`✗ Error processing ${doc.title}:`, error.message);
          logger.error(`Error processing Granola document ${doc.id}:`, error);
          
          // Continue with other documents even if one fails
          continue;
        }
      }
      
      // Update tracking data
      trackingData.totalProcessed += processedCount;
      trackingData.lastSync = new Date().toISOString();
      trackingData.lastError = errorCount > 0 ? `${errorCount} documents failed to process` : null;
      
      // Save tracking data
      fs.writeFileSync(trackingFilePath, JSON.stringify(trackingData, null, 2));
      
      // Summary
      console.log(`Sync completed: ${processedCount} notes created, ${errorCount} errors`);
      
      if (processedCount > 0) {
        console.log(`Successfully synced ${processedCount} Granola notes to Reflect!`);
      }
      
      if (errorCount > 0) {
        console.log(`Warning: ${errorCount} documents failed to process`);
      }
      
    } catch (error) {
      console.error("Sync failed:", error.message);
      logger.error("Granola to Reflect sync failed:", error);
      
      // Update tracking with error
      try {
        if (fs.existsSync(trackingFilePath)) {
          const trackingContent = fs.readFileSync(trackingFilePath, 'utf8');
          const trackingData = JSON.parse(trackingContent);
          trackingData.lastError = error.message;
          trackingData.lastSync = new Date().toISOString();
          fs.writeFileSync(trackingFilePath, JSON.stringify(trackingData, null, 2));
        }
      } catch (trackingError) {
        logger.error("Failed to update tracking file:", trackingError);
      }
      
      throw error;
    }
  }
};
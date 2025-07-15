const ReflectClient = require('../../shared/clients/reflect');
const logger = require('../../shared/logger');

module.exports = {
  name: "Setup Daily Note",
  description: "Sets up daily note template with sections for reflection, todos, and logging",
  schedule: "0 5 * * *", // Daily at 5 AM
  execute: async () => {
    console.log("Setting up daily note template...");
    
    try {
      // Initialize Reflect client
      const reflectClient = new ReflectClient();
      
      // Validate Reflect configuration
      reflectClient.validateConfig();
      console.log("Reflect configuration validated");
      
      // Append each section separately to ensure proper formatting
      await reflectClient.appendToDailyNotes("### Morning Reflection");
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await reflectClient.appendToDailyNotes("### Tasks");
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await reflectClient.appendToDailyNotes("### Daily Log");
      
      console.log("✓ Daily note template set up successfully");
      
    } catch (error) {
      console.error("Failed to set up daily note template:", error.message);
      logger.error("Setup Daily Note failed:", error);
      throw error;
    }
  }
};
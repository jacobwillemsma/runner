module.exports = {
  name: "Simple Example",
  description: "A simple example function that just logs a message",
  schedule: "*/5 * * * *", // Every 5 minutes
  execute: async () => {
    console.log("Simple example function executed!");
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Simple example function completed!");
  }
};
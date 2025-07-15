const NotionClient = require('./clients/notion');
const SlackClient = require('./clients/slack');

module.exports = {
  name: "Sync Meeting Notes",
  description: "Syncs meeting notes from Notion to Slack",
  schedule: "0 9 * * *", // Daily at 9 AM
  execute: async () => {
    console.log("Starting meeting notes sync...");
    
    const notion = new NotionClient();
    const slack = new SlackClient();
    
    try {
      // Get meeting notes from Notion
      const meetingNote = await notion.getMeetingNotes();
      console.log(`Retrieved meeting note: ${meetingNote.title}`);
      
      // Format for Slack
      const slackMessage = await slack.formatMeetingNote(meetingNote);
      
      // Post to Slack
      const result = await slack.postToChannel('#general', slackMessage);
      
      if (result.ok) {
        console.log("Meeting notes successfully synced to Slack!");
      } else {
        throw new Error("Failed to post to Slack");
      }
    } catch (error) {
      console.error("Error syncing meeting notes:", error.message);
      throw error;
    }
  }
};
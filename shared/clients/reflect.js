const HttpUtils = require('../http-utils');
const logger = require('../logger');

class ReflectClient {
  constructor() {
    this.baseUrl = 'https://reflect.app/api';
    this.accessToken = process.env.REFLECT_ACCESS_TOKEN;
    this.graphId = process.env.REFLECT_GRAPH_ID;
  }

  /**
   * Validate required environment variables
   * @throws {Error} If required environment variables are missing
   */
  validateConfig() {
    const requiredVars = ['REFLECT_ACCESS_TOKEN', 'REFLECT_GRAPH_ID'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Create a new note in Reflect
   * @param {string} subject - The note's subject/title
   * @param {string} contentMarkdown - Note content in markdown format
   * @param {boolean} pinned - Whether to pin the note (optional)
   * @returns {Promise<Object>} Created note response
   */
  async createNote(subject, contentMarkdown, pinned = false) {
    try {
      this.validateConfig();

      const url = `${this.baseUrl}/graphs/${this.graphId}/notes`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const body = {
        subject,
        content_markdown: contentMarkdown,
        pinned
      };

      logger.debug(`Creating note in Reflect: ${subject}`);
      const response = await HttpUtils.post(url, body, headers);

      if (response.statusCode === 201 || response.statusCode === 200) {
        const noteData = response.json || JSON.parse(response.body);
        logger.info(`Successfully created note in Reflect: ${subject}`);
        return noteData;
      } else {
        throw new Error(`Failed to create note. Status: ${response.statusCode}, Body: ${response.body}`);
      }
    } catch (error) {
      logger.error('Error creating note in Reflect:', error);
      throw error;
    }
  }

  /**
   * Append text to daily notes
   * @param {string} text - Text to append
   * @param {string} date - ISO date string (optional, defaults to today)
   * @param {string} listName - List name to append to (optional)
   * @returns {Promise<Object>} Response from daily notes append
   */
  async appendToDailyNotes(text, date = null, listName = null) {
    try {
      this.validateConfig();

      const url = `${this.baseUrl}/graphs/${this.graphId}/daily-notes`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const body = {
        text,
        transform_type: 'list-append'
      };

      if (date) {
        body.date = date;
      }

      if (listName) {
        body.list_name = listName;
      }

      logger.debug(`Appending to daily notes in Reflect: ${text.substring(0, 50)}...`);
      const response = await HttpUtils.put(url, body, headers);

      if (response.statusCode === 200 || response.statusCode === 201) {
        const responseData = response.json || JSON.parse(response.body);
        logger.info('Successfully appended to daily notes in Reflect');
        return responseData;
      } else {
        throw new Error(`Failed to append to daily notes. Status: ${response.statusCode}, Body: ${response.body}`);
      }
    } catch (error) {
      logger.error('Error appending to daily notes in Reflect:', error);
      throw error;
    }
  }

  /**
   * Create a new link in Reflect
   * @param {string} url - The URL to link to
   * @param {string} title - Title of the link
   * @param {string} description - Description of the link (optional)
   * @param {Array} highlights - Array of highlight objects (optional)
   * @returns {Promise<Object>} Created link response
   */
  async createLink(url, title, description = null, highlights = null) {
    try {
      this.validateConfig();

      const apiUrl = `${this.baseUrl}/graphs/${this.graphId}/links`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const body = {
        url,
        title
      };

      if (description) {
        body.description = description;
      }

      if (highlights) {
        body.highlights = highlights;
      }

      logger.debug(`Creating link in Reflect: ${title}`);
      const response = await HttpUtils.post(apiUrl, body, headers);

      if (response.statusCode === 201 || response.statusCode === 200) {
        const linkData = response.json || JSON.parse(response.body);
        logger.info(`Successfully created link in Reflect: ${title}`);
        return linkData;
      } else {
        throw new Error(`Failed to create link. Status: ${response.statusCode}, Body: ${response.body}`);
      }
    } catch (error) {
      logger.error('Error creating link in Reflect:', error);
      throw error;
    }
  }

  /**
   * Format Granola meeting document for Reflect
   * @param {Object} granolaDoc - Granola document object
   * @returns {Object} Formatted data for Reflect note creation
   */
  formatGranolaDocument(granolaDoc) {
    const { title, content, createdAt, updatedAt } = granolaDoc;
    
    // Create a formatted subject line
    const date = new Date(createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const subject = `${title} - ${date}`;

    // Create formatted markdown content with metadata
    const formattedContent = [
      `# ${title}`,
      '',
      `**Date:** ${date}`,
      `**Source:** Granola`,
      `**Created:** ${new Date(createdAt).toLocaleString()}`,
      updatedAt && updatedAt !== createdAt ? `**Updated:** ${new Date(updatedAt).toLocaleString()}` : null,
      '',
      '---',
      '',
      content
    ].filter(Boolean).join('\n');

    return {
      subject,
      content_markdown: formattedContent,
      pinned: false
    };
  }

  /**
   * Create a note from Granola document
   * @param {Object} granolaDoc - Granola document object
   * @returns {Promise<Object>} Created note response
   */
  async createNoteFromGranola(granolaDoc) {
    try {
      const formattedData = this.formatGranolaDocument(granolaDoc);
      return await this.createNote(
        formattedData.subject,
        formattedData.content_markdown,
        formattedData.pinned
      );
    } catch (error) {
      logger.error(`Error creating note from Granola document ${granolaDoc.id}:`, error);
      throw error;
    }
  }
}

module.exports = ReflectClient;
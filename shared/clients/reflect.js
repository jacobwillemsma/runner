const HttpUtils = require('../http-utils');
const logger = require('../logger');

// Constants
const REFLECT_CONSTANTS = {
  BASE_URL: 'https://reflect.app/api',
  SUCCESS_STATUS_CODES: [200, 201],
  REQUIRED_ENV_VARS: ['REFLECT_ACCESS_TOKEN', 'REFLECT_GRAPH_ID'],
  DAILY_NOTES_TRANSFORM_TYPE: 'list-append',
  LOG_PREVIEW_LENGTH: 50
};

class ReflectClient {
  constructor() {
    this.baseUrl = REFLECT_CONSTANTS.BASE_URL;
    this.accessToken = process.env.REFLECT_ACCESS_TOKEN;
    this.graphId = process.env.REFLECT_GRAPH_ID;
  }

  /**
   * Validate required environment variables
   * @throws {Error} If required environment variables are missing
   */
  validateConfig() {
    const missing = REFLECT_CONSTANTS.REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Creates standard HTTP headers for API requests
   * @returns {Object} Headers object
   */
  createApiHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Validates API response and extracts data
   * @param {Object} response - HTTP response object
   * @param {string} operation - Operation name for error reporting
   * @returns {Object} Parsed response data
   * @throws {Error} If response indicates failure
   */
  validateAndParseResponse(response, operation) {
    if (!REFLECT_CONSTANTS.SUCCESS_STATUS_CODES.includes(response.statusCode)) {
      throw new Error(`Failed to ${operation}. Status: ${response.statusCode}, Body: ${response.body}`);
    }

    return response.json || JSON.parse(response.body);
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
      const headers = this.createApiHeaders();
      const body = {
        subject,
        content_markdown: contentMarkdown,
        pinned
      };

      logger.debug(`Creating note in Reflect: ${subject}`);
      const response = await HttpUtils.post(url, body, headers);
      const noteData = this.validateAndParseResponse(response, 'create note');
      
      logger.info(`Successfully created note in Reflect: ${subject}`);
      return noteData;
    } catch (error) {
      logger.error('Error creating note in Reflect:', error);
      throw error;
    }
  }

  /**
   * Creates request body for daily notes operation
   * @param {string} text - Text to append
   * @param {string} date - ISO date string (optional)
   * @param {string} listName - List name to append to (optional)
   * @returns {Object} Request body
   */
  createDailyNotesRequestBody(text, date, listName) {
    const body = {
      text,
      transform_type: REFLECT_CONSTANTS.DAILY_NOTES_TRANSFORM_TYPE
    };

    if (date) {
      body.date = date;
    }

    if (listName) {
      body.list_name = listName;
    }

    return body;
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
      const headers = this.createApiHeaders();
      const body = this.createDailyNotesRequestBody(text, date, listName);

      const preview = text.substring(0, REFLECT_CONSTANTS.LOG_PREVIEW_LENGTH);
      logger.debug(`Appending to daily notes in Reflect: ${preview}...`);
      
      const response = await HttpUtils.put(url, body, headers);
      const responseData = this.validateAndParseResponse(response, 'append to daily notes');
      
      logger.info('Successfully appended to daily notes in Reflect');
      return responseData;
    } catch (error) {
      logger.error('Error appending to daily notes in Reflect:', error);
      throw error;
    }
  }

  /**
   * Creates request body for link creation
   * @param {string} url - The URL to link to
   * @param {string} title - Title of the link
   * @param {string} description - Description of the link (optional)
   * @param {Array} highlights - Array of highlight objects (optional)
   * @returns {Object} Request body
   */
  createLinkRequestBody(url, title, description, highlights) {
    const body = { url, title };

    if (description) {
      body.description = description;
    }

    if (highlights) {
      body.highlights = highlights;
    }

    return body;
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
      const headers = this.createApiHeaders();
      const body = this.createLinkRequestBody(url, title, description, highlights);

      logger.debug(`Creating link in Reflect: ${title}`);
      const response = await HttpUtils.post(apiUrl, body, headers);
      const linkData = this.validateAndParseResponse(response, 'create link');
      
      logger.info(`Successfully created link in Reflect: ${title}`);
      return linkData;
    } catch (error) {
      logger.error('Error creating link in Reflect:', error);
      throw error;
    }
  }

  /**
   * Formats a date for display in notes
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Creates the subject line for a Granola document
   * @param {string} title - Document title
   * @param {string} createdAt - Creation date
   * @returns {string} Formatted subject line
   */
  createSubjectLine(title, createdAt) {
    const date = this.formatDate(createdAt);
    return `${title} - ${date}`;
  }

  /**
   * Creates metadata section for document content
   * @param {string} title - Document title
   * @param {string} createdAt - Creation date
   * @param {string} updatedAt - Update date (optional)
   * @returns {Array} Array of metadata lines
   */
  createMetadataSection(title, createdAt, updatedAt) {
    const date = this.formatDate(createdAt);
    const metadata = [
      `# ${title}`,
      '',
      `**Date:** ${date}`,
      `**Source:** Granola`,
      `**Created:** ${new Date(createdAt).toLocaleString()}`
    ];

    if (updatedAt && updatedAt !== createdAt) {
      metadata.push(`**Updated:** ${new Date(updatedAt).toLocaleString()}`);
    }

    return metadata;
  }

  /**
   * Format Granola meeting document for Reflect
   * @param {Object} granolaDoc - Granola document object
   * @returns {Object} Formatted data for Reflect note creation
   */
  formatGranolaDocument(granolaDoc) {
    const { title, content, createdAt, updatedAt } = granolaDoc;
    
    const subject = this.createSubjectLine(title, createdAt);
    const metadata = this.createMetadataSection(title, createdAt, updatedAt);
    
    // Create formatted markdown content with metadata
    const formattedContent = [
      ...metadata,
      '',
      '---',
      '',
      content
    ].join('\n');

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
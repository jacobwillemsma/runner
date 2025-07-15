const fs = require('fs');
const path = require('path');
const os = require('os');
const HttpUtils = require('../http-utils');
const logger = require('../logger');

// Constants
const GRANOLA_CONSTANTS = {
  BASE_URL: 'https://api.granola.ai/v2',
  USER_AGENT: 'Granola/5.354.0',
  CLIENT_VERSION: '5.354.0',
  CREDENTIALS_PATH: path.join(os.homedir(), 'Library/Application Support/Granola/supabase.json'),
  DEFAULT_LIMIT: 100,
  DEFAULT_OFFSET: 0,
  SUCCESS_STATUS_CODE: 200,
  MAX_RESPONSE_PREVIEW: 100
};

// ProseMirror node type constants
const NODE_TYPES = {
  HEADING: 'heading',
  PARAGRAPH: 'paragraph',
  BULLET_LIST: 'bulletList',
  ORDERED_LIST: 'orderedList',
  LIST_ITEM: 'listItem',
  BLOCKQUOTE: 'blockquote',
  CODE_BLOCK: 'codeBlock',
  TEXT: 'text',
  HARD_BREAK: 'hardBreak',
  HORIZONTAL_RULE: 'horizontalRule'
};

// Text mark types
const MARK_TYPES = {
  STRONG: 'strong',
  EMPHASIS: 'em',
  CODE: 'code',
  LINK: 'link'
};

class GranolaClient {
  constructor() {
    this.baseUrl = GRANOLA_CONSTANTS.BASE_URL;
    this.credentialsPath = GRANOLA_CONSTANTS.CREDENTIALS_PATH;
    this.accessToken = null;
  }

  /**
   * Validates that credentials file exists
   * @throws {Error} If credentials file doesn't exist
   */
  validateCredentialsFile() {
    if (!fs.existsSync(this.credentialsPath)) {
      throw new Error(`Credentials file not found at: ${this.credentialsPath}`);
    }
  }

  /**
   * Parses and validates credentials data
   * @param {Object} credentials - Parsed credentials object
   * @returns {string} Access token
   * @throws {Error} If credentials are invalid
   */
  extractAccessToken(credentials) {
    if (!credentials.cognito_tokens) {
      throw new Error('No cognito_tokens found in credentials file');
    }

    const cognitoTokens = JSON.parse(credentials.cognito_tokens);
    const accessToken = cognitoTokens.access_token;
    
    if (!accessToken) {
      throw new Error('No access token found in credentials file');
    }

    return accessToken;
  }

  /**
   * Load Granola credentials from supabase.json
   * @returns {Promise<string>} Access token
   */
  async loadCredentials() {
    try {
      this.validateCredentialsFile();

      const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);
      
      this.accessToken = this.extractAccessToken(credentials);
      logger.debug('Successfully loaded Granola credentials');
      return this.accessToken;
    } catch (error) {
      logger.error('Error loading Granola credentials:', error);
      throw error;
    }
  }

  /**
   * Ensures access token is loaded
   * @returns {Promise<void>}
   */
  async ensureAuthenticated() {
    if (!this.accessToken) {
      await this.loadCredentials();
    }
  }

  /**
   * Creates HTTP headers for API requests
   * @returns {Object} Headers object
   */
  createApiHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'User-Agent': GRANOLA_CONSTANTS.USER_AGENT,
      'X-Client-Version': GRANOLA_CONSTANTS.CLIENT_VERSION
    };
  }

  /**
   * Creates request body for document fetching
   * @param {number} limit - Number of documents to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Object} Request body
   */
  createDocumentRequestBody(limit, offset) {
    return {
      limit,
      offset,
      include_last_viewed_panel: true
    };
  }

  /**
   * Parses API response data
   * @param {Object} response - HTTP response object
   * @returns {Object} Parsed response data
   * @throws {Error} If parsing fails
   */
  parseApiResponse(response) {
    if (response.json) {
      return response.json;
    }

    try {
      return JSON.parse(response.body);
    } catch (parseError) {
      const preview = response.body.substring(0, GRANOLA_CONSTANTS.MAX_RESPONSE_PREVIEW);
      throw new Error(`Failed to parse JSON response: ${parseError.message}. Response: ${preview}...`);
    }
  }

  /**
   * Fetch documents from Granola API
   * @param {number} limit - Number of documents to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} API response with documents
   */
  async fetchDocuments(limit = GRANOLA_CONSTANTS.DEFAULT_LIMIT, offset = GRANOLA_CONSTANTS.DEFAULT_OFFSET) {
    try {
      await this.ensureAuthenticated();

      const url = `${this.baseUrl}/get-documents`;
      const headers = this.createApiHeaders();
      const body = this.createDocumentRequestBody(limit, offset);

      const response = await HttpUtils.post(url, body, headers);
      
      if (response.statusCode !== GRANOLA_CONSTANTS.SUCCESS_STATUS_CODE) {
        throw new Error(`API request failed with status ${response.statusCode}: ${response.body}`);
      }

      const data = this.parseApiResponse(response);
      
      logger.debug(`Successfully fetched ${data.docs?.length || 0} documents from Granola`);
      
      return data;
    } catch (error) {
      logger.error('Error fetching documents from Granola:', error);
      throw error;
    }
  }

  /**
   * Processes text formatting marks for markdown conversion
   * @param {string} text - Original text
   * @param {Array} marks - Array of text formatting marks
   * @returns {string} Formatted text with markdown
   */
  applyTextMarks(text, marks) {
    if (!marks || marks.length === 0) {
      return text;
    }

    let formattedText = text;
    
    marks.forEach(mark => {
      switch (mark.type) {
        case MARK_TYPES.STRONG:
          formattedText = `**${formattedText}**`;
          break;
        case MARK_TYPES.EMPHASIS:
          formattedText = `*${formattedText}*`;
          break;
        case MARK_TYPES.CODE:
          formattedText = `\`${formattedText}\``;
          break;
        case MARK_TYPES.LINK:
          const href = mark.attrs?.href || '';
          formattedText = `[${formattedText}](${href})`;
          break;
      }
    });

    return formattedText;
  }

  /**
   * Processes list items for markdown conversion
   * @param {Array} nodeContent - Array of list item nodes
   * @param {Function} processNode - Node processing function
   * @param {boolean} isOrdered - Whether this is an ordered list
   * @returns {string} Formatted list items
   */
  processListItems(nodeContent, processNode, isOrdered = false) {
    const listItems = nodeContent
      .filter(item => item.type === NODE_TYPES.LIST_ITEM)
      .map((item, index) => {
        const itemContent = item.content?.map(processNode).join('').trim() || '';
        const prefix = isOrdered ? `${index + 1}. ` : '- ';
        return `${prefix}${itemContent}`;
      });
    
    return listItems.join('\n') + '\n\n';
  }

  /**
   * Processes a single ProseMirror node for markdown conversion
   * @param {Object} node - ProseMirror node
   * @returns {string} Converted markdown content
   */
  processNode(node) {
    if (!node || typeof node !== 'object') {
      return '';
    }

    const nodeType = node.type || '';
    const nodeContent = node.content || [];
    const text = node.text || '';
    const processNode = this.processNode.bind(this);

    switch (nodeType) {
      case NODE_TYPES.HEADING:
        const level = node.attrs?.level || 1;
        const headingText = nodeContent.map(processNode).join('');
        return `${'#'.repeat(level)} ${headingText}\n\n`;

      case NODE_TYPES.PARAGRAPH:
        const paraText = nodeContent.map(processNode).join('');
        return `${paraText}\n\n`;

      case NODE_TYPES.BULLET_LIST:
        return this.processListItems(nodeContent, processNode, false);

      case NODE_TYPES.ORDERED_LIST:
        return this.processListItems(nodeContent, processNode, true);

      case NODE_TYPES.BLOCKQUOTE:
        const quoteText = nodeContent.map(processNode).join('');
        return `> ${quoteText}\n\n`;

      case NODE_TYPES.CODE_BLOCK:
        const codeText = nodeContent.map(processNode).join('');
        return `\`\`\`\n${codeText}\n\`\`\`\n\n`;

      case NODE_TYPES.TEXT:
        return this.applyTextMarks(text, node.marks);

      case NODE_TYPES.HARD_BREAK:
        return '\n';

      case NODE_TYPES.HORIZONTAL_RULE:
        return '---\n\n';

      default:
        // For unknown node types, process children
        return nodeContent.map(processNode).join('');
    }
  }

  /**
   * Convert ProseMirror JSON to Markdown
   * @param {Object} content - ProseMirror content object
   * @returns {string} Converted markdown content
   */
  convertProseMirrorToMarkdown(content) {
    if (!content || !content.content) {
      return '';
    }

    return this.processNode(content).trim();
  }

  /**
   * Validates API response structure
   * @param {Object} response - API response object
   * @returns {boolean} Whether response is valid
   */
  validateApiResponse(response) {
    if (!response.docs || !Array.isArray(response.docs)) {
      logger.warn('No documents found in Granola response');
      return false;
    }
    return true;
  }

  /**
   * Checks if document should be processed based on date filter
   * @param {Object} doc - Document object
   * @param {Date} startDateTime - Start date for filtering
   * @returns {boolean} Whether document should be processed
   */
  shouldProcessDocument(doc, startDateTime) {
    const createdAt = new Date(doc.created_at);
    return createdAt >= startDateTime;
  }

  /**
   * Extracts content from document's last_viewed_panel
   * @param {Object} doc - Document object
   * @returns {string} Extracted content or empty string
   */
  extractDocumentContent(doc) {
    if (!doc.last_viewed_panel?.content?.type === 'doc') {
      return '';
    }

    const content = this.convertProseMirrorToMarkdown(doc.last_viewed_panel.content);
    
    if (!content.trim()) {
      logger.debug(`Skipping document '${doc.title}' - no content found`);
      return '';
    }

    return content;
  }

  /**
   * Transforms raw document into processed meeting document
   * @param {Object} doc - Raw document from API
   * @param {string} content - Extracted content
   * @returns {Object} Processed meeting document
   */
  transformDocument(doc, content) {
    return {
      id: doc.id,
      title: doc.title || 'Untitled Granola Note',
      content,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    };
  }

  /**
   * Get meeting documents from Granola with filtering
   * @param {string} startDate - ISO date string to filter documents from
   * @returns {Promise<Array>} Array of processed meeting documents
   */
  async getMeetingDocuments(startDate = '2025-07-15T00:00:00.000Z') {
    try {
      const response = await this.fetchDocuments();
      
      if (!this.validateApiResponse(response)) {
        return [];
      }

      const startDateTime = new Date(startDate);
      const meetingDocuments = [];

      for (const doc of response.docs) {
        if (!this.shouldProcessDocument(doc, startDateTime)) {
          continue;
        }

        const content = this.extractDocumentContent(doc);
        if (!content) {
          continue;
        }

        meetingDocuments.push(this.transformDocument(doc, content));
      }

      logger.info(`Processed ${meetingDocuments.length} meeting documents from Granola`);
      return meetingDocuments;
    } catch (error) {
      logger.error('Error getting meeting documents:', error);
      throw error;
    }
  }
}

module.exports = GranolaClient;
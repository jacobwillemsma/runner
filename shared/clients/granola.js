const fs = require('fs');
const path = require('path');
const os = require('os');
const HttpUtils = require('../http-utils');
const logger = require('../logger');

class GranolaClient {
  constructor() {
    this.baseUrl = 'https://api.granola.ai/v2';
    this.credentialsPath = path.join(os.homedir(), 'Library/Application Support/Granola/supabase.json');
    this.accessToken = null;
  }

  /**
   * Load Granola credentials from supabase.json
   * @returns {Promise<string>} Access token
   */
  async loadCredentials() {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found at: ${this.credentialsPath}`);
      }

      const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);
      
      if (!credentials.cognito_tokens) {
        throw new Error('No cognito_tokens found in credentials file');
      }

      const cognitoTokens = JSON.parse(credentials.cognito_tokens);
      const accessToken = cognitoTokens.access_token;
      
      if (!accessToken) {
        throw new Error('No access token found in credentials file');
      }

      this.accessToken = accessToken;
      logger.debug('Successfully loaded Granola credentials');
      return accessToken;
    } catch (error) {
      logger.error('Error loading Granola credentials:', error);
      throw error;
    }
  }

  /**
   * Fetch documents from Granola API
   * @param {number} limit - Number of documents to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} API response with documents
   */
  async fetchDocuments(limit = 100, offset = 0) {
    try {
      if (!this.accessToken) {
        await this.loadCredentials();
      }

      const url = `${this.baseUrl}/get-documents`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'Granola/5.354.0',
        'X-Client-Version': '5.354.0'
      };

      const body = {
        limit,
        offset,
        include_last_viewed_panel: true
      };

      const response = await HttpUtils.post(url, body, headers);
      
      if (response.statusCode !== 200) {
        throw new Error(`API request failed with status ${response.statusCode}: ${response.body}`);
      }

      let data;
      if (response.json) {
        data = response.json;
      } else {
        try {
          data = JSON.parse(response.body);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON response: ${parseError.message}. Response: ${response.body.substring(0, 100)}...`);
        }
      }
      
      logger.debug(`Successfully fetched ${data.docs?.length || 0} documents from Granola`);
      
      return data;
    } catch (error) {
      logger.error('Error fetching documents from Granola:', error);
      throw error;
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

    const processNode = (node) => {
      if (!node || typeof node !== 'object') {
        return '';
      }

      const nodeType = node.type || '';
      const nodeContent = node.content || [];
      const text = node.text || '';

      switch (nodeType) {
        case 'heading':
          const level = node.attrs?.level || 1;
          const headingText = nodeContent.map(processNode).join('');
          return `${'#'.repeat(level)} ${headingText}\n\n`;

        case 'paragraph':
          const paraText = nodeContent.map(processNode).join('');
          return `${paraText}\n\n`;

        case 'bulletList':
          const listItems = nodeContent
            .filter(item => item.type === 'listItem')
            .map(item => {
              const itemContent = item.content?.map(processNode).join('').trim() || '';
              return `- ${itemContent}`;
            });
          return listItems.join('\n') + '\n\n';

        case 'orderedList':
          const orderedItems = nodeContent
            .filter(item => item.type === 'listItem')
            .map((item, index) => {
              const itemContent = item.content?.map(processNode).join('').trim() || '';
              return `${index + 1}. ${itemContent}`;
            });
          return orderedItems.join('\n') + '\n\n';

        case 'blockquote':
          const quoteText = nodeContent.map(processNode).join('');
          return `> ${quoteText}\n\n`;

        case 'codeBlock':
          const codeText = nodeContent.map(processNode).join('');
          return `\`\`\`\n${codeText}\n\`\`\`\n\n`;

        case 'text':
          let formattedText = text;
          
          // Handle text formatting marks
          if (node.marks) {
            node.marks.forEach(mark => {
              switch (mark.type) {
                case 'strong':
                  formattedText = `**${formattedText}**`;
                  break;
                case 'em':
                  formattedText = `*${formattedText}*`;
                  break;
                case 'code':
                  formattedText = `\`${formattedText}\``;
                  break;
                case 'link':
                  const href = mark.attrs?.href || '';
                  formattedText = `[${formattedText}](${href})`;
                  break;
              }
            });
          }
          
          return formattedText;

        case 'hardBreak':
          return '\n';

        case 'horizontalRule':
          return '---\n\n';

        default:
          // For unknown node types, process children
          return nodeContent.map(processNode).join('');
      }
    };

    return processNode(content).trim();
  }

  /**
   * Get meeting documents from Granola with filtering
   * @param {string} startDate - ISO date string to filter documents from
   * @returns {Promise<Array>} Array of processed meeting documents
   */
  async getMeetingDocuments(startDate = '2025-07-15T00:00:00.000Z') {
    try {
      const response = await this.fetchDocuments();
      
      if (!response.docs || !Array.isArray(response.docs)) {
        logger.warn('No documents found in Granola response');
        return [];
      }

      const startDateTime = new Date(startDate);
      const meetingDocuments = [];

      for (const doc of response.docs) {
        // Filter by creation date
        const createdAt = new Date(doc.created_at);
        if (createdAt < startDateTime) {
          continue;
        }

        // Extract content from last_viewed_panel
        let content = '';
        if (doc.last_viewed_panel?.content?.type === 'doc') {
          content = this.convertProseMirrorToMarkdown(doc.last_viewed_panel.content);
        }

        if (!content.trim()) {
          logger.debug(`Skipping document '${doc.title}' - no content found`);
          continue;
        }

        meetingDocuments.push({
          id: doc.id,
          title: doc.title || 'Untitled Granola Note',
          content,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at
        });
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
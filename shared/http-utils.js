const https = require('https');
const http = require('http');
const zlib = require('zlib');

/**
 * HTTP utility functions for making requests
 */
class HttpUtils {
  /**
   * Make an HTTP/HTTPS request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  static async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Runner/1.0',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...options.headers
        }
      };

      const req = requestModule.request(requestOptions, (res) => {
        // Handle compressed responses
        let responseStream = res;
        const encoding = res.headers['content-encoding'];
        
        if (encoding === 'gzip') {
          responseStream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          responseStream = res.pipe(zlib.createInflate());
        }
        
        let data = '';
        
        responseStream.on('data', (chunk) => {
          data += chunk;
        });

        responseStream.on('end', () => {
          try {
            const result = {
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              json: null
            };

            // Try to parse JSON if content-type suggests it
            if (res.headers['content-type']?.includes('application/json')) {
              try {
                result.json = JSON.parse(data);
              } catch (jsonError) {
                // Not valid JSON, leave as string
              }
            }

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        
        responseStream.on('error', (error) => {
          reject(error);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Send body if provided
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Make a GET request
   * @param {string} url - The URL to request
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response object
   */
  static async get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  }

  /**
   * Make a POST request
   * @param {string} url - The URL to request
   * @param {Object} body - Request body
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response object
   */
  static async post(url, body, headers = {}) {
    return this.request(url, { method: 'POST', body, headers });
  }

  /**
   * Make a PUT request
   * @param {string} url - The URL to request
   * @param {Object} body - Request body
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response object
   */
  static async put(url, body, headers = {}) {
    return this.request(url, { method: 'PUT', body, headers });
  }

  /**
   * Make a DELETE request
   * @param {string} url - The URL to request
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response object
   */
  static async delete(url, headers = {}) {
    return this.request(url, { method: 'DELETE', headers });
  }

  /**
   * Download a file from URL
   * @param {string} url - The URL to download from
   * @param {string} filePath - Local file path to save to
   * @returns {Promise<void>}
   */
  static async downloadFile(url, filePath) {
    const fs = require('fs');
    const path = require('path');
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      const file = fs.createWriteStream(filePath);
      
      const req = requestModule.get(url, (res) => {
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      req.on('error', (error) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(error);
      });

      file.on('error', (error) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(error);
      });
    });
  }
}

module.exports = HttpUtils;
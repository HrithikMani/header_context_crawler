/**
 * HeaderContextCrawler - A class to crawl and capture elements above a start element
 * 
 * @example
 * // Using XPath
 * const crawler = new HeaderContextCrawler(
 *     '//*[@id="myElement"]',
 *     ["//h1", "//h2", "//span"]
 * );
 * const elements = crawler.crawl();
 * const texts = crawler.getElementTexts();
 * 
 * @example
 * // Using DOM element
 * const startElement = document.querySelector('#myElement');
 * const crawler = new HeaderContextCrawler(
 *     startElement,
 *     ["//h1", "//h2"],
 *     { debug: true }
 * );
 * const elements = crawler.crawl();
 * const texts = crawler.getElementTexts();
 */
class HeaderContextCrawler {
    /**
     * @param {string|Element} startElement - XPath string or DOM element to start from
     * @param {Array<string>} captureList - Array of element selectors like ["//h1", "//h2", "//span"]
     * @param {Object} options - Optional configuration
     * @param {boolean} options.debug - Enable debug logging (default: false)
     */
    constructor(startElement, captureList, options = {}) {
        this.startElement = this._resolveElement(startElement);
        this.captureList = captureList || [];
        this.debug = options.debug || false;
        this.capturedElements = [];
        
        // Translation system prompt - can be customized
        this.translationSystemPrompt = `You are a professional translator specializing in context-aware translations for medical and healthcare documentation systems.

CONTEXT STRUCTURE:
You will receive a JSON object with:
- "text": The primary text that needs translation (the target element's text)
- "stack": An array of contextual headers/labels, ordered from MOST relevant (top/index 0) to LEAST relevant (bottom/last index)

TRANSLATION GUIDELINES:
1. The "text" field is the PRIMARY content that must be translated
2. The "stack" provides hierarchical context - the first element in the stack is most closely associated with the text, and association decreases as you go down the stack
3. Use the context stack to understand domain-specific terminology, disambiguate meanings, and produce accurate translations
4. Maintain professional medical/technical terminology appropriate for the target language
5. Preserve any medical codes, IDs, or technical identifiers (e.g., ICD codes like "I50.814")
6. Keep formatting markers and punctuation appropriate for the target language
7. Make sure you translate as native as possible sometimes word by word translation might work against natural flow of the target language

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "translation": "the translated text here",
  "language": "target language code"
}

Do not include any explanation, markdown formatting, or additional text outside the JSON object.`;
    }

    /**
     * Resolve element from XPath or direct element reference
     * @private
     */
    _resolveElement(element) {
        if (typeof element === 'string') {
            return this._getElementByXPath(element);
        }
        return element;
    }

    /**
     * Get element by XPath
     * @private
     */
    _getElementByXPath(xpath) {
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    }

    /**
     * Check if element matches any selector in capture list
     * @private
     */
    _matchesCaptureList(element) {
        return this.captureList.some(selector => {
            const tagName = selector.replace('//', '').toUpperCase();
            return element.tagName === tagName;
        });
    }

    /**
     * Sort elements in document order (top to bottom)
     * @private
     */
    _sortByDocumentOrder(elements) {
        return elements.sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1;
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * Remove duplicate elements while maintaining order
     * @private
     */
    _removeDuplicates(elements) {
        const seen = new Set();
        const unique = [];
        for (const el of elements) {
            if (!seen.has(el)) {
                seen.add(el);
                unique.push(el);
            }
        }
        return unique;
    }

    /**
     * Log debug messages if debug mode is enabled
     * @private
     */
    _log(...args) {
        if (this.debug) {
            console.log('[HeaderContextCrawler]', ...args);
        }
    }

    /**
     * Main crawl method - traverses up the DOM and captures matching elements
     * @returns {Array<Element>} Array of captured elements in bottom-to-top order
     */
    crawl() {
        if (!this.startElement) {
            console.error("Start element not found");
            return [];
        }

        this._log("Starting crawl from element:", this.startElement);
        this._log("Capture list:", this.captureList);

        const capturedElements = [];
        let currentNode = this.startElement.parentElement;
        let level = 0;

        // Traverse all the way up to html element
        while (currentNode && currentNode.tagName !== 'HTML') {
            this._log(`Level ${level}: Checking ${currentNode.tagName}`);
            
            // Check previous siblings AND their descendants
            let sibling = currentNode.previousElementSibling;
            while (sibling) {
                const siblingMatches = [];
                
                // Check if sibling itself matches capture criteria
                if (this._matchesCaptureList(sibling)) {
                    siblingMatches.push(sibling);
                    this._log(`  Found matching sibling: ${sibling.tagName}`);
                }
                
                // Check all descendants of sibling for matches
                this.captureList.forEach(selector => {
                    const tagName = selector.replace('//', '').toLowerCase();
                    const matches = sibling.querySelectorAll(tagName);
                    if (matches.length > 0) {
                        this._log(`  Found ${matches.length} ${tagName} in descendants`);
                        matches.forEach(match => siblingMatches.push(match));
                    }
                });
                
                // Sort sibling matches in document order
                this._sortByDocumentOrder(siblingMatches);
                
                // Prepend to maintain bottom-to-top order overall
                capturedElements.unshift(...siblingMatches);
                
                sibling = sibling.previousElementSibling;
            }
            
            // Move up to parent
            currentNode = currentNode.parentElement;
            level++;
        }

        // Remove duplicates while maintaining order
        const uniqueElements = this._removeDuplicates(capturedElements);
        
        this._log(`Total unique elements found: ${uniqueElements.length}`);
        
        this.capturedElements = uniqueElements;
        return uniqueElements;
    }

    /**
     * Get text content from all captured elements with start element context
     * @param {Object} options - Optional configuration
     * @param {boolean} options.trim - Trim whitespace from text (default: true)
     * @param {boolean} options.skipEmpty - Skip elements with empty text (default: false)
     * @returns {Object} Object with text (start element text) and stack (array of captured element texts)
     */
    getContextStack(options = {}) {
        const trim = options.trim !== false;
        const skipEmpty = options.skipEmpty || false;
        
        // Get start element text
        const startText = this.startElement 
            ? (trim ? this.startElement.textContent.trim() : this.startElement.textContent)
            : '';
        
        // Get captured elements text
        let texts = this.capturedElements.map(el => {
            const text = el.textContent;
            return trim ? text.trim() : text;
        });
        
        if (skipEmpty) {
            texts = texts.filter(text => text.length > 0);
        }
        
        return {
            text: startText,
            stack: texts.reverse() // Reverse to get top-to-bottom order
        };
    }

    /**
     * Get captured elements as array of objects with metadata
     * @returns {Array<Object>} Array of objects with element, tagName, text, and xpath
     */
    getElementsWithMetadata() {
        return this.capturedElements.map((el, index) => ({
            index: index,
            element: el,
            tagName: el.tagName,
            text: el.textContent.trim(),
            xpath: this._getXPathForElement(el)
        }));
    }

    /**
     * Generate XPath for an element
     * @private
     */
    _getXPathForElement(element) {
        if (element.id !== '') {
            return `//*[@id="${element.id}"]`;
        }
        if (element === document.body) {
            return '/html/body';
        }
        
        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                return this._getXPathForElement(element.parentNode) + '/' + 
                       element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    /**
     * Get only elements of specific tag types
     * @param {Array<string>} tags - Array of tag names like ["H1", "H2"]
     * @returns {Array<Element>} Filtered elements
     */
    filterByTags(tags) {
        const upperTags = tags.map(t => t.toUpperCase());
        return this.capturedElements.filter(el => upperTags.includes(el.tagName));
    }

    /**
     * Print captured elements to console
     */
    print() {
        console.log("=== Captured Elements (Bottom to Top) ===");
        this.capturedElements.forEach((el, index) => {
            console.log(`${index + 1}. <${el.tagName}> ${el.textContent.trim()}`);
        });
    }

    /**
     * Get the total count of captured elements
     * @returns {number} Number of captured elements
     */
    count() {
        return this.capturedElements.length;
    }

    /**
     * Get captured elements as plain array
     * @returns {Array<Element>} Array of DOM elements
     */
    getElements() {
        return this.capturedElements;
    }

    /**
     * Set a custom translation system prompt
     * @param {string} prompt - Custom system prompt for translation
     * @example
     * crawler.setTranslationPrompt('You are a casual translator...');
     */
    setTranslationPrompt(prompt) {
        this.translationSystemPrompt = prompt;
        this._log('Translation prompt updated');
    }

    /**
     * Get the current translation system prompt
     * @returns {string} Current translation system prompt
     */
    getTranslationPrompt() {
        return this.translationSystemPrompt;
    }

/**
 * Translate the captured context text to a target language using Claude AI
 * @param {string} language - Target language (e.g., "Spanish", "French", "German", "es", "fr", "de")
 * @param {Object} options - Optional configuration
 * @param {string} options.apiKey - Anthropic API key (required)
 * @param {string} options.model - Model to use (default: "claude-sonnet-4-5-20250929")
 * @param {number} options.maxTokens - Max tokens for response (default: 2000)
 * @param {number} options.temperature - Temperature for response (default: 0.3 for consistency)
 * @param {string} options.systemPrompt - Custom system prompt (overrides instance prompt for this call only)
 * @param {string} options.proxyUrl - Proxy server URL (default: "http://localhost:3000/api/translate")
 * @returns {Promise<Object>} Object with {translation: string, language: string}
 * @throws {Error} If API call fails or API key is missing
 * 
 * @example
 * const crawler = new HeaderContextCrawler('#myElement', ['//h1', '//h2']);
 * crawler.crawl();
 * const result = await crawler.getTranslation('Spanish', { apiKey: 'your-api-key' });
 * console.log(result.translation); // "Empleador:"
 */
async getTranslation(language, options = {}) {
    // Validate API key
    if (!options.apiKey) {
        throw new Error('API key is required. Pass it in options.apiKey parameter.');
    }

    // Get context stack
    const contextData = this.getContextStack({ trim: true, skipEmpty: true });
    
    if (!contextData.text) {
        throw new Error('No text to translate. Make sure crawl() has been called first.');
    }

    // Prepare configuration
    const model = options.model || 'claude-sonnet-4-5-20250929';
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature || 0.3;
    const proxyUrl = options.proxyUrl || 'http://localhost:3000/api/translate';

    // Determine if we have context or just direct translation
    const hasContext = contextData.stack && contextData.stack.length > 0;
    
    let systemPrompt;
    let userMessage;
    
    if (hasContext) {
        // Use context-aware translation
        systemPrompt = options.systemPrompt || this.translationSystemPrompt;
        userMessage = `Translate the following to ${language}:\n\n${JSON.stringify(contextData, null, 2)}`;
    } else {
        // Direct translation without context
        systemPrompt = options.systemPrompt || `You are a professional translator.

Translate the provided text to the target language accurately and naturally.

For medical or technical terms:
- Maintain professional terminology
- Preserve any codes, IDs, or technical identifiers (e.g., ICD codes)
- Keep formatting and punctuation appropriate for the target language

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "translation": "the translated text here",
  "language": "target language code"
}

Do not include any explanation, markdown formatting, or additional text outside the JSON object.`;
        
        userMessage = `Translate the following text to ${language}:\n\n"${contextData.text}"`;
    }

    // Prepare API request payload
    const requestBody = {
        apiKey: options.apiKey,
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: userMessage
            }
        ]
    };

    this._log('Translation request:', {
        language,
        hasContext,
        contextData,
        model
    });

    try {
        // Make API call through proxy
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Check response status
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `API request failed with status ${response.status}: ${
                    errorData.error?.message || response.statusText
                }`
            );
        }

        // Parse response
        const data = await response.json();
        
        this._log('API response:', data);

        // Extract text from Claude's response
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Unexpected API response format');
        }

        const responseText = data.content[0].text.trim();
        
        // Parse JSON response from Claude
        let translationResult;
        try {
            translationResult = JSON.parse(responseText);
        } catch (parseError) {
            // If JSON parsing fails, try to extract JSON from markdown code blocks
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                            responseText.match(/```\s*([\s\S]*?)\s*```/);
            
            if (jsonMatch) {
                translationResult = JSON.parse(jsonMatch[1]);
            } else {
                throw new Error(`Failed to parse translation response: ${parseError.message}`);
            }
        }

        // Validate response structure
        if (!translationResult.translation || !translationResult.language) {
            throw new Error('Invalid translation response format');
        }

        this._log('Translation successful:', translationResult);

        return translationResult;

    } catch (error) {
        this._log('Translation error:', error);
        throw new Error(`Translation failed: ${error.message}`);
    }
}

    /**
     * Batch translate multiple texts using the same context stack
     * @param {Array<string>} languages - Array of target languages
     * @param {Object} options - Same options as getTranslation
     * @returns {Promise<Array<Object>>} Array of translation results
     * 
     * @example
     * const results = await crawler.getTranslations(['Spanish', 'French', 'German'], { apiKey: 'key' });
     * results.forEach(r => console.log(`${r.language}: ${r.translation}`));
     */
    async getTranslations(languages, options = {}) {
        const results = [];
        
        for (const language of languages) {
            try {
                const result = await this.getTranslation(language, options);
                results.push(result);
            } catch (error) {
                this._log(`Failed to translate to ${language}:`, error);
                results.push({
                    translation: null,
                    language: language,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// Export for use in modules (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderContextCrawler;
}
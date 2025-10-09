/**
 * HeaderContextCrawler - A class to crawl and capture elements above a start element
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
     * Get all elements matching an XPath expression
     * @private
     */
    _getAllElementsByXPath(xpath) {
        const results = [];
        const xpathResult = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
            results.push(xpathResult.snapshotItem(i));
        }
        
        return results;
    }

    /**
     * Get descendants matching an XPath selector relative to a context node
     * @private
     */
    _getDescendantsByXPath(contextNode, xpath) {
        const results = [];
        
        // Make XPath relative to the context node by prefixing with '.'
        // Also handle both './/tag' and '//tag' formats
        const relativeXPath = xpath.startsWith('//') ? '.' + xpath : xpath;
        
        try {
            const xpathResult = document.evaluate(
                relativeXPath,
                contextNode,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            for (let i = 0; i < xpathResult.snapshotLength; i++) {
                results.push(xpathResult.snapshotItem(i));
            }
        } catch (error) {
            this._log(`XPath evaluation error for "${xpath}":`, error);
        }
        
        return results;
    }

    /**
     * Check if element matches any XPath selector in capture list
     * @private
     */
    _matchesCaptureList(element) {
        return this.captureList.some(xpath => {
            try {
                // Evaluate XPath from document root to see if this element matches
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                
                // Check if element is in the result set
                for (let i = 0; i < result.snapshotLength; i++) {
                    if (result.snapshotItem(i) === element) {
                        return true;
                    }
                }
                return false;
            } catch (error) {
                this._log(`XPath matching error for "${xpath}":`, error);
                return false;
            }
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
                
                // Check all descendants of sibling for matches using XPath
                this.captureList.forEach(xpath => {
                    const matches = this._getDescendantsByXPath(sibling, xpath);
                    if (matches.length > 0) {
                        this._log(`  Found ${matches.length} matches for ${xpath} in descendants`);
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
     * Get all translation bubble elements on the current page
     * This is a standalone method that finds all bubbles regardless of crawling
     * 
     * @param {string} xpath - Custom XPath (default: '//span[@title="Add translation"]/parent::*')
     * @returns {Array<Element>} Array of DOM elements that match the bubble pattern
     * 
     * @example
     * const crawler = new HeaderContextCrawler();
     * const bubbles = crawler.getBubbles();
     * console.log(`Found ${bubbles.length} translation bubbles on the page`);
     * bubbles.forEach(bubble => console.log(bubble.textContent));
     * 
     * @example
     * // With custom XPath
     * const bubbles = crawler.getBubbles('//div[@class="custom-bubble"]');
     */
    getBubbles(xpath = '//span[@title="Add translation"]/parent::*') {
        this._log('Getting all bubbles on page with XPath:', xpath);
        
        const elements = this._getAllElementsByXPath(xpath);
        
        this._log(`Found ${elements.length} bubble elements on the page`);
        
        return elements;
    }
    
    /**
     * Get all bubbles with detailed metadata
     * @param {string} xpath - Custom XPath (default: '//span[@title="Add translation"]/parent::*')
     * @returns {Array<Object>} Array of objects with element details
     * 
     * @example
     * const crawler = new HeaderContextCrawler();
     * const bubbleData = crawler.getBubblesWithMetadata();
     * bubbleData.forEach(b => {
     *     console.log(`${b.index}: ${b.text}`);
     *     console.log(`  Tag: ${b.tagName}, XPath: ${b.xpath}`);
     * });
     */
    getBubblesWithMetadata(xpath = '//span[@title="Add translation"]/parent::*') {
        const elements = this.getBubbles(xpath);
        
        return elements.map((el, index) => ({
            index: index,
            element: el,
            tagName: el.tagName,
            text: el.textContent.trim(),
            xpath: this._getXPathForElement(el),
            hasTitle: el.querySelector('span[title="Add translation"]') !== null
        }));
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
}

// Export for use in modules (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderContextCrawler;
}
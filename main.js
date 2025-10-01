/**
 * Captures elements matching XPath expressions while traversing from child to body
 * For each ancestor, searches for matching elements within that ancestor's subtree
 * @param {HTMLElement} startElement - The starting element
 * @param {Array<string>} captureList - Array of XPath expressions to match (e.g., ['//h1', '//h2', '//h3'])
 * @returns {Array<Object>} Hierarchy of captured elements with their details
 */
function captureXPathHierarchy(startElement, captureList) {
  const captured = [];
  const capturedElements = new Set(); // Track captured elements to avoid duplicates
  let currentElement = startElement;
  let level = 0;
  
  // Extract tag names from XPath patterns
  function extractTagNames(xpathList) {
    const tags = [];
    for (const xpath of xpathList) {
      // Match patterns like //h1, //h2, etc.
      const match = xpath.match(/\/\/(\w+)/);
      if (match) {
        tags.push(match[1].toLowerCase());
      }
    }
    return tags;
  }
  
  const tagNames = extractTagNames(captureList);
  
  // Traverse from child to body
  while (currentElement && currentElement !== document.body.parentElement) {
    // For each ancestor, find all matching elements within it
    for (const tag of tagNames) {
      try {
        // Build XPath to find elements within current ancestor
        const xpathQuery = `.//${tag}`;
        
        const result = document.evaluate(
          xpathQuery,
          currentElement,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        
        // Collect all matches found in this ancestor
        for (let i = 0; i < result.snapshotLength; i++) {
          const matchedElement = result.snapshotItem(i);
          
          // Only add if not already captured
          if (!capturedElements.has(matchedElement)) {
            capturedElements.add(matchedElement);
            captured.push({
              level: level,
              xpath: `//${tag}`,
              tagName: matchedElement.tagName,
              text: matchedElement.textContent.trim().substring(0, 100),
              fullText: matchedElement.textContent.trim(),
              element: matchedElement,
              ancestorElement: currentElement,
              attributes: getElementAttributes(matchedElement)
            });
          }
        }
      } catch (e) {
        console.warn(`Error evaluating XPath for tag ${tag}:`, e);
      }
    }
    
    // Move to parent
    currentElement = currentElement.parentElement;
    level++;
  }
  
  return captured;
}

/**
 * Helper function to get all attributes of an element
 */
function getElementAttributes(element) {
  const attrs = {};
  for (const attr of element.attributes) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

// Example usage in console:
// 1. Get element by XPath: 
//    const startEl = document.evaluate('//*[@id="ql-dynList-AssessmentInactivesList-active"]/li[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
// 2. Run: const result = captureXPathHierarchy(startEl, ['//h1', '//h2', '//h3']);
// 3. View: console.log(result);

console.log('✅ captureXPathHierarchy function loaded!');
console.log('Example: captureXPathHierarchy(element, ["//h1", "//h2", "//h3"])');
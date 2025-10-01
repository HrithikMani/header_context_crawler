# HeaderContextCrawler

A lightweight JavaScript class that crawls upward through the DOM tree from a starting element, capturing matching elements along the way. Perfect for gathering contextual information like headers, labels, and metadata that appear above a target element.

## Installation

Simply include the script in your HTML:

```html
<script src="header-context-crawler.js"></script>
```

Or import it as a module:

```javascript
import HeaderContextCrawler from './header-context-crawler.js';
```

## Basic Usage

### 1. Simple Example - Using Element ID

```javascript
// Start from an element and capture all h1, h2, and h3 headers above it
const crawler = new HeaderContextCrawler(
    '//*[@id="targetElement"]',
    ['//h1', '//h2', '//h3']
);

const elements = crawler.crawl();
console.log(`Found ${elements.length} headers`);
```

### 2. Using a DOM Element Reference

```javascript
// Get element reference first
const startElement = document.querySelector('#myElement');

// Create crawler
const crawler = new HeaderContextCrawler(
    startElement,
    ['//h1', '//h2', '//span']
);

const elements = crawler.crawl();
```

### 3. With Debug Mode

```javascript
const crawler = new HeaderContextCrawler(
    '//*[@id="problem5"]',
    ['//h1', '//h2', '//h3'],
    { debug: true }  // Enables console logging
);

const elements = crawler.crawl();
```

## Key Methods

### `crawl()`
Starts the crawling process and returns an array of captured elements.

```javascript
const elements = crawler.crawl();
```

### `getElements()`
Returns the array of captured DOM elements.

```javascript
const elements = crawler.getElements();
```

### `getElementsWithMetadata()`
Returns elements with additional information (tag name, text content, XPath).

```javascript
const metadata = crawler.getElementsWithMetadata();
// Returns: [{ index, element, tagName, text, xpath }, ...]
```

### `filterByTags(tags)`
Filter results to specific tag types.

```javascript
const headers = crawler.filterByTags(['H1', 'H2']);
```

### `print()`
Display captured elements in console.

```javascript
crawler.print();
// Output:
// === Captured Elements (Bottom to Top) ===
// 1. <H3> Cardiovascular
// 2. <H2> Active Medical Conditions
// 3. <H1> Patient Medical Record
```

### `count()`
Get the number of captured elements.

```javascript
const total = crawler.count();
```

## How It Works

The crawler:

1. **Starts** from your specified element
2. **Traverses upward** through parent elements toward the document root
3. **Captures** matching elements from siblings and their descendants
4. **Returns** elements in document order (top to bottom)

This is useful for gathering context like section headers, page titles, or metadata labels that appear above your target element.

## Common Use Cases

### Medical Records
```javascript
// Capture headers above a diagnosis to understand context
const crawler = new HeaderContextCrawler(
    document.querySelector('.diagnosis'),
    ['//h1', '//h2', '//h3']
);
const context = crawler.crawl();
// Gets: Patient Name → Chart Section → Subsection → Diagnosis
```

### Form Fields
```javascript
// Get all labels above a form input
const crawler = new HeaderContextCrawler(
    '#emailInput',
    ['//label', '//h2', '//h3']
);
```

### Navigation Context
```javascript
// Find breadcrumb trail and section headers
const crawler = new HeaderContextCrawler(
    '.current-item',
    ['//nav', '//h1', '//h2']
);
```

## Live Demo

Open `index.html` in your browser to see an interactive demo with a medical records interface. The demo includes:

- Visual crawling animation
- Real-time configuration
- Element highlighting
- Multiple preset configurations

## Browser Compatibility

Works in all modern browsers that support:
- XPath evaluation
- DOM traversal APIs
- ES6+ JavaScript

## License

Free to use in your projects!
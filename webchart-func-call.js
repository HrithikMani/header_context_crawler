const crawler = new HeaderContextCrawler(
    '//*[@id="ql-dynList-AssessmentInactivesList-active"]/li[1]',
    ["//h1", "//h2", "//h3"]
);

const elements = crawler.crawl();

console.log(elements);
const texts = crawler.getContextStack();
console.log(texts);

const result = await crawler.getTranslation('Spanish');


// //div[@class="icon"]//following-sibling::label

// //span[@class='dynTitle-text']

// //span[@title="Add translation"]/parent::*


/*
Question to ask Doug:
are we on the same page ?

*/ 
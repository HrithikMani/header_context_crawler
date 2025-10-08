const crawler = new HeaderContextCrawler(
    '//*[@id="ql-dynList-AssessmentInactivesList-active"]/li[1]',
    ["//h1", "//h2", "//h3"]
);

const elements = crawler.crawl();

console.log(elements);
const texts = crawler.getContextStack();
console.log(texts);

const result = await crawler.getTranslation('Spanish', {
    apiKey: 'sk-ant-...'
});
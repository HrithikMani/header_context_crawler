const crawler = new HeaderContextCrawler(
    '//*[@id="wc-4c8bf6a0-ab4e-4b3f-acf1-da7cefad615e"]/div[2]/div[1]/div[1]/ul/li[1]/span[1]',
    ["//h1", "//h2", "//h3"]
);

const elements = crawler.crawl();

console.log(elements);
const texts = crawler.getContextStack();
console.log(texts);
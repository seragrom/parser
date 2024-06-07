const puppeteer = require('puppeteer');

(async () => {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch(
        {
            headless: false,
            // defaultViewport: false,
            // userDataDir: './tmp'
        }
    );
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto('https://tabletki.ua/uk/category/2468/', {waitUntil: 'load'});

    const drugsHandles = await page.$$('article.card.card__category > div.card__category--col > div.card__category--bottom > a.btn')

    for (const drugHandles of drugsHandles){
        const title = await page.evaluate(el => el.href, drugHandles)
    }
    // await page.locator('btnShowMoreSku').click()

    await page.evaluate(() => {
        console.log(document.querySelectorAll('section.row.category-card__card-row.category-card__card-row--list > col'))
    })



    let arr = await page.evaluate(() => {
        let elem = Array.from(document.querySelectorAll('section.row.category-card__card-row.category-card__card-row--list > col'))
        return elem
    })

    // console.log(arr)


    // Set screen size
    await page.setViewport({width: 1920, height: 1080});

    await page.screenshot({path: 'exemple.png'})

    // Type into search box
    // await page.type('.devsite-search-field', 'automate beyond recorder');

    // Wait and click on first result
    // const searchResultSelector = '.devsite-result-item-link';
    // await page.waitForSelector(searchResultSelector);
    // await page.click(searchResultSelector);

    // Locate the full title with a unique string
    // const textSelector = await page.waitForSelector(
    //   'text/Customize and automate'
    // );
    // const fullTitle = await textSelector?.evaluate(el => el.textContent);
    //
    // Print the full title
    // console.log('The title of this blog post is "%s".', fullTitle);

    await browser.close();
})();
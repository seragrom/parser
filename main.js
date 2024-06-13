const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

puppeteer.launch({headless: false}).then(async browser => {
    const page = await browser.newPage()

    // await page.goto('https://bot.sannysoft.com')
    // await page.waitForTimeout(5000)
    // await page.screenshot({path: 'testresult.png', fullPage: true})

    let goods = []

    let url = 'https://tabletki.ua/uk/category/674/'

    await page.goto(url, { waitUntil: 'load' });

    const pagesCount = await page.evaluate(() => {
        const paginationItems = document.querySelectorAll('.pagination .page-item');
        if (paginationItems.length < 2) return null; // Перевірка, чи є достатньо елементів
        const secondLastItem = paginationItems[paginationItems.length - 2];
        return secondLastItem.getAttribute('data-page');
    });

    let pageNumber = 1
    while (pageNumber <= 1) {
        await page.goto(url + `filter/page=${ pageNumber }/`, {waitUntil: 'load'});

        // const goodsHandles = await page.$$('article.card__category > div.card__category--col')
        // const goodsHandles = await page.$$('article.card.card__category')
        const goodsHandles = await Promise.all(
            (await page.$$('article.card.card__category')).map(async (article) => {
                return await page.evaluateHandle((article) => article.closest('div.col'), article);
            })
        );

        let goodsAvailable = true

        for (const goodHandle of goodsHandles) {

            const linkHandle = await goodHandle.$('div.card__category--bottom > .btn');
            const priceHandle = await goodHandle.$('.card__category--price');

            const goodsID = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-id')) : null;
            const goodsName = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-name')) : null;
            const minPrice = priceHandle ? await priceHandle.evaluate(el => el.textContent.trim().replace(/[^\d.]/g, '')) : null;
            const producerName = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-brand')) : null;
            const pharmacyCount = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-stores')) : null;
            const link = linkHandle ? await page.evaluate(el => el.href, linkHandle) : null;

            if (pharmacyCount > 0) {
                goods.push(
                    {
                        "goodsID": goodsID,
                        "goodsName": goodsName,
                        "producerName": producerName,
                        "minPrice": Number(minPrice),
                        "pharmacyCount": Number(pharmacyCount),
                        "link": link
                    }
                )
            } else goodsAvailable = false

        }

        pageNumber++

        if (!goodsAvailable) {
            break;
        }
    }

    console.log(goods)

    // async function clickShowMoreIfAvailable(page) {
    //     const showMoreButton = await page.$('#showMoreResults');
    //     if (showMoreButton) {
    //         const isButtonDisabled = await page.evaluate(button => button.disabled, showMoreButton);
    //         if (!isButtonDisabled) {
    //             await showMoreButton.click();
    //             await page.waitForTimeout(3000); // Зачекати, поки нові дані завантажаться
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    for (const good of goods){
        await page.goto(good.link, {waitUntil: 'load'});

        // while (!(await page.$eval('#showMoreResults', button => button.disabled))) {
        //     try {
        //         await page.click('#showMoreResults');
        //         await sleep(1000);
        //     } catch (error){
        //         break;
        //     }
        // }

        const pharmacyHandles = await page.$$('article.address-card')

        for (const pharmacyHandle of pharmacyHandles){
            // const name = await page.evaluate(el => el.innerText, pharmacyHandle)


            const locationHandle = await pharmacyHandle.$('div.address-card__header.address-card__header--block');
            const nameHandle = await pharmacyHandle.$('.address-card__header--name span');
            const addressHandle = await pharmacyHandle.$('.address-card__header--address span');
            const goodsHandle = await pharmacyHandle.$('.filter-group__list--name');
            const producerHandle = await pharmacyHandle.$('.filter-group__list--made');
            const priceHandle = await pharmacyHandle.$('.filter-group__list--price');
            const discountHandle = await pharmacyHandle.$('.filter-group__list--discounted');
            const termHandle = await pharmacyHandle.$('.filter-group__list--item-row button span');


            const dataId = await locationHandle.evaluate(el => el.getAttribute('data-id'));
            const dataLocation = await locationHandle.evaluate(el => el.getAttribute('data-location'));
            const pharmacyName = await nameHandle.evaluate(el => el.textContent.trim());
            const pharmacyAddress = await addressHandle.evaluate(el => el.textContent.trim());
            const goodsName = await goodsHandle.evaluate(el => el.textContent.trim());
            const producerName = await producerHandle.evaluate(el => el.textContent.trim());
            const price = await priceHandle.evaluate(el => el.textContent.trim());
            // const discount = await discountHandle.evaluate(el => el.textContent.trim());
            // const termData = await termHandle.evaluate(el => el.textContent.trim());

            // console.log(`pharmacyID:   ${dataId}`);
            // console.log(`pharmacyName: ${pharmacyName}`);
            // console.log(`address:      ${pharmacyAddress}`);
            // console.log(`location:     ${dataLocation}`);
            // // console.log(`Goods   :     ${goodsName}`);
            // console.log(`GoodsID :     ${good.goodsID}`);
            // console.log(`goodsName:    ${good.goodsName}`);
            // // console.log(`Producer:     ${producerName}`);
            // console.log(`producer:     ${good.producerName}`);
            // console.log(`minPrice:     ${good.minPrice}`);
            // console.log(`price:        ${price}`);
            // // console.log(`Discount: ${discount}`);
            // // console.log(`Term:     ${termData}`);
            // console.log('----------------------------')


        }
    }
    console.log('end!')


    // await browser.close()
})
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

    let url = 'https://tabletki.ua/uk/category/810/'

    await page.goto(url, { waitUntil: 'load' });

    const pagesCount = await page.evaluate(() => {
        const paginationItems = document.querySelectorAll('.pagination .page-item');
        if (paginationItems.length < 2) return null; // Перевірка, чи є достатньо елементів
        const secondLastItem = paginationItems[paginationItems.length - 2];
        return secondLastItem.getAttribute('data-page');
    });

    let pageNumber = 1
    while (pageNumber <= 2) {
        await page.goto(url + `filter/page=${ pageNumber }/`, {waitUntil: 'load'});

        // const goodsHandles = await page.$$('article.card__category > div.card__category--col')
        const goodsHandles = await page.$$('article.card.card__category')

        let goodsAvailable = true

        for (const goodHandle of goodsHandles) {

            console.log(goodHandle)

            const drugIdHandle = await goodHandle.$('div.card__category--buttons');
            const drugInfoHandle = await goodHandle.$('div.card__category--bottom');

        //     const priceHandle = await goodHandle.$('.card__category--price');
        //     const availabilityHandle = await drugHandle.$('.card__category--bottom > .btn');
        //
        //     const goodsID = drugIdHandle ? await drugIdHandle.evaluate(el => el.getAttribute('data-intcode')) : null;

        //     const goodsName = drugHandle ? await drugHandle.evaluate(el => el.getAttribute('data-ga-product-name')) : null;
        //     const producerName = drugHandle ? await drugHandle.evaluate(el => el.getAttribute('data-ga-product-brand')) : null;
        //     const pharmacyCount = drugHandle ? await drugHandle.evaluate(el => el.getAttribute('data-ga-product-stores')) : null;
        //     const minPrice = priceHandle ? await priceHandle.evaluate(el => el.textContent.trim().replace(/[^\d.]/g, '')) : null;
        //     const link = availabilityHandle ? await page.evaluate(el => el.href, availabilityHandle) : null;
        //
        //     if (pharmacyCount > 0) {
        //         goods.push(
        //             {
        //                 "goodsID": goodsID,
        //                 "goodsName": goodsName,
        //                 "producerName": producerName,
        //                 "minPrice": Number(minPrice),
        //                 "pharmacyCount": Number(pharmacyCount),
        //                 "link": link
        //             }
        //         )
        //     } else goodsAvailable = false

        }

        pageNumber++

        if (!goodsAvailable) {
            break;
        }
    }

    // console.log(goods)

    // for (const good of goods){
    //     await page.goto(good.link, {waitUntil: 'load'});
    //
    //     // while (!(await page.$eval('#showMoreResults', button => button.disabled))) {
    //     //     try {
    //     //         await page.click('#showMoreResults');
    //     //         await sleep(1000);
    //     //     } catch (error){
    //     //         break;
    //     //     }
    //     // }
    //
    //     console.log(await page.$eval('#showMoreResults', button => button.disabled))
    //
    //     const pharmacyHandles = await page.$$('article.address-card')
    //
    //     for (const pharmacyHandle of pharmacyHandles){
    //         // const name = await page.evaluate(el => el.innerText, pharmacyHandle)
    //
    //
    //         const locationHandle = await pharmacyHandle.$('div.address-card__header.address-card__header--block');
    //         const nameHandle = await pharmacyHandle.$('.address-card__header--name span');
    //         const addressHandle = await pharmacyHandle.$('.address-card__header--address span');
    //         const goodsHandle = await pharmacyHandle.$('.filter-group__list--name');
    //         const producerHandle = await pharmacyHandle.$('.filter-group__list--made');
    //         const priceHandle = await pharmacyHandle.$('.filter-group__list--price');
    //         const discountHandle = await pharmacyHandle.$('.filter-group__list--discounted');
    //         const termHandle = await pharmacyHandle.$('.filter-group__list--item-row button span');
    //
    //
    //         const dataId = await locationHandle.evaluate(el => el.getAttribute('data-id'));
    //         const dataLocation = await locationHandle.evaluate(el => el.getAttribute('data-location'));
    //         const pharmacyName = await nameHandle.evaluate(el => el.textContent.trim());
    //         const pharmacyAddress = await addressHandle.evaluate(el => el.textContent.trim());
    //         const goodsName = await goodsHandle.evaluate(el => el.textContent.trim());
    //         const producerName = await producerHandle.evaluate(el => el.textContent.trim());
    //         const price = await priceHandle.evaluate(el => el.textContent.trim());
    //         const discount = await discountHandle.evaluate(el => el.textContent.trim());
    //         const termData = await termHandle.evaluate(el => el.textContent.trim());
    //
    //         // console.log(`ID:       ${dataId}`);
    //         // console.log(`Pharmacy: ${pharmacyName}`);
    //         // console.log(`Address:  ${pharmacyAddress}`);
    //         // console.log(`Location: ${dataLocation}`);
    //         // console.log(`Goods   : ${goodsName}`);
    //         // console.log(`Goods   : ${good.goodsName}`);
    //         // console.log(`Producer: ${producerName}`);
    //         // console.log(`Producer: ${good.producerName}`);
    //         // console.log(`Price:    ${price}`);
    //         // console.log(`Discount: ${discount}`);
    //         // console.log(`Term:     ${termData}`);
    //         // console.log('----------------------------')
    //
    //         // console.log(name)
    //
    //     }
    // }
    console.log('end!')


    // await browser.close()
})
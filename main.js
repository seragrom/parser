const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

puppeteer.launch({ headless: false }).then(async browser => {
    const page = await browser.newPage()

    // await page.goto('https://bot.sannysoft.com')
    // await page.waitForTimeout(5000)
    // await page.screenshot({path: 'testresult.png', fullPage: true})

    await page.goto('https://tabletki.ua/uk/category/2468/', {waitUntil: 'load'});


    while (!(await page.$eval('#btnShowMoreSku', button => button.disabled))) {
        try {
            await page.click('#btnShowMoreSku');
            await sleep(1000);
        } catch (error) {
            break;
        }
    }

    let drugs_links = []

    const drugsHandles = await page.$$('article.card.card__category > div.card__category--col > div.card__category--bottom > a.btn')

    for (const drugHandles of drugsHandles){
        const href = await page.evaluate(el => el.href, drugHandles)
        drugs_links.push(href)
    }

    for (const drug_link of drugs_links){
        await page.goto(drug_link, {waitUntil: 'load'});


        // while (!(await page.$eval('#showMoreResults', button => button.disabled))) {
        //     try {
        //         await page.click('#showMoreResults');
        //         await sleep(1000);
        //         break;
        //     } catch (error){
        //         break;
        //     }
        // }


        const pharmacyHandles = await page.$$('article.address-card')

        for (const pharmacyHandle of pharmacyHandles){
            const name = await page.evaluate(el => el.innerText, pharmacyHandle)


            const locationHandle = await pharmacyHandle.$('div.address-card__header.address-card__header--block');
            const nameHandle = await pharmacyHandle.$('.address-card__header--name span');
            const scheduleHandle = await pharmacyHandle.$('.address-card__header--address div');
            const addressHandle = await pharmacyHandle.$('.address-card__header--address span');
            const goodsHandle = await pharmacyHandle.$('.filter-group__list--name');
            const producerHandle = await pharmacyHandle.$('.filter-group__list--made');
            const priceHandle = await pharmacyHandle.$('.filter-group__list--price');
            const discountHandle = await pharmacyHandle.$('.filter-group__list--discounted');
            const termHandle = await pharmacyHandle.$('.filter-group__list--item-row button span');


            const dataId = await locationHandle.evaluate(el => el.getAttribute('data-id'));
            const dataLocation = await locationHandle.evaluate(el => el.getAttribute('data-location'));
            const pharmacyName = await nameHandle.evaluate(el => el.textContent.trim());
            const schedule = await scheduleHandle.evaluate(el => el.textContent.trim());
            const pharmacyAddress = await addressHandle.evaluate(el => el.textContent.trim());
            const goodsName = await goodsHandle.evaluate(el => el.textContent.trim());
            const producerName = await producerHandle.evaluate(el => el.textContent.trim());
            const price = await priceHandle.evaluate(el => el.textContent.trim());
            const discount = await discountHandle.evaluate(el => el.textContent.trim());
            const termData = await termHandle.evaluate(el => el.textContent.trim());

            console.log(`ID:       ${dataId}`);
            console.log(`Pharmacy: ${pharmacyName}`);
            console.log(`Schedule: ${schedule}`);
            console.log(`Address:  ${pharmacyAddress}`);
            console.log(`Location: ${dataLocation}`);
            console.log(`Goods   : ${goodsName}`);
            console.log(`Producer: ${producerName}`);
            console.log(`Price:    ${price}`);
            console.log(`Discount: ${discount}`);
            console.log(`Term:     ${termData}`);
            console.log('----------------------------')
            
            // console.log(name)

        }
    }


    // await browser.close()
})
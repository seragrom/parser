const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

puppeteer.launch({headless: true}).then(async browser => {

    const page = await browser.newPage()

    await page.goto('https://tabletki.ua/uk/category/256/', {waitUntil: 'load'});

    let categories = []

    const categoryHandle = await page.$$('.subcategory__category-menu > li > a')

    for (const category of categoryHandle) {
        categories.push({
            name: category ? await page.evaluate(el => el.title, category) : null,
            link: category ? await page.evaluate(el => el.href, category) : null
        })
    }

    // await page.goto('https://bot.sannysoft.com')
    // await page.waitForTimeout(5000)
    // await page.screenshot({path: 'testresult.png', fullPage: true})

    for (let [index, category] of categories.entries()) {
        console.log('Категорія ' + (index + 1) + '/' + categories.length + ': ' + category.name)

        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();

        let goods = []
        let goods_failed = []

        await page.goto(category.link, {waitUntil: 'load'});

        const pagesCount = await page.evaluate(() => {
            const paginationItems = document.querySelectorAll('.pagination .page-item');
            if (paginationItems.length < 2) return null; // Перевірка, чи є достатньо елементів
            const secondLastItem = paginationItems[paginationItems.length - 2];
            return secondLastItem.getAttribute('data-page');
        });

        let pageNumber = 1
        while (pageNumber <= pagesCount) {

            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();

            await page.setViewport({
                width: 1820,
                height: 980,
                deviceScaleFactor: 1,
            });

            try {
                await page.goto(category.link + `filter/page=${pageNumber}/`, {waitUntil: 'load'});

                await sleep(1000);

                const goodsHandles = await Promise.all(
                    (await page.$$('article.card.card__category')).map(async (article) => {
                        return await page.evaluateHandle((article) => article.closest('div.col'), article);
                    })
                );

                let goodsAvailable = true

                for (const goodHandle of goodsHandles) {

                    const linkHandle = await goodHandle.$('div.card__category--bottom > .btn');
                    // const priceHandle = await goodHandle.$('.card__category--price');

                    const goodsID = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-id')) : null;
                    const goodsName = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-name')) : null;
                    // const minPrice = priceHandle ? await priceHandle.evaluate(el => el.textContent.trim().replace(/[^\d.]/g, '')) : null;
                    const producerName = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-brand')) : null;
                    const pharmacyCount = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-ga-product-stores')) : null;
                    // const tradenameintcode = goodHandle ? await goodHandle.evaluate(el => el.getAttribute('data-tradenameintcode')) : null;
                    const link = linkHandle ? await page.evaluate(el => el.href, linkHandle) : null;

                    if (pharmacyCount > 0) {
                        goods.push(
                            {
                                "INTCODE": goodsID,
                                "GOODS_NAME": goodsName,
                                "PRODUCER_NAME": producerName,
                                "PHARMACY_CNT": Number(pharmacyCount),
                                "LINK": link,
                            }
                        )
                    } else goodsAvailable = false
                }

                pageNumber++

                if (!goodsAvailable) {
                    break;
                }
            }
            catch (error){
                console.error(error)
            }
            await browser.close();
        }

        console.log('Доступно препаратів в категорії: ' + goods.length)

        try {
            fetch('https://exc.apteka.org.ua:9001/tabletki/', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "METHOD": "UPDATE_GOODS",
                    "GOODS": goods.map(good => (
                        {
                            "INTCODE": good.INTCODE,
                            "GOODS_NAME": good.GOODS_NAME,
                            "PRODUCER_NAME": good.PRODUCER_NAME,
                            "LINK": good.LINK
                        })
                    )
                })
            }).then(data => {
                // console.log('Oracle:', data);
            })
                .catch(error => {
                    console.error(error);
                });

        } catch (error) {
            console.error(error)
        }

        for (const [index, good] of goods.entries()) {

            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();

            await page.setViewport({
                width: 1820,
                height: 980,
                deviceScaleFactor: 1,
            });

            await page.setRequestInterception(true);

            page.on('request', request => {
                request.continue();
            });

            page.on('response', async response => {
                if (response.url().includes('/ajax/cards/locations')) {
                    locationsData = await response.json();
                }
            });

            let locationsData = null

            try {

                let percents = {
                    20: Number(goods.length * 0.2).toFixed(),
                    40: Number(goods.length * 0.4).toFixed(),
                    60: Number(goods.length * 0.6).toFixed(),
                    80: Number(goods.length * 0.8).toFixed(),
                    100: Number(goods.length).toFixed(),
                }

                const percentComplete = Object.entries(percents).find(([key, value]) => value === (index + 1).toString());

                await page.goto(good.LINK, {waitUntil: 'networkidle2'});

                await sleep(1000);

                fetch('https://exc.apteka.org.ua:9001/tabletki/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "METHOD": "INSERT_PRICE",
                        "LOCATIONS":
                            locationsData['cardLocations'].map(location => (
                                {
                                    "PHARMACYID": location.id,
                                    "LOCATION": location.location,
                                    "GOODSID": good.INTCODE,
                                    "PRICESUMMIN": location.priceSumMin,
                                    "PHARMACY_CNT": good.PHARMACY_CNT
                                })
                            )
                    })
                }).then(data => {
                    if (percentComplete) {
                        const [foundKey, foundValue] = percentComplete;
                        console.log(`Оброблено: ${foundKey}%, Препаратів: ${foundValue}/${goods.length}`);
                    }

                }).catch(error => {
                    goods_failed.push(good)
                    console.error(error);
                });


                const pharmacyHandles = await page.$$('article.address-card')

                let pharmacies = []

                for (const pharmacyHandle of pharmacyHandles) {

                    const locationHandle = await pharmacyHandle.$('div.address-card__header.address-card__header--block');
                    const nameHandle = await pharmacyHandle.$('.address-card__header--name span');
                    const addressHandle = await pharmacyHandle.$('.address-card__header--address span');

                    const dataId = await locationHandle.evaluate(el => el.getAttribute('data-id'));
                    const dataLocation = await locationHandle.evaluate(el => el.getAttribute('data-location'));
                    const pharmacyName = await nameHandle.evaluate(el => el.textContent.trim());
                    const pharmacyAddress = await addressHandle.evaluate(el => el.textContent.trim());

                    pharmacies.push(
                        {
                            "INTCODE": dataId,
                            "PHARMACYNAME": pharmacyName,
                            "ADDRESS": pharmacyAddress,
                            "LOCATION": dataLocation
                        }
                    )
                }

                fetch('https://exc.apteka.org.ua:9001/tabletki/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "METHOD": "UPDATE_PHARMACY",
                        "PHARMACIES": pharmacies
                    })
                }).then(data => {
                    // console.log('Oracle:', data);
                }).catch(error => {
                    console.error(error);
                });

            } catch (error) {
                await sleep(30000);
                console.log(good.INTCODE, good.GOODS_NAME, good.LINK);
                goods_failed.push(good);
                console.error(error);
            }

            await browser.close();
        }

        await browser.close();
    }

    await browser.close();
});
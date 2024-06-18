const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

puppeteer.launch({headless: false
}).then(async browser => {

    const page = await browser.newPage()

    await page.setViewport({
        width: 1820,
        height: 980,
        deviceScaleFactor: 1,
    });

    // await page.goto('https://bot.sannysoft.com')
    // await page.waitForTimeout(5000)
    // await page.screenshot({path: 'testresult.png', fullPage: true})

    const categories = [242, 534, 189, 2124, 674, 468, 1929, 1876, 1392, 579, 134, 538, 844, 810, 877, 799, 837, 875,
        1962, 68, 874, 720, 830, 783, 141, 196, 45, 140, 153, 1768, 187, 63, 1907, 2235, 237, 789, 138]

    for (let category of categories) {
        let url = `https://tabletki.ua/uk/category/${(category.toString())}/`

        console.log(url)

        let goods = []
        await page.setRequestInterception(true);

        page.on('request', request => {
            request.continue();
        });

        let locationsData = null

        page.on('response', async response => {
            if (response.url().includes('/ajax/cards/locations')) {
                locationsData = await response.json();
            }
        });

        await page.goto(url, {waitUntil: 'load'});

        await sleep(2000);

        const pagesCount = await page.evaluate(() => {
            const paginationItems = document.querySelectorAll('.pagination .page-item');
            if (paginationItems.length < 2) return null; // Перевірка, чи є достатньо елементів
            const secondLastItem = paginationItems[paginationItems.length - 2];
            return secondLastItem.getAttribute('data-page');
        });

        let pageNumber = 1
        while (pageNumber <= pagesCount) {
            await page.goto(url + `filter/page=${pageNumber}/`, {waitUntil: 'load'});

            await sleep(2000);

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
                            // "PHARMACY_CNT": Number(pharmacyCount),
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

        fetch('http://127.0.0.1:8000/tabletki/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "METHOD": "UPDATE_GOODS",
                "GOODS": goods
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });

        for (const good of goods) {
            await page.goto(good.LINK, {waitUntil: 'networkidle2'});

            await sleep(3000);

            fetch('http://127.0.0.1:8000/tabletki/', {
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
                                "DELIVERYSERVICEID": location.deliveryServiceId,
                            })
                        )
                })
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
                .then(data => {
                    console.log('Success:', data);
                })
                .catch(error => {
                    console.error('There has been a problem with your fetch operation:', error);
                });


            const pharmacyHandles = await page.$$('article.address-card')

            let pharmacies = []

            for (const pharmacyHandle of pharmacyHandles) {

                // const name = await page.evaluate(el => el.innerText, pharmacyHandle)

                const locationHandle = await pharmacyHandle.$('div.address-card__header.address-card__header--block');
                const nameHandle = await pharmacyHandle.$('.address-card__header--name span');
                const addressHandle = await pharmacyHandle.$('.address-card__header--address span');
                // const goodsHandle = await pharmacyHandle.$('.filter-group__list--name');
                // const producerHandle = await pharmacyHandle.$('.filter-group__list--made');
                // const priceHandle = await pharmacyHandle.$('.filter-group__list--price');
                // const discountHandle = await pharmacyHandle.$('.filter-group__list--discounted');
                // const termHandle = await pharmacyHandle.$('.filter-group__list--item-row button span');


                const dataId = await locationHandle.evaluate(el => el.getAttribute('data-id'));
                const dataLocation = await locationHandle.evaluate(el => el.getAttribute('data-location'));
                const pharmacyName = await nameHandle.evaluate(el => el.textContent.trim());
                const pharmacyAddress = await addressHandle.evaluate(el => el.textContent.trim());
                // const goodsName = await goodsHandle.evaluate(el => el.textContent.trim());
                // const producerName = await producerHandle.evaluate(el => el.textContent.trim());
                // const price = await priceHandle.evaluate(el => el.textContent.trim());
                // const discount = await discountHandle.evaluate(el => el.textContent.trim());
                // const termData = await termHandle.evaluate(el => el.textContent.trim());

                pharmacies.push(
                    {
                        "INTCODE": dataId,
                        "PHARMACYNAME": pharmacyName,
                        "ADDRESS": pharmacyAddress,
                        "LOCATION": dataLocation
                    }
                )
            }
            fetch('http://127.0.0.1:8000/tabletki/', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "METHOD": "UPDATE_PHARMACY",
                    "PHARMACIES": pharmacies
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Success:', data);
                })
                .catch(error => {
                    console.error('There has been a problem with your fetch operation:', error);
                });
        }

    }
    await browser.close()
})
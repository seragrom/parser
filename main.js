const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const moment = require('moment');

const fs = require('fs');


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logToFile(message) {
    const logMessage = `[${moment(new Date()).format('DD.MM.YYYY HH:mm')}] ${message}\n`;
    fs.appendFileSync('tabletki.log', logMessage);
}

async function insertPrices(good) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewport({
        width: 1820,
        height: 980,
        deviceScaleFactor: 1,
    });

    let locationsData = null;

    try {
        await page.setRequestInterception(true);

        page.on('request', request => {
            request.continue();
        });

        page.on('response', async response => {
            if (response.url().includes('/ajax/cards/locations')) {
                locationsData = await response.json();
            }
        });

        await page.goto(good.LINK, {waitUntil: 'networkidle2'});

        await fetch('https://exc.apteka.org.ua:9001/tabletki/', {
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
        });

        const pharmacyHandles = await page.$$('article.address-card');

        let pharmacies = [];

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
            );
        }

        await fetch('https://exc.apteka.org.ua:9001/tabletki/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "METHOD": "UPDATE_PHARMACY",
                "PHARMACIES": pharmacies
            })
        });
    } catch (error) {
        // console.error('Error:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

puppeteer.launch({ headless: true }).then(async browser => {

    const startTime = new Date();
    console.log(`Зафіксовано час запуску програми: ${moment(startTime).format('DD.MM.YYYY HH:mm')}`)
    logToFile(`Зафіксовано час запуску програми: ${moment(startTime).format('DD.MM.YYYY HH:mm')}`)

    const page = await browser.newPage()

    await page.goto('https://tabletki.ua/uk/category/256/', {waitUntil: 'load'});

    let categories = []

    const categoryHandle = await page.$$('.subcategory__category-menu > li > a')

    for (const category of categoryHandle) {
        const name = category ? await page.evaluate(el => el.title, category) : null
        const link = category ? await page.evaluate(el => el.href, category) : null
        const lastSlashIndex = link.slice(0, -1).lastIndexOf('/');
        const id = link.substring(lastSlashIndex + 1, link.length - 1);
        categories.push({ "ID": id, "NAME": name, "LINK": link })
    }

    // await page.goto('https://bot.sannysoft.com')
    // await page.waitForTimeout(5000)
    // await page.screenshot({path: 'testresult.png', fullPage: true})

    try {
        await fetch('https://exc.apteka.org.ua:9001/tabletki/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "METHOD": "UPDATE_CATEGORY",
                "CATEGORIES": categories
            })
        });
    } catch(error) {
        console.log(error)
        logToFile(error)
    }

    for (let [index, category] of categories.entries()) {

        const categoryStartTime = new Date();

        console.log('Категорія ' + (index + 1) + '/' + categories.length + ': ' + category.NAME)
        logToFile('Категорія ' + (index + 1) + '/' + categories.length + ': ' + category.NAME)

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        let goods = []
        let goods_failed = []

        await page.goto(category.LINK, {waitUntil: 'load'});

        const pagesCount = await page.evaluate(() => {
            const paginationItems = document.querySelectorAll('.pagination .page-item');
            if (paginationItems.length < 2) return null; // Перевірка, чи є достатньо елементів
            const secondLastItem = paginationItems[paginationItems.length - 2];
            return secondLastItem.getAttribute('data-page');
        });

        let pageNumber = 1
        while (pageNumber <= pagesCount) {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();

            await page.setViewport({
                width: 1820,
                height: 980,
                deviceScaleFactor: 1,
            });

            try {
                await page.goto(category.LINK + `filter/page=${pageNumber}/`, {waitUntil: 'load'});

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
            } catch (error) {
                console.error(error)
                logToFile(error)
            }
            finally {
                await browser.close();
            }
        }

        console.log('Доступно препаратів в категорії: ' + goods.length)
        logToFile('Доступно препаратів в категорії: ' + goods.length)

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
                            "CATEGORYID": category.ID,
                            "LINK": good.LINK
                        })
                    )
                })
            }).then(data => {})

        } catch (error) {
            console.error(error)
            logToFile(error)
        }

        for (const [index, good] of goods.entries()) {
            let percents = {
                20: Number(goods.length * 0.2).toFixed(),
                40: Number(goods.length * 0.4).toFixed(),
                60: Number(goods.length * 0.6).toFixed(),
                80: Number(goods.length * 0.8).toFixed(),
                100: Number(goods.length).toFixed(),
            };

            const percentComplete = Object.entries(percents).find(([key, value]) => value === (index + 1).toString());

            if (percentComplete) {
                const [foundKey, foundValue] = percentComplete;
                console.log(`Оброблено: ${foundKey}%, Препаратів: ${foundValue}/${goods.length}`);
            }

            try {
                await insertPrices(good);
            } catch (error) {
                goods_failed.push(good)
                await sleep(10000)
            }

        }

        if (goods_failed.length > 0) {
            for (const [index, good] of goods_failed.entries()) {
                console.log(`Повторна обробка проблемних посилань: ${(index + 1)}/${goods_failed.length}`);
                try {
                    await insertPrices(good);
                } catch (error) {
                    await sleep(10000)
                }

            }
        }
        await browser.close();
        console.log(`Часу витрачено на категорію: ${((new Date() - categoryStartTime) / 3600000).toFixed(2)} годин`)
        logToFile(`Часу витрачено на категорію: ${((new Date() - categoryStartTime) / 3600000).toFixed(2)} годин`)
        console.log(`Пройшло з моменту запуску: ${((new Date() - startTime) / 3600000).toFixed(2)} годин`)
        logToFile(`Пройшло з моменту запуску: ${((new Date() - startTime) / 3600000).toFixed(2)} годин`)
    }
    await browser.close();
});
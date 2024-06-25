const puppeteer = require('puppeteer-extra');

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const moment = require('moment');

const fs = require('fs');


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function logToFile(message) {
    console.log(message)
    const logMessage = `[${moment(new Date()).format('DD.MM.YYYY HH:mm')}] ${message}\n`;
    fs.appendFileSync('goods.log', logMessage);
}


async function insertPrices(good) {
    const browser = await puppeteer.launch({headless: true});
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

        await fetch('http://127.0.0.1:8000/tabletki/', {
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
                            "PHARMACY_CNT": 0
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

        await fetch('http://127.0.0.1:8000/tabletki/', {
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

async function fetchGoodsLink(goods) {
    try {
        const response = await fetch('http://127.0.0.1:8000/tabletki/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "METHOD": "GET_GOODS_LINK",
                "GOODS_INTCODE": goods
            })
        });

        return await response.json();

    } catch (error) {
        console.error(error);
        logToFile(error)
    }
}


async function getPrices() {
    const startTime = new Date();
    logToFile(`Зафіксовано час запуску програми: ${moment(startTime).format('DD.MM.YYYY HH:mm')}`);

    const goods = await fetchGoodsLink([
        6496, 3518, 1665, 10048, 11731, 6985, 1066030, 1007865, 6808, 16034,
        1954, 22658, 12885, 36788, 36018, 21335, 15757, 437, 36320, 12802,
        1395, 1031415, 46, 25554, 36247, 27105, 3377, 30026, 4363, 8317,
        10011, 2630, 3353, 36087, 9080, 9680, 5635, 33970, 6129, 4003,
        26822, 2776, 13726, 10835, 2948, 11413, 30011, 2790, 13887, 15172,
        12908, 5457, 10676, 6405, 30032, 31904, 32865, 1257, 3880, 1003554,
        24688, 27043, 1051332, 6357, 31459, 8670, 9305, 4375, 26907, 34063,
        1010759, 14929, 12102, 23462, 3316, 2215, 31440, 29089, 67, 12270,
        33798, 16702, 2506, 5172, 14037, 7646, 1025460, 15960, 36044,
        1003332, 12353, 11504, 34507, 16610, 4077, 15812, 12635, 4689,
        12584, 12187
    ]);

    let goods_failed = [];

    try {
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
                goods_failed.push(good);
                await sleep(10000);
            }

        }

        if (goods_failed.length > 0) {
            for (const [index, good] of goods_failed.entries()) {
                console.log(`Повторна обробка проблемних посилань: ${(index + 1)}/${goods_failed.length}`);
                try {
                    await insertPrices(good);
                } catch (error) {
                    await sleep(10000);
                }

            }
        }
    } catch (error) {
        console.log(error);
        logToFile(error);
    }
    logToFile(`Час виконання програми: ${((new Date() - startTime) / 3600000).toFixed(2)} годин.`);
    logToFile(`Всього оброблено: ${goods.length} препаратів.`);
}

getPrices();
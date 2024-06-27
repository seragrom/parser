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
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    });

    let locationsData = {};

    try {
        await page.setRequestInterception(true);

        page.on('request', request => {
            request.continue();
        });

        page.on('response', async response => {
            try {
                if (response.url().includes('/ajax/cards/locations')) {
                    locationsData = await response.json();
                }
            } catch (error) {
                console.error(`Error processing response: ${error}`);
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
                            "IDCITY": good.IDCITY
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
        throw error;
    } finally {
        await page.close();
        await browser.close();
    }
}

async function fetchLinks(method) {
    try {
        const response = await fetch('http://127.0.0.1:8000/tabletki/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${'tabletki'}:${'Aichove7'}`)}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "METHOD": method
            })
        });
        return await response.json();

    } catch (error) {
        logToFile(error)
    }
}


async function getPrices() {
    const startTime = new Date();
    logToFile(`Зафіксовано час запуску програми: ${moment(startTime).format('DD.MM.YYYY HH:mm')}`);


    const cities = await fetchLinks('GET_CITIES_LINK');
    const goods = await fetchLinks('GET_GOODS_LINK');

    for (const city of cities){
        console.log(`Обробка препаратів у місті: ${city.NAME}`)
        let goods_parsed = Array.from(goods)
        let goods_success = 0
        while (goods_parsed.length > 0) {
        for (let i = 0; i < goods_parsed.length; i++) {
            const good = goods_parsed[i];
            good.IDCITY = city.IDCITY
            good.LINK += (city.HREFNAME + '/')
            console.log(`Обробка препаратів, залишилось: ${goods_parsed.length}`)
            try {
                await insertPrices(good);
                goods_parsed.splice(i, 1);
                goods_success += 1
                i--;
            } catch (error) {
                logToFile(`Error processing good ${good}:`, error);
                await sleep(10000);
            }
        }
    }

    }
    logToFile(`Час виконання програми: ${((new Date() - startTime) / 3600000).toFixed(2)} годин.`);
    logToFile(`Всього оброблено: ${goods_success} препаратів.`);
}

getPrices();
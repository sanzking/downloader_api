const digimoviez = require('./sources/digimoviez');
const film2media = require('./sources/film2media');
const salamdl = require('./sources/salamdl');
const film2movie = require('./sources/film2movie');
const valamovie = require('./sources/valamovie');
const getCollection = require("../mongoDB");
const {domainChangeHandler} = require('./domainChangeHandler');
const Sentry = require('@sentry/node');
const {saveError} = require("../saveError");


export async function startCrawling(sourceNumber, crawlMode = 0) {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let collection = await getCollection('sources');
            let sources = await collection.findOne({title: 'sources'});

            if (sourceNumber === 'all') {
                await digimoviez({
                    ...sources.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 330,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
                await film2media({
                    ...sources.film2media,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 390,
                });
                await film2movie({
                    ...sources.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 1380,
                });
                await salamdl({
                    ...sources.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 100,
                });
                await valamovie({
                    ...sources.valamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 895,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 57,
                });
            } else if (sourceNumber === 0) {
                await digimoviez({
                    ...sources.digimoviez,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 330,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 50,
                });
            } else if (sourceNumber === 1) {
                await film2media({
                    ...sources.film2media,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 390,
                });
            } else if (sourceNumber === 2) {
                await film2movie({
                    ...sources.film2movie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 1380,
                });
            } else if (sourceNumber === 3) {
                await salamdl({
                    ...sources.salamdl,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 30 : 100,
                });
            } else if (sourceNumber === 4) {
                await valamovie({
                    ...sources.valamovie,
                    page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 20 : 895,
                    serial_page_count: crawlMode === 0 ? 1 : crawlMode === 1 ? 5 : 57,
                });
            }


            await domainChangeHandler(sources);

            let time2 = new Date();
            let crawling_time = time2.getTime() - time1.getTime();
            await Sentry.captureMessage(`crawling done in : ${crawling_time}ms`);
            resolve();
        } catch (error) {
            saveError(error);
            reject();
        }
    });
}


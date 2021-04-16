const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const Sentry = require('@sentry/node');
const getCollection = require("../mongoDB");
const digimoviez = require('./sources/digimoviez');
const film2media = require('./sources/film2media');
const {getNewURl} = require("./utils");
const {saveError} = require("../saveError");

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

//todo : add digimovie domain change handler --> source link is fixed , download links change

export async function domainChangeHandler(sourcesObject) {
    try {
        delete sourcesObject._id;
        delete sourcesObject.title;
        let sources_url = Object.keys(sourcesObject).map(value => sourcesObject[value].movie_url);
        let domains = sources_url.map(value => value.replace(/www.|https:\/\/|\/page\/|\//g, ''));
        let changedDomains = [];
        let isChanged = false;
        for (let i = 0; i < domains.length; i++) {
            let response;
            try {
                response = await axios.get('https://' + domains[i]);
            } catch (error) {
                try {
                    response = await axios.get('https://www.' + domains[i]);
                } catch (error2) {
                    saveError(error2);
                    continue;
                }
            }
            let responseDomain = response.request.res.responseUrl.replace(/www.|https:\/\/|\/page\/|\//g, '');
            if (domains[i] !== responseDomain) {//changed
                isChanged = true;
                sources_url[i] = sources_url[i]
                    .replace(domains[i].split('.')[0], responseDomain.split('.')[0])
                    .replace(domains[i].split('.')[1], responseDomain.split('.')[1]);
                domains[i] = responseDomain;
                changedDomains.push(responseDomain);
            }
        }

        if (isChanged) {
            await Sentry.captureMessage('start domain change handler');
            updateSourceFields(sourcesObject, sources_url, domains);
            await Sentry.captureMessage('start domain change handler (poster/trailer)');
            await update_Poster_Trailers(domains, changedDomains, 'movies');
            await update_Poster_Trailers(domains, changedDomains, 'serials');
            await Sentry.captureMessage('start domain change handler (download links)');
            await updateDownloadLinks(sourcesObject, changedDomains);

            let collection = await getCollection('sources');
            await collection.findOneAndUpdate({title: 'sources'}, {
                $set: sourcesObject
            });
            Sentry.captureMessage('source domain changed');
        }
    } catch (error) {
        saveError(error);
    }
}

function updateSourceFields(sourcesObject, sources, domains) {
    sourcesObject.digimoviez.movie_url = sources[0];
    sourcesObject.digimoviez.serial_url = getNewURl(sourcesObject.digimoviez.serial_url, domains[0]);

    sourcesObject.film2media.movie_url = sources[1];

    sourcesObject.film2movie.movie_url = sources[2];

    sourcesObject.salamdl.movie_url = sources[3];

    sourcesObject.valamovie.movie_url = sources[4];
    sourcesObject.valamovie.serial_url = getNewURl(sourcesObject.valamovie.serial_url, domains[4]);
}

async function updateDownloadLinks(sourcesObject, changedDomains) {
    // film2media
    for (let i = 0; i < changedDomains.length; i++) {
        let domain = changedDomains[i];
        if (domain.includes('digimoviez')) {
            let startTime = new Date();
            await Sentry.captureMessage('start domain change handler (digimoviez reCrawl start)');
            await digimoviez({
                ...sourcesObject.digimoviez,
                page_count: 327,
                serial_page_count: 48
            });
            let endTime = new Date();
            let crawlingDuration = (endTime.getTime() - startTime.getTime()) / 1000;
            await Sentry.captureMessage(`start domain change handler (digimoviez reCrawl ended) in ${crawlingDuration} s`);
        } else if (domain.includes('film2media')) {
            let startTime = new Date();
            await Sentry.captureMessage('start domain change handler (film2media reCrawl start)');
            await film2media({
                ...sourcesObject.film2media,
                page_count: 380,
            });
            let endTime = new Date();
            let crawlingDuration = (endTime.getTime() - startTime.getTime()) / 1000;
            await Sentry.captureMessage(`start domain change handler (film2media reCrawl ended) in ${crawlingDuration} s`);
        }
    }
}

export async function update_Poster_Trailers(domains, changedDomains, collectionName) {
    let collection = await getCollection(collectionName);
    let docs_array = await collection.find({}, {projection: {poster: 1, trailers: 1}}).toArray();
    let sourcesNames = domains.map(value => value.replace(/\d/g, '').split('.')[0]);
    let changedSourcesName = changedDomains.map(value => value.replace(/\d/g, '').split('.')[0]);
    let promiseArray = [];
    for (let i = 0; i < docs_array.length; i++) {
        let posterChanged = false;
        let trailerChanged = false;
        let posters = docs_array[i].poster || [];
        let trailers = docs_array[i].trailers || [];

        try {
            for (let j = 0; j < posters.length; j++) {
                for (let k = 0; k < changedSourcesName.length; k++) {
                    if (posters[j].includes(changedSourcesName[k])) {
                        posterChanged = true;
                        let newDomain = domains[sourcesNames.indexOf(changedSourcesName[k])];
                        posters[j] = getNewURl(posters[j], newDomain);
                        break;
                    }
                }
            }

            for (let t = 0; t < trailers.length; t++) {
                for (let k = 0; k < changedSourcesName.length; k++) {
                    if (trailers[t].link.includes(changedSourcesName[k])) {
                        //todo : better trailer updater for valamovie/digimovie
                        if (!trailers[k].link.includes('play.mylionstrailer')) {
                            trailerChanged = true;
                            let newDomain = domains[sourcesNames.indexOf(changedSourcesName[k])];
                            trailers[t].link = getNewURl(trailers[t].link, newDomain);
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            saveError(error);
        }

        let updateObj = {};
        if (posterChanged) {
            updateObj.poster = posters;
        }
        if (trailerChanged) {
            updateObj.trailers = trailers;
        }
        if (posterChanged || trailerChanged) {
            let resultPromise = collection.findOneAndUpdate({_id: docs_array[i]._id}, {
                $set: updateObj
            });
            promiseArray.push(resultPromise);
        }
        if (i % 100 === 0) {
            await Promise.all(promiseArray);
            promiseArray = [];
        }
    }
}

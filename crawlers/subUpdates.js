const {handleLatestDataUpdate} = require("./latestData");
const {checkSource, removeDuplicateLinks, removeDuplicateElements} = require('./utils');


export function handleSubUpdates(db_data, poster, trailers, watchOnlineLinks, titleModel, type) {
    let posterChange = handlePosterUpdate(db_data, poster);
    let trailerChange = handleTrailerUpdate(db_data, trailers);
    let watchOnlineLinksChange = handleWatchOnlineLinksUpdate(db_data, watchOnlineLinks);
    let latestDataChange = handleLatestDataUpdate(db_data, titleModel.latestData, type);

    return {
        posterChange,
        trailerChange,
        watchOnlineLinksChange,
        latestDataChange,
    };
}

function handlePosterUpdate(db_data, poster) {
    if (poster === '') {
        return false;
    }

    for (let i = 0; i < db_data.posters.length; i++) {
        if (checkSource(db_data.posters[i], poster)) {//this poster exist
            if (db_data.posters[i] !== poster) { //replace link
                db_data.posters[i] = poster;
                db_data.posters = removeDuplicateElements(db_data.posters);
                return true;
            } else {
                return false;
            }
        }
    }

    db_data.posters.push(poster); //new poster
    db_data.posters = removeDuplicateElements(db_data.posters);
    db_data.posters = sortPosters(db_data.posters);
    return true;
}

function handleTrailerUpdate(db_data, site_trailers) {
    let trailersChanged = false;
    if (db_data.trailers === null && site_trailers.length > 0) {
        db_data.trailers = site_trailers;
        return true;
    }
    for (let i = 0; i < site_trailers.length; i++) {
        let trailer_exist = false;
        for (let j = 0; j < db_data.trailers.length; j++) {
            if (site_trailers[i].info === db_data.trailers[j].info) {//this trailer exist
                if (site_trailers[i].link !== db_data.trailers[j].link) { //replace link
                    db_data.trailers[j].link = site_trailers[i].link;
                    trailersChanged = true;
                }
                trailer_exist = true;
                break;
            }
        }
        if (!trailer_exist) { //new trailer
            db_data.trailers.push(site_trailers[i]);
            trailersChanged = true;
        }
    }
    if (db_data.trailers !== null) {
        db_data.trailers = removeDuplicateLinks(db_data.trailers);
        db_data.trailers = sortTrailers(db_data.trailers);
    }
    return trailersChanged;
}

function handleWatchOnlineLinksUpdate(db_data, siteWatchOnlineLinks) {
    let onlineLinkChanged = false;
    for (let i = 0; i < siteWatchOnlineLinks.length; i++) {
        let linkExist = false;
        for (let j = 0; j < db_data.watchOnlineLinks.length; j++) {
            if (siteWatchOnlineLinks[i].info === db_data.watchOnlineLinks[j].info) {//this trailer exist
                if (siteWatchOnlineLinks[i].link !== db_data.watchOnlineLinks[j].link) { //replace link
                    db_data.watchOnlineLinks[j].link = siteWatchOnlineLinks[i].link;
                    onlineLinkChanged = true;
                }
                linkExist = true;
                break;
            }
        }
        if (!linkExist) { //new onlineLink
            db_data.watchOnlineLinks.push(siteWatchOnlineLinks[i]);
            onlineLinkChanged = true;
        }
    }
    db_data.watchOnlineLinks = removeDuplicateLinks(db_data.watchOnlineLinks);
    return onlineLinkChanged;
}

export function handleUrlUpdate(thiaSource, page_link) {
    if (page_link.includes('webcache')) {
        return false;
    }
    if (thiaSource.url !== page_link) {
        thiaSource.url = page_link;
        return true;
    }
    return false;
}

function sortPosters(posters) {
    const posterSources = ['valamovie', 'digimovie', 'film2movie', 'film2media', 'salamdl', 'zar', 'golching', 'anime-list', 'animelist', 'nineanime', 'bia2anime', 'ba2hd'];
    let sortedPosters = [];
    for (let i = 0; i < posterSources.length; i++) {
        for (let j = 0; j < posters.length; j++) {
            if (posters[j].includes(posterSources[i])) {
                sortedPosters.push(posters[j]);
            }
        }
    }
    return sortedPosters;
}

function sortTrailers(trailers) {
    const trailerSources = ['valamovie', 'zar', 'digimovie', 'anime-list', 'film2movie', 'salamdl', 'ba2hd', 'animelist', 'nineanime', 'bia2anime', 'golching', 'film2media'];
    let trailerQualities = ['1080', '720', '360'];
    let sortedTrailers = [];

    for (let i = 0; i < trailerSources.length; i++) {
        for (let j = 0; j < trailerQualities.length; j++) {
            for (let k = 0; k < trailers.length; k++) {
                if (trailers[k].info.includes(trailerSources[i]) &&
                    trailers[k].info.includes(trailerQualities[j])) {
                    sortedTrailers.push(trailers[k]);
                }
            }
        }
    }
    return sortedTrailers;
}

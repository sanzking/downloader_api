const router = require('express').Router();
const getCollection = require("../mongoDB");
const {dataConfig, extraInfo} = require("./configs");
const {getCache_SeriesOfDay, getCache_seriesOfWeek} = require("../cache");

//timeLine/today/:page/:count?
router.get('/today/:page/:count?', async (req, res) => {
    let page = Number(req.params.page);
    let count = Number(req.params.count) || 1;

    let skip = (page === 0) ? 0 : 12 * (page - 1);
    let limit = (page === 0) ? count : 12;

    //cache
    if (page <= 3) {
        let cacheResult = getCache_SeriesOfDay();
        if (cacheResult) {
            return res.json({data: cacheResult.slice(skip, skip + limit), extraInfo});
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    let dayNumber = date.getDay();
    date.setDate(date.getDate() + 8);
    let collection = await getCollection('serials');
    let searchResults = await collection
        .find({
            releaseDay: daysOfWeek[dayNumber],
            nextEpisode: {$ne: null},
            'nextEpisode.releaseStamp': {$lte: date.toISOString()}
        }, {projection: dataConfig['medium']})
        .sort({premiered: -1})
        .skip(skip)
        .limit(limit)
        .toArray();
    if (searchResults.length > 0) {
        return res.json({data: searchResults, extraInfo});
    }
    return res.sendStatus(404);
});

//timeLine/week/:weekCounter
router.get('/week/:weekCounter', async (req, res) => {
    let weekCounter = Number(req.params.weekCounter);
    weekCounter = weekCounter < 0 ? 0 : weekCounter;
    //cache
    if (weekCounter <= 1) {
        let cacheResult = getCache_seriesOfWeek(weekCounter);
        if (cacheResult) {
            return res.json({data: cacheResult, extraInfo});
        }
    }
    //database
    let daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let date = new Date();
    let dayNumber = date.getDay();
    date.setDate(date.getDate() - dayNumber + 7 * weekCounter + 8); // first day of week
    let daysInfo = [];
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        daysInfo.push({
            releaseDay: daysOfWeek[i],
            nextEpisode: {$ne: null},
            'nextEpisode.releaseStamp': {$lte: date.toISOString()}
        });
    }
    let collection = await getCollection('serials');
    let searchResults = await collection
        .find({
            $or: daysInfo
        }, {projection: dataConfig['medium']})
        .sort({releaseDay: -1})
        .toArray();
    if (searchResults.length > 0) {
        let groupSearchResult = searchResults.reduce((r, a) => {
            r[a.releaseDay] = [...r[a.releaseDay] || [], a];
            return r;
        }, {});
        return res.json({data: groupSearchResult, extraInfo});
    }
    return res.sendStatus(404);
});


export default router;
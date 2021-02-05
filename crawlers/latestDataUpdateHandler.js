const {getSeasonEpisode, checkBetterQuality, getHardSub, getDubbed} = require("./utils");

export function handleLatestDataUpdate(db_data, latestData, mode) {
    let changed = false;
    let hardSubChange = false;
    let dubbedChange = false;
    let prevLatestData = db_data.latestData;

    if (mode === 'serial') {
        if ((latestData.season > prevLatestData.season) ||
            (latestData.season === prevLatestData.season && latestData.episode > prevLatestData.episode) ||
            (latestData.season === prevLatestData.season &&
                latestData.episode === prevLatestData.episode &&
                checkBetterQuality(latestData.quality, prevLatestData.quality))) {
            changed = true;
        }
    } else if (checkBetterQuality(latestData.quality, prevLatestData.quality)) {
        changed = true;
    }

    if (prevLatestData.hardSub !== latestData.hardSub ||
        prevLatestData.dubbed !== latestData.dubbed) {
        if (mode === 'serial') {
            let prev = getSeasonEpisode(prevLatestData.hardSub);
            let current = getSeasonEpisode(latestData.hardSub);
            hardSubChange = (prev.season < current.season) ||
                (prev.season === current.season && prev.episode < current.episode);
            prev = getSeasonEpisode(prevLatestData.dubbed);
            current = getSeasonEpisode(latestData.dubbed);
            dubbedChange = (prev.season < current.season) ||
                (prev.season === current.season && prev.episode < current.episode);
        } else {
            hardSubChange = !prevLatestData.hardSub && latestData.hardSub;
            dubbedChange = !prevLatestData.dubbed && latestData.dubbed;
        }
    }

    if (changed) {
        db_data.latestData.season = latestData.season;
        db_data.latestData.episode = latestData.episode;
        db_data.latestData.quality = latestData.quality;
    }
    if (hardSubChange) {
        db_data.latestData.hardSub = latestData.hardSub;
    }
    if (dubbedChange) {
        db_data.latestData.dubbed = latestData.dubbed;
    }

    return changed || hardSubChange || dubbedChange;
}

export function getLatestData(site_links, mode) {
    let latestSeason = mode === 'movie' ? 0 : 1;
    let latestEpisode = mode === 'movie' ? 0 : 1;
    let latestQuality = site_links[0].info;
    let hardSub = mode === 'movie' ? false : '';
    let dubbed = mode === 'movie' ? false : '';

    for (let i = 0; i < site_links.length; i++) {
        let link = site_links[i].link;
        let info = site_links[i].info;
        if (mode === 'serial') {
            let {season, episode} = getSeasonEpisode(link);
            if (season > latestSeason) { //found new season
                latestSeason = season;
                latestEpisode = episode;
                latestQuality = info;
                hardSub = getHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                dubbed = getDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
            } else if (season === latestSeason) {
                if (episode > latestEpisode) {
                    latestEpisode = episode;
                    latestQuality = info;
                    hardSub = getHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = getDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                } else if (episode === latestEpisode) {
                    latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
                    hardSub = getHardSub(info) ? `s${latestSeason}e${latestEpisode}` : hardSub;
                    dubbed = getDubbed(link, info) ? `s${latestSeason}e${latestEpisode}` : dubbed;
                }
            }
        } else if (mode === 'movie') {
            latestQuality = checkBetterQuality(info, latestQuality) ? info : latestQuality;
            hardSub = getHardSub(info) || hardSub;
            dubbed = getDubbed(link, info) || dubbed;
        }
    }
    return {season: latestSeason, episode: latestEpisode, quality: latestQuality, hardSub, dubbed};
}

const {getLatestData} = require("../latestData");

export function getTitleModel(titleObj, page_link, type, siteDownloadLinks, year, poster, persianSummary, trailers, watchOnlineLinks) {
    let {season, episode, quality, hardSub, dubbed} = getLatestData(siteDownloadLinks, type);
    type = (!type.includes('anime') && titleObj.jikanFound) ? 'anime_' + type : type;
    return {
        title: titleObj.title,
        type: type,
        rawTitle: titleObj.rawTitle,
        alternateTitles: titleObj.alternateTitles,
        titleSynonyms: titleObj.titleSynonyms,
        sources: [{
            url: page_link,
            links: siteDownloadLinks //[{link,info,qualitySample}]
        }],
        like: 0,
        dislike: 0,
        insert_date: new Date(),
        update_date: 0,
        apiUpdateDate: new Date(),
        castUpdateDate: 0,
        seasons: [],
        episodes: [],
        posters: [poster],
        summary: {
            persian: persianSummary,
            english: '',
        },
        trailers: trailers.length > 0 ? trailers : null, // [{'link,info'}]
        watchOnlineLinks: watchOnlineLinks,
        latestData: {
            season: type.includes('movie') ? 0 : season,
            episode: type.includes('movie') ? 0 : episode,
            quality: quality,
            hardSub: hardSub,
            dubbed: dubbed
        },
        status: type.includes('movie') ? 'ended' : 'unknown',
        releaseDay: "",
        year: year,
        premiered: year,
        endYear: year,
        officialSite: "",
        webChannel: "",
        nextEpisode: null,
        totalDuration: '',
        //3rd party api data
        imdbID: "",
        tvmazeID: 0,
        jikanID: 0,
        totalSeasons: 0,
        boxOffice: "",
        rated: "",
        movieLang: "",
        country: "",
        genres: [],
        rating: {
            imdb: 0,
            rottenTomatoes: 0,
            metacritic: 0,
            myAnimeList: 0
        },
        duration: "0 min",
        staffAndCharactersData: [],
        actors: [],
        directors: [],
        writers: [],
        awards: "",
        //jikan api data
        animeType: '',
        animeSource: '',
        relatedTitles: [],
    };
}

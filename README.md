dataConfig = {
    low: {
        title: 1,
        premiered: 1,
        poster: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
    },
    medium: {
        title: 1,
        premiered: 1,
        poster: 1,
        type: 1,
        rawTitle: 1,
        rating: 1,
        like: 1,
        genres: 1,
        dislike: 1,
        trailers: 1,
        latestData: 1,
        nextEpisode: 1,
    },
    high: {* all *}
}

extraInfo = {
    onlineStreamingSources: ['film2movie', 'salamdl', 'film2media'],
    highQualityPoster: ['salamdl', 'valamovie', 'film2media'],
    lowQualityPoster: ['digimovies', 'topmovie', 'film2movies'],
}


[types] => movie / serial
[dataLevel] => low/medium/high
if page = 0 then return based on count value

//crawler/crawlAll/:password/:mode?
//crawler/crawlSingleSource/:sourceNumber/:password/:mode?
//crawler/domainChange/:password

//search/searchByTitle/:title/:types/:dataLevel/:page/:count?
//search/searchByID/:id/:dataLevel

//news/:types/:dataLevel/:page/:count?

//updates/:types/:dataLevel/:page:/:count?

//tops/byLikes/:types/:dataLevel/:page/:count?
//tops/IMDBShows/:dataLevel/:page/:count?

//trailers/:types/:page/:count?

//timeLine/day/:spacing/:page/:count?
//timeLine/week/:weekCounter

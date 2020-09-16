const fs = require('fs');
const film2media = require('./sources/film2media');
const digimovies = require('./sources/digimovies');
const salamdl = require('./sources/salamdl');
const film2movie = require('./sources/film2movie');
const mrmovie = require('./sources/mrmovie');
const topmovies = require('./sources/topmovies');
const valamovie = require('./sources/valamovie');

async function start_crawling() {
    return new Promise(async (resolve, reject) => {
        try {
            let time1 = new Date();

            let json_file = fs.readFileSync('./crawlers/sources.json', 'utf8')
            let saved_array = JSON.parse(json_file);

            await digimovies({...saved_array.digimovies});
            await film2media({...saved_array.film2media});
            await film2movie({...saved_array.film2movie});
            await mrmovie({...saved_array.mrmovie});
            await salamdl({...saved_array.salamdl});
            await topmovies({...saved_array.topmovies});
            await valamovie({...saved_array.valamovie});

            let time2 = new Date();
            console.log('total time : ', (time2.getTime() - time1.getTime()));
            resolve();

        } catch (error) {
            console.log(error)
            reject();
        }
    })
}

export default start_crawling;
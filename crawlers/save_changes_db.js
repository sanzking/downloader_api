const {sort_links} = require('./search_tools');
import getCollection from '../mongoDB';
import {add_cached_news, update_cached_news, update_cached_titles, update_cashed_likes} from "../cache";


module.exports = async function save(title_array, page_link, save_link, persian_plot, mode) {
    try {

        let startTime = new Date();
        let year = (mode === 'movie') ? getYear(page_link, save_link) : '';
        let title = title_array.join(' ').trim();
        let result = {
            title: title,
            persian_plot: persian_plot,
            sources: [{
                url: page_link,
                links: save_link
            }],
            year: year,
            like: 0,
            dislike: 0,
            insert_date: new Date(),
            update_date: 0
        };

        let collection_name = (mode === 'serial') ? 'serials' : 'movies';
        let collection = await getCollection(collection_name);
        let search_result = await collection.findOne({title : title});

        if (search_result !== null){

            let sources = search_result.sources;
            let source_exist = false;
            for (let j = 0; j < sources.length; j++) {//check source exist
                let update = false;
                if (checkSources(sources[j].url, page_link)) { // this source exist // no need to search anymore
                    source_exist = true;

                    if (mode === 'movie') { //movie
                        update = handle_movie_changes(save_link, sources[j], update);
                    } else { //serial
                        update = handle_serial_changes(save_link, sources[j], update);
                    }

                    if (update) {
                        update_cached_titles(mode, search_result);
                        update_cashed_likes(mode, [search_result]);
                        update_cached_news(mode, search_result);
                        await collection.findOneAndUpdate({_id: search_result._id}, {
                            $set: {
                                sources: search_result.sources,
                                update_date: new Date()
                            }
                        });
                    }

                    break;
                }
            }

            if (!source_exist) {//new source
                console.log('-----new source');
                search_result.sources.push(result.sources[0]);
                update_cached_titles(mode, search_result);
                update_cashed_likes(mode, [search_result]);
                update_cached_news(mode, search_result);
                await collection.findOneAndUpdate({_id: search_result._id}, {
                    $set: {
                        sources: search_result.sources,
                        update_date: new Date()
                    }
                });
            }

        } else {//new title
            console.log('-----new title');
            add_cached_news(mode, result);
            await collection.insertOne(result);
        }

        let endTime = new Date();
        console.log('-------------- time : ', (endTime.getTime() - startTime.getTime()))
    } catch (e) {
        console.error(e)
    }
}

function handle_movie_changes(save_link, thisSource, update) {
    let links = thisSource.links;
    for (let l = 0; l < save_link.length; l++) {//check links exist
        let link_exist = false;
        for (let k = 0; k < links.length; k++) {
            if (links[k].link === save_link[l].link) { //this link exist
                link_exist = true;
                if (links[k].info !== save_link[l].info &&
                    links[k].info.length < save_link[l].info.length) {//link info update
                    thisSource.links[k].info = save_link[l].info
                    update = true;
                }
                break;
            }
        }
        if (!link_exist) {//movie new link
            console.log('-----movie new link')
            thisSource.links.push(save_link[l]);
            update = true;
        }
    }
    return update;
}

function handle_serial_changes(save_link, thisSource, update) {
    let links = thisSource.links;
    for (let s = 0; s < save_link.length; s++) {//check links exist
        let season1 = getSeason(save_link[s][0].link);
        let season_exist = false;
        for (let l = 0; l < save_link[s].length; l++) {
            let link_exist = false;
            E :for (let k = 0; k < links.length; k++) {
                let season2 = getSeason(links[k][0].link);
                for (let h = 0; h < links[k].length; h++) {
                    if (links[k][h].link === save_link[s][l].link) { //this link exist
                        link_exist = true;
                        if (season1 === season2)
                            season_exist = true;
                        break E;
                    }
                }
                if (!link_exist && season1 === season2) {//serial season new link
                    console.log('------serial season new link');
                    season_exist = true;
                    thisSource.links[k].push(save_link[s][l]);
                    update = true;
                    break;
                }
            }
        }//end of checking all of this season links
        if (!season_exist) {//serial new season
            console.log('------serial new season');
            thisSource.links.push(save_link[s]);
            thisSource.links = sort_links(thisSource.links.flat(1))
            update = true;
        }
    }//end of seasons
    return update;
}

function getYear(page_link, save_link) {
    let url_array = page_link.replace(/[-/]/g, ' ').split(' ').filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (url_array.length > 0) {
        let lastPart = url_array.pop();
        if (Number(lastPart) < 2100)
            return lastPart;
    }

    let link = save_link[0].link;
    let link_array = link.replace(/[-_()]/g, '.').split('.').filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (link_array.length > 0) {
        return link_array.pop()
    } else return '';
}

function getSeason(link) {
    return Number(link.toLowerCase().match(/s\d\de\d\d/g)[0].slice(1, 3));
}

function checkSources(case1, case2) {
    let source_name = case1.replace('https://', '')
        .replace('www.', '')
        .split('.')[0];
    let new_source_name = case2.replace('https://', '')
        .replace('www.', '')
        .split('.')[0];
    return source_name === new_source_name
}
const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    checkDubbed,
    replacePersianNumbers,
    purgeQualityText,
    persianWordToNumber,
    getSeasonEpisode,
    getDecodedLink
} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function bia2anime({movie_url, page_count}) {
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let text = link.text();
        if (text && text.includes('مطلب') && text.includes('ادامه')) {
            let title = link.attr('title').toLowerCase().split('|')[0];
            let page_link = link.attr('href');
            let type = title.includes('movie') ? 'anime_movie' : 'anime_serial';
            if (process.env.NODE_ENV === 'dev') {
                console.log(`bia2anime/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title, type);

            if (title === 'dota dragons blood' && type === 'anime_serial') {
                type = 'serial';
            }

            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size, null);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    save_link = sortLinks(save_link);
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    title = replaceShortTitleWithFull(title);
                    await save(title, page_link, save_link, persian_summary, poster, [], [], type);
                }
            }
        }
    } catch (error) {
        saveError(error);
    }
}

function get_persian_summary($) {
    try {
        let $p = $('p');
        for (let i = 0; i < $p.length; i++) {
            if ($($p[i]).hasClass('postPlot')) {
                let temp = $($($p[i]).children()[0]).text();
                return $($p[i]).text().replace(temp, '').trim();
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_poster($) {
    try {
        let $div = $('div');
        for (let i = 0; i < $div.length; i++) {
            if ($($div[i]).hasClass('imgWrapper')) {
                let src = $($($div[i]).children()[0]).children()[0].attribs['data-lazy-src'];
                src = src.replace(/-\d\d+x\d\d+/g, '');
                if (src.includes('uploads')) {
                    return src;
                }
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size($, link, type) {
    // 'S1E01.720p'  //
    try {
        if (type.includes('serial')) {
            return get_file_size_serial($, link);
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size_serial($, link) {
    let parentNode = link;
    let counter = 0;
    while (counter < 10) {
        if ($(parentNode).hasClass('dl-body')) {
            break;
        } else {
            parentNode = $(parentNode).parent();
            counter++;
        }
        if (counter === 14) {
            return 'ignore';
        }
    }
    let infoNodeChildren = $(parentNode.prev().children()[0]).children();

    let linkHref = getDecodedLink($(link).attr('href')).toLowerCase();
    let linkText = $(link).text();
    let dubbed = checkDubbed(linkHref, '') ? 'dubbed' : '';

    let seasonText = replacePersianNumbers($(infoNodeChildren[0]).text().toLowerCase());
    let seasonNumber = persianWordToNumber(seasonText);
    if (seasonNumber === 0) {
        if (seasonText.includes('فصل')) {
            let seasonMatch = linkHref.match(/\d+/g);
            if (seasonMatch && seasonText.length < 8) {
                seasonNumber = Number(seasonMatch.pop());
            } else {
                let seasonMatch = linkHref.match(/([.\/])s\d+([.\/])/g);
                if (seasonMatch) {
                    seasonNumber = Number(seasonMatch.pop().replace(/[.s\/]/g, ''));
                } else {
                    let seasonMatch = seasonText.match(/season \d+|\(\s*s\d+\s*\)/g);
                    if (seasonMatch) {
                        seasonNumber = Number(seasonMatch.pop().replace(/season|[\s()s]/g, ''));
                    } else {
                        return 'ignore';
                    }
                }
            }
        } else {
            seasonNumber = 1;
        }
    }

    let episodeNumber = linkHref
        .match(/([.\-])\s*\d+\s*(\.bd|\.10bit)*\s*([.\[]+)\d\d\d+p*([.\]])|s\d+e\d+|e\d+/g)[0]
        .replace(/(\.bd|\.10bit)*\s*([.\[]+)\d\d\d+p*([.\]])|\s|^[.\-]|s\d+e|e/g, '')
        .split(/([.\-])/g)[0];
    let seasonEpisode = 'S' + seasonNumber + 'E' + episodeNumber;

    let quality;
    if (linkText.match(/\d\d\d+p*/gi)) {
        quality = purgeQualityText(linkText);
    } else {
        let qualityText = $(infoNodeChildren[1]).text();
        qualityText = qualityText.match(/\d\d\d+p*/gi) ? qualityText : $(infoNodeChildren[2]).text();
        qualityText = qualityText.match(/\d\d\d+p*/gi) ? qualityText : '';
        if (!qualityText) {
            let qualityMatch = linkHref.match(/\d\d\d+p/g);
            if (qualityMatch) {
                qualityText = qualityMatch.pop();
            }
        }
        quality = purgeQualityText(qualityText);
    }
    quality = quality.includes('p') ? quality : quality !== '' ? quality + 'p' : '';
    quality = replacePersianNumbers(quality);

    return [seasonEpisode, quality, dubbed].filter(value => value).join('.');
}

function sortLinks(links) {
    return links.sort((a, b) => {
        let a_SE = getSeasonEpisode(a.info);
        let b_SE = getSeasonEpisode(b.info);
        return ((a_SE.season > b_SE.season) || (a_SE.season === b_SE.season && a_SE.episode > b_SE.episode)) ? 1 : -1;
    });
}

function replaceShortTitleWithFull(title, type) {
    if (title === 'slime taoshite 300 nen' && type === 'anime_serial') {
        title = 'slime taoshite 300 nen shiranai uchi ni level max ni nattemashita';
    } else if (title === 'otome game no hametsu flag' && type === 'anime_serial') {
        title = 'otome game no hametsu flag shika nai akuyaku reijou ni tensei shiteshimatta all seasons';
    } else if (title === 'mushoku tensei' && type === 'anime_serial') {
        title = 'mushoku tensei isekai ittara honki dasu';
    } else if (title === 'kings raid ishi o tsugu mono tachi' && type === 'anime_serial') {
        title = 'kings raid ishi wo tsugumono tachi';
    } else if (title === 'tatoeba last dungeon mae no mura' && type === 'anime_serial') {
        title = 'tatoeba last dungeon mae no mura no shounen ga joban no machi de kurasu youna monogatari';
    } else if (title === 'shinchou yuusha' && type === 'anime_serial') {
        title = 'shinchou yuusha kono yuusha ga ore tueee kuse ni shinchou sugiru';
    } else if (title === 'maou gakuin no futekigousha' && type === 'anime_serial') {
        title = 'maou gakuin no futekigousha shijou saikyou no maou no shiso tensei shite shison tachi no gakkou e';
    } else if (title === 'kaguya sama wa kokurasetai' && type === 'anime_serial') {
        title = 'kaguya sama wa kokurasetai tensai tachi no renai zunousen all seasons';
    } else if (title === 'honzuki no gekokujou' && type === 'anime_serial') {
        title = 'honzuki no gekokujou shisho ni naru tame ni wa shudan wo erandeiraremasen all seasons';
    } else if (title === 'itai no wa iya nano de bougyoryoku' && type === 'anime_serial') {
        title = 'itai no wa iya nano de bougyoryoku ni kyokufuri shitai to omoimasu all seasons';
    }
    return title;
}

const {search_in_title_page, wrapper_module} = require('../searchTools');
const {
    purgeTitle,
    getType,
    removeDuplicateLinks,
    checkHardSub,
    checkDubbed,
    purgeQualityText,
    purgeSizeText,
    purgeEncoderText
} = require('../utils');
const save = require('../save_changes_db');
const {saveError} = require("../../saveError");


module.exports = async function zarmovie({movie_url, serial_url, page_count, serial_page_count}) {
    // await wrapper_module(serial_url, serial_page_count, search_title);
    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    try {
        let title = link.attr('title');
        if (title && title.includes('دانلود') && link.text().includes('دانلود')) {
            let page_link = link.attr('href');
            let type = getType(title);
            if (process.env.NODE_ENV === 'dev') {
                console.log(`zarmovie/${type}/${i}/${title}  ========>  `);
            }
            title = purgeTitle(title.toLowerCase(), type);
            if (title !== '') {
                let pageSearchResult = await search_in_title_page(title, page_link, type, get_file_size, getQualitySample);
                if (pageSearchResult) {
                    let {save_link, $2} = pageSearchResult;
                    let persian_summary = get_persian_summary($2);
                    let poster = get_poster($2);
                    let trailers = getTrailers($2);
                    await save(title, page_link, save_link, persian_summary, poster, trailers, [], type);
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
            if ($($p[i]).text().includes('خلاصه داستان :')) {
                return $($p[i]).text().replace('خلاصه داستان :', '').trim();
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
        let imgs = $('img');
        for (let i = 0; i < imgs.length; i++) {
            let parent = imgs[i].parent;
            if (parent.name === 'a') {
                let href = parent.attribs.href;
                if (href.includes('uploads')) {
                    return href;
                }
            }
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

function getTrailers($) {
    try {
        let result = [];
        let a = $('a');
        for (let i = 0; i < a.length; i++) {
            let title = $(a[i]).attr('title');
            let text = $(a[i]).text();
            if (title && title.toLowerCase().includes('پخش آنلاین') && text.includes('مشاهده تریلر')) {
                let href = $(a[i]).attr('href');
                result.push({
                    link: href,
                    info: 'zarmovie-720p'
                });
            }
        }

        result = removeDuplicateLinks(result);
        return result;
    } catch (error) {
        saveError(error);
        return [];
    }
}

function get_file_size($, link, type) {
    // '720p.Bluray.YIFY.HardSub - 1.74GB' // '1080p.Web-Dl.GalaxyRG.HardSub - 797.08MB'
    //'1080p.x265.Bluray.PSA.HardSub - 2.16GB' // '1080p.x265.10bit.WEB-DL.HardSub - 300MB'
    try {
        if (type === 'serial') {
            return get_file_size_serial($, link);
        }
        return get_file_size_movie($, link);
    } catch (error) {
        saveError(error);
        return '';
    }
}

function get_file_size_serial($, link) {
    let infoNodeChildren = $(link).parent().parent().parent().parent().prev().children();
    let hardSub = checkHardSub($(infoNodeChildren[0]).text()) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), $(infoNodeChildren[0]).text()) ? 'dubbed' : '';
    if (hardSub || dubbed) {
        infoNodeChildren = infoNodeChildren.slice(1);
    }
    let qualityEncode = $(infoNodeChildren[0]).text().replace('WEB-DL - HDTV', 'WEB-DL').split(' - ');
    let qualityText = purgeQualityText(qualityEncode[0]).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    let encoder = qualityEncode.length > 1 ? purgeEncoderText(qualityEncode[1]) : '';
    let size = purgeSizeText($(infoNodeChildren[2]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.');
    return [info, size].filter(value => value).join(' - ');
}

function get_file_size_movie($, link) {
    let infoNodeChildren = $(link).parent().prev().children();
    let hardSub = checkHardSub($(infoNodeChildren[0]).text()) ? 'HardSub' : '';
    let dubbed = checkDubbed($(link).attr('href'), $(infoNodeChildren[0]).text()) ? 'dubbed' : '';
    if (hardSub || dubbed) {
        infoNodeChildren = infoNodeChildren.slice(1);
    }
    let qualityText = purgeQualityText($(infoNodeChildren[0]).text()).split(' ');
    let quality = [...qualityText.slice(1), qualityText[0]].filter(value => value).join('.');
    if (!quality) {
        let linkHref = $(link).attr('href').split('.');
        linkHref.pop();
        linkHref.pop();
        let seasonEpisodeIndex = linkHref.findIndex((value => value.match(/\d\d\d\dp|\d\d\dp/g)));
        quality = linkHref.slice(seasonEpisodeIndex).join('.').replace('.HardSub', '');
    }
    let size = purgeSizeText($(infoNodeChildren[1]).text());
    let encoder = purgeEncoderText($(infoNodeChildren[3]).text());
    let info = [quality, encoder, hardSub, dubbed].filter(value => value).join('.')
        .replace('.MkvCage.MkvCage', '.MkvCage');
    return [info, size].filter(value => value).join(' - ');
}

function getQualitySample($, link, type) {
    try {
        if (type.includes('serial')) {
            return '';
        }
        let nextNode = $(link).next()[0];
        let sampleUrl = nextNode.attribs['data-imgqu'];
        if (sampleUrl.includes('.jpg')) {
            return sampleUrl;
        }
        return '';
    } catch (error) {
        saveError(error);
        return '';
    }
}

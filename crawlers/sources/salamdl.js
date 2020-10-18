const {
    search_in_title_page, wrapper_module,
    remove_persian_words, sort_links, getMode
} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');
import {save_error} from "../../save_logs";

module.exports = async function salamdl({movie_url, page_count}) {

    await wrapper_module(movie_url, page_count, search_title);
}

async function search_title(link, i) {
    let rel = link.attr('rel');
    if (rel && rel === 'bookmark') {
        let title = link.text().toLowerCase();
        let mode = getMode(title);
        let page_link = link.attr('href');
        // console.log(`salamdl/${mode}/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title, mode);
        if (title_array.length > 0) {
            let {save_link, persian_plot, poster} = await search_in_title_page(title_array, page_link, mode,
                get_file_size, get_persian_plot, get_poster);
            if (save_link.length > 0) {
                if (mode === "serial") {
                    let result = sort_links(save_link);
                    if (result.length > 0)
                        await save(title_array, page_link, result, persian_plot, poster, 'serial');
                } else {
                    await save(title_array, page_link, save_link, persian_plot, poster, 'movie');
                }
            }
        }
    }
}

function get_persian_plot($) {
    try {
        let paragraphs = $('p');
        for (let i = 0; i < paragraphs.length; i++) {
            let temp = $(paragraphs[i]).text();
            if (temp && temp.includes('خلاصه داستان'))
                return temp.replace('خلاصه داستان :', '').trim();
        }
        return '';
    } catch (error) {
        error.massage = "module: salamdl.js >> get_persian_plot ";
        error.time = new Date();
        save_error(error);
        return '';
    }
}

function get_poster($) {
    try {
        let imgs = $('img');
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'a') {
                return src;
            }
        }
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'p') {
                return src;
            }
        }
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].attribs.src;
            let parent = imgs[i].parent.name;
            if (parent === 'div') {
                return src;
            }
        }
        return '';
    } catch (error) {
        error.massage = "module: salamdl.js >> get_poster ";
        error.time = new Date();
        save_error(error);
        return '';
    }
}

function get_file_size($, link, mode) {
    //'720p.x265.WEB-DL - 200MB'    //'480p.WEB-DL - 150MB'
    //'720p.WEB-DL.YTS - 848.85MB'  //'1080p.x265.10bit.WEB-DL.PSA - 1.98GB'
    let text_array;
    try {
        if (mode === 'serial') {
            return get_file_size_serial($, link);
        }

        let text = $(link).text();
        let dubbed = '';
        if (text.includes('(دوبله فارسی)') ||
            text.includes('(دو زبانه)') ||
            $(link).attr('href').toLowerCase().includes('farsi')) {
            dubbed = 'dubbed';
            text = text.replace('(دوبله فارسی)', '').replace('(دو زبانه)', '');
        }
        text_array = text.split('|');

        if (text.includes('لینک مستقیم')) {
            return get_file_size_extrLink($, link);
        }

        let {info, size} = get_movie_size_info(text_array, dubbed);
        return [info, size].filter(value => value !== '').join(' - ');
    } catch (error) {
        try {
            if (text_array[0].includes('دانلود تریلر') || text_array[0].includes('دانلود تیزر')) {
                return 'trailer';
            }
            return movie_year_catch($, link);
        } catch (error2) {
            error.massage = "module: salamdl.js >> get_file_size ";
            error.inputData = $(link).attr('href');
            error.time = new Date();
            save_error(error);
            error2.massage = "module: salamdl.js >> get_file_size >> year based ";
            error2.inputData = $(link).attr('href');
            error2.time = new Date();
            save_error(error2);
            return "";
        }
    }
}

function get_file_size_serial($, link) {
    let prevNodeChildren = $(link).parent().parent().parent().prev().children();
    let text_array = $(prevNodeChildren[3]).text().split(' ');
    let size = $(prevNodeChildren[5]).text().replace(' مگابایت', 'MB');
    let filtered_text_array = text_array.filter(value => value && !persianRex.hasLetter.test(value));
    if (filtered_text_array.length === 0) {
        let link_href = $(link).attr('href').toLowerCase().replace(/[/_\s]/g, '.');
        let link_href_array = link_href.split('.');
        let seasonEpisode_match = link_href.match(/s\d\de\d\d/g);
        if (seasonEpisode_match) {
            let seasonEpisode = seasonEpisode_match.pop();
            let index = link_href_array.indexOf(seasonEpisode);
            let array = link_href_array.slice(index + 1);
            array.pop();
            return {info: array.join('.'), size: ''};
        } else {
            return '';
        }
    }
    if (text_array.length === 1 && text_array[0] === '') {
        text_array = $(link).parent().prev().text().split(' ');
        if ($(link).parent().text().includes('|') ||
            (text_array.length === 1 && text_array[0] === '')) {
            let text = $(link).text();
            size = '';
            if (text.includes('دانلود قسمت')) {
                text_array = ['480p'];
            } else {
                text_array = ['720p'];
            }
        }
    }

    let info = [text_array[1], ...text_array.slice(2), text_array[0]].filter(value => value).join('.');
    return [info, size].filter(value => value !== '').join(' - ');
}

function get_movie_size_info(text_array, dubbed) {
    let encoder = '';
    let encoder_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('انکدر') || text_array[1].includes('انکودر')) ? 1 : '';
    if (encoder_index) {
        encoder = text_array[encoder_index]
            .replace('انکدر','')
            .replace('انکودر', '')
            .split(' ')
            .filter(value =>
                value && !persianRex.hasLetter.test(value) &&
                isNaN(value) && value!=='GB' && value!=='MB')
            .join('')
            .replace(/[\s:]/g, '');
    }

    let size = '';
    let size_index = (text_array.length === 1) ? 0 :
        (text_array[1].includes('حجم')) ? 1 :
            (text_array[2]) ? 2 : '';
    if (size_index) {
        size = text_array[size_index].replace('حجم', '')
            .replace('مگابایت', 'MB')
            .replace('گیگابایت', 'GB')
            .replace(/:/g, '')
            .split(' ')
            .filter(value => value && !persianRex.hasLetter.test(value))
            .join('')
            .replace(encoder,'')
            .replace(/\s/g,'');
    }


    let quality = text_array[0].replace('کیفیت:', '').replace('دانلود با کیفیت ', '');
    if (quality.includes('دانلود نسخه سه بعد')) {
        let info = ['3D', dubbed].filter(value => value).join('.')
        return {info, size};
    }
    quality = quality.split(' ').filter(value => value && !persianRex.hasLetter.test(value));
    if (quality.length === 1 && quality[0] === '--') {
        quality[0] = 'unknown';
    }

    let info = (quality[0].match(/(\d\d\d\dp)|(\d\d\dp)/g)) ?
        [quality[0], ...quality.slice(2), quality[1], encoder, dubbed].filter(value => value).join('.') :
        [quality[1], ...quality.slice(2), quality[0], encoder, dubbed].filter(value => value).join('.');

    return {size, info};
}

function get_file_size_extrLink($, link) {
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let quality_match = link_href.match(/\d\d\d\dp|\d\d\dp/g);
    if (quality_match) {
        let quality = quality_match.pop();
        let quality_index = link_href_array.indexOf(quality);
        let text_array = link_href_array.slice(quality_index, quality_index + 4);
        if (text_array[2] === 'x265') {
            text_array = [text_array[0], text_array[2], text_array[1], text_array[3]]
        }
        return text_array.join('.');
    } else {
        let year_match = link_href.match(/\d\d\d\d/g);
        if (year_match) {
            let year = year_match.pop();
            let year_index = link_href_array.indexOf(year);
            return link_href_array[year_index + 1];
        } else {
            return '';
        }
    }
}

function movie_year_catch($, link) {
    let link_href = $(link).attr('href');
    let link_href_array = link_href.split('.');
    let year_match = link_href.match(/\d\d\d\d/g);
    if (year_match) {
        let year = year_match.pop();
        let year_index = link_href_array.indexOf(year);
        let result = link_href_array.slice(year_index + 1);
        result.pop();
        return result.join('.');
    } else {
        return '';
    }
}

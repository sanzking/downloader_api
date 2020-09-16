const {search_in_title_page, wrapper_module, remove_persian_words, sort_links} = require('../search_tools');
const save = require('../save_changes_db');
const persianRex = require('persian-rex');

module.exports = async function valamovie({movie_url, serial_url, page_count, serial_page_count}) {

    await wrapper_module(serial_url, serial_page_count, search_title_serial);
    await wrapper_module(movie_url, page_count, search_title_movie);
}

async function search_title_serial(link, i) {
    if (link.hasClass('product-title')) {
        let title = link.text();
        let page_link = link.attr('href');
        console.log(`valamovie/serial/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), 'serial');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'serial',
                get_file_size, get_persian_plot);
            if (save_link.length > 0) {
                let result = sort_links(save_link);
                if (result.length > 0)
                    await save(title_array, page_link, result, persian_plot, 'serial');
            }
        }
    }
}

async function search_title_movie(link, i) {
    let title = link.attr('title');
    if (title && title.includes('دانلود') && title.toLowerCase() === link.text().toLowerCase()) {
        let page_link = link.attr('href');
        console.log(`valamovie/movie/${i}/${title}  ========>  `);
        let title_array = remove_persian_words(title.toLowerCase(), 'movie');
        if (title_array.length > 0) {
            let {save_link, persian_plot} = await search_in_title_page(title_array, page_link, 'movie',
                get_file_size, get_persian_plot);
            save_link = remove_duplicate(save_link);
            if (save_link.length > 0) {
                await save(title_array, page_link, save_link, persian_plot, 'movie');
            }
        }
    }
}

function get_persian_plot($) {
    let paragraphs = $('p');
    for (let i = 0; i < paragraphs.length; i++) {
        if ($(paragraphs[i]).text().includes('خلاصه داستان:')) {
            let temp = $($(paragraphs[i]).children()[0]).text();
            return $(paragraphs[i]).text().replace(temp, '').trim();
        }
    }
}

function get_file_size($, link, mode) {
    //'1080p.WEB-DL - 750MB' //'720p.x265.WEB-DL - 230MB'
    //'1080p.BluRay.RARBG - 2.01GB' //'1080p.x265.BluRay.RMTeam - 1.17GB'
    //'1080p.BluRay.dubbed - 1.77GB'
    try {
        if (mode === 'serial') {
            let text_array = $(link).parent().parent().parent().parent().prev().text().trim().split('/');
            let quality, dubbed, size,link_quality;
            if (text_array.length === 1) {
                quality = $(link).text().split(/[\s-]/g).filter((text) => !persianRex.hasLetter.test(text) && text !== '' && isNaN(text));
                if (quality[0] === 'X265')
                    quality[0] = '720p.x265';
                return quality.join('.');
            } else if (text_array.length === 2) {
                return serial_text_length_2(text_array, $, link);
            } else if (text_array.length === 3) {
                let result = serial_length_3(text_array, $, link, 1, 2);
                quality = result.quality;
                dubbed = result.dubbed;
                size = result.size;
                let link_href = $(link).attr('href').toLowerCase();
                let case1 = link_href.match(/\d\d\d\dp/g);
                let case2 = link_href.match(/\d\d\dp/g);
                link_quality = case1 ? case1[0] : (case2 ? case2[0] : '');
            } else {
                let result = serial_length_3(text_array, $, link, 2, 3);
                quality = result.quality;
                dubbed = result.dubbed;
                size = result.size;
            }
            let info = [link_quality, quality[1], ...quality.slice(2), quality[0], dubbed].filter(value => value).join('.');
            return [info , size].filter(value => value).join(' - ');
        }

        let prevNodeChildren = $(link).parent().parent().parent().prev().children().children();
        let link_href = $(link).attr('href').toLowerCase();
        let dubbed = (link_href.includes('farsi.dub') || link_href.includes('farsi_dub')) ? 'dubbed' : '';
        let quality = $(prevNodeChildren[0]).text().trim().split(' ');

        let encoder , size;
        if (prevNodeChildren.length === 2) {
            let text = $(prevNodeChildren[1]).text();
            if (text.match(/\d:\d\d:\d\d/g)) {
                size = '';
            } else {
                let MB_GB = text.includes('مگابایت') ? 'MB' : text.includes('گیگابایت') ? 'GB' : '';
                let match = text.match(/[+-]?\d+(\.\d+)?/g);
                size = match ? match[0] + MB_GB : '';
            }
            let text_array = text.split(' ');
            encoder = (isNaN(text_array[1]) && !persianRex.hasLetter.test(text_array[1])) ? text_array[1] : '';
        } else {
            encoder = (!dubbed) ? $(prevNodeChildren[1]).text()
                .replace('انکودر:', '').replace('Encoder:', '').trim() : '';
            let size_text = (!dubbed) ? $(prevNodeChildren[2]).text() : $(prevNodeChildren[1]).text();
            size = size_text.replace('Size:', '').replace(/\s/g, '');
        }

        let info = [quality[1], ...quality.slice(2), quality[0], encoder, dubbed].filter(value => value).join('.');
        return [info, size].filter(value => value !== '').join(' - ');
    } catch (error) {
        console.error(error);
        return "";
    }
}

function serial_text_length_2(text_array, $, link) {
    let quality = text_array[1].replace('کیفیت :', '').trim().split(' ');
    let link_href = $(link).attr('href').toLowerCase();
    let x265 = (link_href.includes('x265')) ? 'x265' : '';
    let case1 = link_href.match(/\d\d\d\dp/g);
    let case2 = link_href.match(/\d\d\dp/g);
    let link_quality = case1 ? case1[0] : (case2 ? case2[0] : 'DVDrip');
    if (quality.length === 2) {
        if (quality.includes('فارسی')) {
            quality.pop();
            quality[0] = 'dubbed';
        }
    }
    return [link_quality, quality[1], x265, ...quality.slice(2), quality[0]].filter(value => value).join('.')
}

function serial_length_3(text_array, $, link, qualityIndex, dubbedIndex) {
    let quality = text_array[qualityIndex].replace('کیفیت :', '').trim().split(' ');
    let link_href = $(link).attr('href').toLowerCase();
    let dubbed = (text_array[dubbedIndex].includes('دوبله فارسی') ||
        link_href.includes('farsi.dub') || link_href.includes('farsi_dub')) ? 'dubbed' : '';
    let temp = text_array[dubbedIndex].replace('میانگین حجم:', '').replace('مگابایت', 'MB');
    let size = (dubbed) ? '' : ' - ' + temp.replace(/\s/g, '');
    return {quality, dubbed, size};
}

function remove_duplicate(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i].link === result[j].link) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}
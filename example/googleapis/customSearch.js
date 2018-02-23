const { google } = require('googleapis');
const customsearch = google.customsearch('v1');

// Ex: node customsearch.js
//      "Google Node.js"
//      --api_key "YOUR KEY"
//      --customsearch_engine_id="YOUR ID"

// You can get a custom search engine id at
// https://www.google.com/cse/create/new
const CX = '006320166286449124373:nm_gjsvlgnm';
const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
const SEARCH = '美女と野獣';

customsearch.cse.list({
    cx: CX,
    q: SEARCH,
    auth: API_KEY,
    num: 3,
    // start: 0,
    imgSize: 'medium',
    searchType: 'image'
}, (err, res) => {
    if (err) {
        throw err;
    }
    // Got the response from custom search
    console.log(res.data);
    console.log(Object.keys(res));
    // console.log('Result: ' + res.searchInformation.formattedTotalResults);
    // if (res.items && res.items.length > 0) {
    //     console.log('First result name is ' + res.items[0].title);
    // }
});

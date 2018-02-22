const fs = require('fs');
const request = require('request-promise-native');

request.get({
    encoding: null,
    simple: false,
    url: `https://api.line.me/v2/bot/message/7515538474647/content`,
    auth: {
        bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN
    }
}).then((content) => {
    fs.writeFileSync(`${__dirname}/output/content`, content);
});

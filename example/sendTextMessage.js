
const request = require('request-promise-native');

const LINE_ID = '@qef9940v';
const friendMessage = '友達に決済を承認するワンタイムメッセージ';
const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押して、そのままメッセージを送信してください。\nline://oaMessage/${LINE_ID}/?${friendMessage}`);

request.post({
    simple: false,
    url: 'https://api.line.me/v2/bot/message/push',
    auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
    json: true,
    body: {
        to: 'U28fba84b4008d60291fc861e2562b34f',
        messages: [
            {
                type: 'template',
                altText: 'This is a buttons template',
                template: {
                    type: 'buttons',
                    title: '友達に決済をお願いする',
                    text: '友達に決済をお願いする',
                    actions: [
                        {
                            type: 'uri',
                            label: '誰にお願いする?',
                            uri: `line://msg/text/?${message}`
                        }
                    ]
                }
            }
        ]
    }
}).then(() => {

});

// request.post('https://api.line.me/v2/bot/message/push', {
//     auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
//     json: true,
//     body: {
//         to: 'U28fba84b4008d60291fc861e2562b34f',
//         messages: [
//             {
//                 type: 'text',
//                 text: `FriendPayToken-`
//             }
//         ]
//     }
// }, (err, response, body) => {
//     debug(err, response.statusCode, body);
// });

"use strict";
/**
 * LINE webhook messageコントローラー
 * @namespace app.controllers.webhook.message
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ssktsapi = require("@motionpicture/sskts-api-nodejs-client");
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const moment = require("moment");
const request = require("request-promise-native");
const LINE = require("../../../line");
const debug = createDebug('sskts-line-ticket:controller:webhook:message');
/**
 * 使い方を送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function pushHowToUse(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-multiline-string
        const text = `How to use
--------------------
取引照会
--------------------
[購入番号]を入力
例:810000

--------------------
取引CSVダウンロード
--------------------
'csv'と入力

--------------------
logout
--------------------
'logout'と入力
`;
        yield LINE.pushMessage(userId, text);
    });
}
exports.pushHowToUse = pushHowToUse;
/**
 * 予約番号or電話番号のボタンを送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function pushButtonsReserveNumOrTel(userId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(userId, message);
        const datas = message.split('-');
        const theater = datas[0];
        const reserveNumOrTel = datas[1];
        // キュー実行のボタン表示
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'aaa',
                        template: {
                            type: 'buttons',
                            text: 'どちらで検索する？',
                            actions: [
                                {
                                    type: 'postback',
                                    label: '予約番号',
                                    data: `action=searchTransactionByReserveNum&theater=${theater}&reserveNum=${reserveNumOrTel}`
                                },
                                {
                                    type: 'postback',
                                    label: '電話番号',
                                    data: `action=searchTransactionByTel&theater=${theater}&tel=${reserveNumOrTel}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.pushButtonsReserveNumOrTel = pushButtonsReserveNumOrTel;
/**
 * 予約のイベント日選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function askReservationEventDate(userId, paymentNo) {
    return __awaiter(this, void 0, void 0, function* () {
        yield request.post('https://api.line.me/v2/bot/message/push', {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: '日付選択',
                        template: {
                            type: 'buttons',
                            text: 'ツアーの開演日を教えてください。',
                            actions: [
                                {
                                    type: 'datetimepicker',
                                    label: '日付選択',
                                    mode: 'date',
                                    data: `action=searchTransactionByPaymentNo&paymentNo=${paymentNo}`,
                                    initial: moment().format('YYYY-MM-DD')
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.askReservationEventDate = askReservationEventDate;
function findAccount(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const account = yield personService.findAccount({ personId: 'me' });
        debug('account:', account);
        yield LINE.pushMessage(user.userId, `${account.balance}円`);
    });
}
exports.findAccount = findAccount;
function searchAccountTradeActions(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const actions = yield personService.searchAccountTradeActions({ personId: 'me' });
        const actionsStr = actions.map((a) => {
            let actionName = '';
            switch (a.typeOf) {
                case 'PayAction':
                    actionName = '支払';
                    break;
                case 'TakeAction':
                    actionName = '入金';
                default:
            }
            return [
                (a.typeOf === 'PayAction') ? '出' : '入',
                actionName,
                moment(a.endDate).format('YY.MM.DD'),
                `${a.object.price}円`,
                (a.typeOf === 'PayAction') ? a.recipient.name : a.agent.name,
                a.object.notes
            ].join(' ');
        }).join('\n');
        yield LINE.pushMessage(user.userId, actionsStr);
    });
}
exports.searchAccountTradeActions = searchAccountTradeActions;
/**
 * 日付選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function askEventStartDate(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield request.post('https://api.line.me/v2/bot/message/push', {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: '日付選択',
                        template: {
                            type: 'buttons',
                            text: '上映日は？',
                            actions: [
                                {
                                    type: 'datetimepicker',
                                    label: '日付選択',
                                    mode: 'date',
                                    data: 'action=searchEventsByDate',
                                    initial: moment().format('YYYY-MM-DD'),
                                    // tslint:disable-next-line:no-magic-numbers
                                    max: moment().add(2, 'days').format('YYYY-MM-DD'),
                                    min: moment().format('YYYY-MM-DD')
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.askEventStartDate = askEventStartDate;
/**
 * 日付選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function askFromWhenAndToWhen(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // await LINE.pushMessage(userId, '期間をYYYYMMDD-YYYYMMDD形式で教えてください。');
        yield request.post('https://api.line.me/v2/bot/message/push', {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: '日付選択',
                        template: {
                            type: 'buttons',
                            text: '日付を選択するか、期間をYYYYMMDD-YYYYMMDD形式で教えてください。',
                            actions: [
                                {
                                    type: 'datetimepicker',
                                    label: '日付選択',
                                    mode: 'date',
                                    data: 'action=searchTransactionsByDate',
                                    initial: moment().format('YYYY-MM-DD')
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.askFromWhenAndToWhen = askFromWhenAndToWhen;
/**
 * 取引CSVダウンロードURIを発行する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
function publishURI4transactionsCSV(userId, dateFrom, dateThrough) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${dateFrom} - ${dateThrough}の取引を検索しています...`);
        const startFrom = moment(`${dateFrom}T00: 00: 00 + 09: 00`, 'YYYYMMDDThh:mm:ssZ');
        const startThrough = moment(`${dateThrough}T00: 00: 00 + 09: 00`, 'YYYYMMDDThh:mm:ssZ').add(1, 'day');
        const csv = yield sskts.service.transaction.placeOrder.download({
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        }, 'csv')(new sskts.repository.Transaction(sskts.mongoose.connection));
        yield LINE.pushMessage(userId, 'csvを作成しています...');
        const sasUrl = yield sskts.service.util.uploadFile({
            fileName: `sskts - line - ticket - transactions - ${moment().format('YYYYMMDDHHmmss')}.csv`,
            text: csv
        })();
        yield LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.publishURI4transactionsCSV = publishURI4transactionsCSV;
function logout(user) {
    return __awaiter(this, void 0, void 0, function* () {
        yield request.post({
            simple: false,
            url: LINE.URL_PUSH_MESSAGE,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'ログアウトボタン',
                        template: {
                            type: 'buttons',
                            text: '本当にログアウトしますか？',
                            actions: [
                                {
                                    type: 'uri',
                                    label: 'Log out',
                                    uri: `https://${user.host}/logout?userId=${user.userId}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.logout = logout;

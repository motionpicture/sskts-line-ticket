/**
 * LINE webhook messageコントローラー
 * @namespace app.controllers.webhook.message
 */

import * as ssktsapi from '@motionpicture/sskts-api-nodejs-client';
import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as request from 'request-promise-native';

import * as LINE from '../../../line';
import User from '../../user';

const debug = createDebug('sskts-line-ticket:controller:webhook:message');

/**
 * 使い方を送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function pushHowToUse(userId: string) {
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

    await LINE.pushMessage(userId, text);
}

/**
 * 予約番号or電話番号のボタンを送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function pushButtonsReserveNumOrTel(userId: string, message: string) {
    debug(userId, message);
    const datas = message.split('-');
    const theater = datas[0];
    const reserveNumOrTel = datas[1];

    // キュー実行のボタン表示
    await request.post({
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
}

/**
 * 予約のイベント日選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function askReservationEventDate(userId: string, paymentNo: string) {
    await request.post(
        'https://api.line.me/v2/bot/message/push',
        {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId, // 送信相手のuserId
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
        }
    ).promise();
}

export async function findAccount(user: User) {
    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const account = await personService.findAccount({ personId: 'me' });
    debug('account:', account);

    await LINE.pushMessage(user.userId, `${account.balance}円`);
}

export async function searchAccountTradeActions(user: User) {
    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const actions = await personService.searchAccountTradeActions({ personId: 'me' });

    await LINE.pushMessage(
        user.userId,
        actions.map((a) => `${moment(a.endDate).format('YY-MM-DD')} ${a.typeOf} 出 ${a.object.price}円 ${a.recipient.name}`).join('\n')
    );
}

/**
 * 日付選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function askEventStartDate(userId: string) {
    await request.post(
        'https://api.line.me/v2/bot/message/push',
        {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId, // 送信相手のuserId
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
                                    initial: moment().format('YYYY-MM-DD')
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ).promise();
}

/**
 * 日付選択を求める
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function askFromWhenAndToWhen(userId: string) {
    // await LINE.pushMessage(userId, '期間をYYYYMMDD-YYYYMMDD形式で教えてください。');
    await request.post(
        'https://api.line.me/v2/bot/message/push',
        {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId, // 送信相手のuserId
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
        }
    ).promise();
}

/**
 * 取引CSVダウンロードURIを発行する
 * @export
 * @function
 * @memberof app.controllers.webhook.message
 */
export async function publishURI4transactionsCSV(userId: string, dateFrom: string, dateThrough: string) {
    await LINE.pushMessage(userId, `${dateFrom}-${dateThrough}の取引を検索しています...`);

    const startFrom = moment(`${dateFrom}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ');
    const startThrough = moment(`${dateThrough}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ').add(1, 'day');

    const csv = await sskts.service.transaction.placeOrder.download(
        {
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        },
        'csv'
    )(new sskts.repository.Transaction(sskts.mongoose.connection));

    await LINE.pushMessage(userId, 'csvを作成しています...');

    const sasUrl = await sskts.service.util.uploadFile({
        fileName: `sskts-line-ticket-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
        text: csv
    })();

    await LINE.pushMessage(userId, `download -> ${sasUrl} `);
}

export async function logout(user: User) {
    await request.post({
        simple: false,
        url: LINE.URL_PUSH_MESSAGE,
        auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
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
}

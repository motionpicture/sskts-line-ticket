/**
 * LINE webhook messageコントローラー
 * @namespace app.controllers.webhook.message
 */

import * as ssktsapi from '@motionpicture/sskts-api-nodejs-client';
import * as sskts from '@motionpicture/sskts-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as request from 'request-promise-native';
import * as util from 'util';

import * as LINE from '../../../line';
import User from '../../user';

const debug = createDebug('sskts-line-ticket:controller:webhook:message');

/**
 * 使い方を送信する
 * @export
 */
export async function pushHowToUse(userId: string) {
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
                    altText: 'How to use',
                    template: {
                        type: 'buttons',
                        title: '何をしますか？',
                        text: '画面下部メニューから操作することもできます。',
                        actions: [
                            {
                                type: 'message',
                                label: '座席予約メニューを見る',
                                text: '座席予約'
                            },
                            {
                                type: 'message',
                                label: '口座を確認する',
                                text: '口座残高'
                            },
                            {
                                type: 'message',
                                label: 'おこづかいをもらう',
                                text: 'おこづかい'
                            },
                            {
                                type: 'message',
                                label: '顔を登録する',
                                text: '顔写真登録'
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * 座席予約メニューを表示する
 */
export async function showSeatReservationMenu(user: User) {
    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: '座席予約メニュー',
                    template: {
                        type: 'buttons',
                        title: '座席予約',
                        text: 'ご用件はなんでしょう？',
                        actions: [
                            {
                                type: 'message',
                                label: '座席を予約する',
                                text: '座席予約追加'
                            },
                            {
                                type: 'message',
                                label: '予約を確認する',
                                text: 'チケット'
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * 顔写真登録を開始する
 */
export async function startIndexingFace(userId: string) {
    const text = '顔写真を送信してください。';

    await LINE.pushMessage(userId, text);
}

/**
 * 友達決済承認確認
 */
export async function askConfirmationOfFriendPay(user: User, token: string) {
    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: 'This is a buttons template',
                    template: {
                        type: 'confirm',
                        text: '本当に友達決済を承認しますか?',
                        actions: [
                            {
                                type: 'postback',
                                label: 'Yes',
                                data: `action=confirmFriendPay&token=${token}`
                            },
                            {
                                type: 'postback',
                                label: 'No',
                                data: `action=rejectFriendPay&token=${token}`
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * おこづかい承認確認
 */
export async function askConfirmationOfTransferMoney(user: User, transferMoneyToken: string) {
    const transferMoneyInfo = await user.verifyTransferMoneyToken(transferMoneyToken);

    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: 'おこづかい金額選択',
                    template: {
                        type: 'buttons',
                        text: `${transferMoneyInfo.name}がおこづかいを要求しています。いくらあげますか？`,
                        actions: [
                            {
                                type: 'postback',
                                label: '100円あげる',
                                data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=100`
                            },
                            {
                                type: 'postback',
                                label: '1000円あげる',
                                data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=1000`
                            },
                            {
                                type: 'postback',
                                label: '10000円あげる',
                                data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=10000`
                            },
                            {
                                type: 'postback',
                                label: 'あげない',
                                data: `action=rejectTransferMoney&token=${transferMoneyToken}`
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * 誰からお金をもらうか選択する
 */
export async function selectWhomAskForMoney(user: User) {
    const LINE_ID = '@qef9940v';
    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const account = await personService.findAccount({ personId: 'me' });
    const contact = await personService.getContacts({ personId: 'me' });

    const token = await user.signTransferMoneyInfo({
        userId: user.userId,
        accountId: account.id,
        name: `${contact.familyName} ${contact.givenName}`
    });
    const friendMessage = `TransferMoneyToken.${token}`;
    const message = encodeURIComponent(`おこづかいちょーだい！
よければ下のリンクを押してそのままメッセージを送信してね。
line://oaMessage/${LINE_ID}/?${friendMessage}`);

    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: 'This is a buttons template',
                    template: {
                        type: 'buttons',
                        title: 'おこづかいをもらう',
                        text: '友達を選択してメッセージを送信しましょう。',
                        actions: [
                            {
                                type: 'uri',
                                label: '誰からもらう？',
                                uri: `line://msg/text/?${message}`
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
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

/**
 * ユーザーのチケット(座席予約)を検索する
 */
export async function searchTickets(user: User) {
    await LINE.pushMessage(user.userId, '座席予約を検索しています...');

    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const ownershipInfos = await personService.searchReservationOwnerships({ personId: 'me' });

    if (ownershipInfos.length === 0) {
        await LINE.pushMessage(user.userId, '座席予約が見つかりませんでした。');
    } else {
        await request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: '座席予約チケット',
                        template: {
                            type: 'carousel',
                            columns: ownershipInfos.map((ownershipInfo) => {
                                const itemOffered = ownershipInfo.typeOfGood;
                                // tslint:disable-next-line:max-line-length
                                const qr = `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${itemOffered.reservedTicket.ticketToken}`;
                                const text = util.format(
                                    '%s-%s\n@%s\n%s',
                                    moment(itemOffered.reservationFor.startDate).format('YYYY-MM-DD HH:mm'),
                                    moment(itemOffered.reservationFor.endDate).format('HH:mm'),
                                    // tslint:disable-next-line:max-line-length
                                    `${itemOffered.reservationFor.superEvent.location.name.ja} ${itemOffered.reservationFor.location.name.ja}`,
                                    // tslint:disable-next-line:max-line-length
                                    `${itemOffered.reservedTicket.ticketedSeat.seatNumber} ${itemOffered.reservedTicket.coaTicketInfo.ticketName} ￥${itemOffered.reservedTicket.coaTicketInfo.salePrice}`
                                );

                                return {
                                    thumbnailImageUrl: qr,
                                    // imageBackgroundColor: '#000000',
                                    title: itemOffered.reservationFor.name.ja,
                                    // tslint:disable-next-line:max-line-length
                                    text: text,
                                    actions: [
                                        {
                                            type: 'postback',
                                            label: '飲食を注文する',
                                            data: `action=orderMenuItems&ticketToken=${itemOffered.reservedTicket.ticketToken}`
                                        }
                                    ]
                                };
                            }),
                            imageAspectRatio: 'square'
                            // imageAspectRatio: 'rectangle',
                            // imageSize: 'cover'
                        }
                    }
                ]
            }
        }).promise();
    }
}

export async function findAccount(user: User) {
    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const account = await personService.findAccount({ personId: 'me' });
    debug('account:', account);

    const text = util.format(
        '口座ID: %s\n現在残高: %s\n引出可能残高: %s',
        account.id,
        parseInt(account.balance, 10).toLocaleString(),
        parseInt(account.safeBalance, 10).toLocaleString()
    );
    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: 'How to use',
                    template: {
                        type: 'buttons',
                        title: 'あなたのPecorino口座',
                        text: text,
                        actions: [
                            {
                                type: 'message',
                                label: '取引履歴を確認する',
                                text: '口座取引履歴'
                            },
                            {
                                type: 'message',
                                label: 'おこづかいをもらう',
                                text: 'おこづかい'
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

export async function searchAccountTradeActions(user: User) {
    const personService = new ssktsapi.service.Person({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: user.authClient
    });
    const account = await personService.findAccount({ personId: 'me' });
    let transferActions = await personService.searchAccountTradeActions({ personId: 'me' });
    // tslint:disable-next-line:no-magic-numbers
    transferActions = transferActions.reverse().slice(0, 10);

    if (transferActions.length === 0) {
        await LINE.pushMessage(user.userId, 'まだ取引履歴はありません。');

        return;
    }

    const actionsStr = transferActions.map(
        (a) => {
            let actionName = '';
            switch (a.purpose.typeOf) {
                case 'Pay':
                    actionName = '支払';
                    break;
                case 'Transfer':
                    actionName = '転送';
                    break;
                case 'Deposit':
                    actionName = '入金';
                    break;

                default:
            }

            return util.format(
                '●%s %s %s %s %s[%s] -> %s[%s] @%s %s',
                (a.fromLocation.id === account.id) ? '出' : '入',
                moment(a.endDate).format('YY.MM.DD HH:mm'),
                actionName,
                `${a.amount}円`,
                a.fromLocation.name,
                (a.fromLocation.id !== undefined) ? a.fromLocation.id : '',
                a.toLocation.name,
                (a.toLocation.id !== undefined) ? a.toLocation.id : '',
                a.purpose.typeOf,
                (a.object !== undefined) ? a.object.notes : ''
            );
        }
    ).join('\n');

    await LINE.pushMessage(
        user.userId,
        actionsStr
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
                                    initial: moment().add(1, 'days').format('YYYY-MM-DD'),
                                    // tslint:disable-next-line:no-magic-numbers
                                    max: moment().add(2, 'days').format('YYYY-MM-DD'),
                                    min: moment().add(1, 'days').format('YYYY-MM-DD')
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
    await LINE.pushMessage(userId, `${dateFrom} - ${dateThrough}の取引を検索しています...`);

    const startFrom = moment(`${dateFrom}T00: 00: 00 + 09: 00`, 'YYYYMMDDThh:mm:ssZ');
    const startThrough = moment(`${dateThrough}T00: 00: 00 + 09: 00`, 'YYYYMMDDThh:mm:ssZ').add(1, 'day');

    const csv = await sskts.service.transaction.placeOrder.download(
        {
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        },
        'csv'
    )({ transaction: new sskts.repository.Transaction(sskts.mongoose.connection) });

    await LINE.pushMessage(userId, 'csvを作成しています...');

    const sasUrl = await sskts.service.util.uploadFile({
        fileName: `sskts - line - ticket - transactions - ${moment().format('YYYYMMDDHHmmss')}.csv`,
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

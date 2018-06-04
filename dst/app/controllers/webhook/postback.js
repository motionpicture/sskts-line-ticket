"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LINE webhook postbackコントローラー
 */
const pecorinoapi = require("@motionpicture/pecorino-api-nodejs-client");
const ssktsapi = require("@motionpicture/sskts-api-nodejs-client");
const sskts = require("@motionpicture/sskts-domain");
const createDebug = require("debug");
const googleapis_1 = require("googleapis");
const moment = require("moment");
const request = require("request-promise-native");
const LINE = require("../../../line");
const debug = createDebug('sskts-line-ticket:controller:webhook:postback');
// const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';
const customsearch = googleapis_1.google.customsearch('v1');
const PECORINO_API_ENDPOINT = process.env.PECORINO_API_ENDPOINT;
const PECORINO_CLIENT_ID = process.env.PECORINO_CLIENT_ID;
const PECORINO_CLIENT_SECRET = process.env.PECORINO_CLIENT_SECRET;
const PECORINO_AUTHORIZE_SERVER_DOMAIN = process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN;
/**
 * 日付でイベント検索
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
function searchEventsByDate(user, date) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, `${date}のイベントを検索しています...`);
        const eventService = new ssktsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        let events = yield eventService.searchIndividualScreeningEvent({
            startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
            startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate(),
            superEventLocationIdentifiers: ['MovieTheater-118']
        });
        // tslint:disable-next-line:no-magic-numbers
        events = events.slice(0, 10);
        yield LINE.pushMessage(user.userId, `${events.length}件のイベントがみつかりました。`);
        // googleで画像検索
        const CX = '006320166286449124373:nm_gjsvlgnm';
        const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
        const thumbnails = [];
        yield Promise.all(events.map((event) => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                customsearch.cse.list({
                    cx: CX,
                    q: event.workPerformed.name,
                    auth: API_KEY,
                    num: 1,
                    rights: 'cc_publicdomain cc_sharealike',
                    // start: 0,
                    // imgSize: 'small',
                    searchType: 'image'
                }, (err, res) => {
                    if (!(err instanceof Error)) {
                        if (Array.isArray(res.data.items) && res.data.items.length > 0) {
                            debug(res.data.items[0]);
                            thumbnails.push({
                                eventIdentifier: event.identifier,
                                link: res.data.items[0].link,
                                thumbnailLink: res.data.items[0].image.thumbnailLink
                            });
                        }
                    }
                    resolve();
                });
            });
        })));
        debug(thumbnails);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'this is a carousel template',
                        template: {
                            type: 'carousel',
                            columns: events.map((event) => {
                                const thumbnail = thumbnails.find((t) => t.eventIdentifier === event.identifier);
                                const thumbnailImageUrl = (thumbnail !== undefined)
                                    ? thumbnail.thumbnailLink
                                    // tslint:disable-next-line:max-line-length
                                    : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
                                return {
                                    // tslint:disable-next-line:max-line-length no-http-string
                                    thumbnailImageUrl: thumbnailImageUrl,
                                    imageBackgroundColor: '#000000',
                                    title: event.workPerformed.name,
                                    text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                    actions: [
                                        {
                                            type: 'postback',
                                            label: '座席確保',
                                            data: `action=createTmpReservation&eventIdentifier=${event.identifier}`
                                        }
                                    ]
                                };
                            })
                            // imageAspectRatio: 'rectangle',
                            // imageSize: 'cover'
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.searchEventsByDate = searchEventsByDate;
/**
 * 座席仮予約
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 */
// tslint:disable-next-line:max-func-body-length
function createTmpReservation(user, eventIdentifier) {
    return __awaiter(this, void 0, void 0, function* () {
        // イベント詳細取得
        const eventService = new ssktsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const event = yield eventService.findIndividualScreeningEvent({ identifier: eventIdentifier });
        yield LINE.pushMessage(user.userId, `${event.workPerformed.name}の座席を確保しています...`);
        // 販売者情報取得
        const organizationService = new ssktsapi.service.Organization({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const seller = yield organizationService.findMovieTheaterByBranchCode({ branchCode: event.superEvent.location.branchCode });
        // 取引開始
        // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
        const passportToken = yield request.post(`${process.env.WAITER_ENDPOINT}/passports`, {
            body: {
                scope: `placeOrderTransaction.${seller.identifier}`
            },
            json: true
        }).then((body) => body.token);
        debug('passportToken published.', passportToken);
        const placeOrderService = new ssktsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const transaction = yield placeOrderService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(15, 'minutes').toDate(),
            sellerId: seller.id,
            passportToken: passportToken
        });
        debug('transaction started.', transaction.id);
        // 座席選択
        // 無料鑑賞券取得
        const tickets = yield sskts.COA.services.master.ticket({
            theaterCode: event.coaInfo.theaterCode
        });
        const freeTickets = tickets.filter((t) => t.usePoint > 0 && t.flgMember === sskts.COA.services.master.FlgMember.Member);
        if (freeTickets.length === 0) {
            throw new Error('無料鑑賞券が見つかりませんでした。');
        }
        const selectedTicket = freeTickets[0];
        debug('無料鑑賞券が見つかりました。', selectedTicket.ticketCode);
        // search available seats from sskts.COA
        const getStateReserveSeatResult = yield sskts.COA.services.reserve.stateReserveSeat({
            theaterCode: event.coaInfo.theaterCode,
            dateJouei: event.coaInfo.dateJouei,
            titleCode: event.coaInfo.titleCode,
            titleBranchNum: event.coaInfo.titleBranchNum,
            timeBegin: event.coaInfo.timeBegin,
            screenCode: event.coaInfo.screenCode
        });
        debug('getStateReserveSeatResult:', getStateReserveSeatResult);
        const sectionCode = getStateReserveSeatResult.listSeat[0].seatSection;
        const freeSeatCodes = getStateReserveSeatResult.listSeat[0].listFreeSeat.map((freeSeat) => {
            return freeSeat.seatNum;
        });
        debug('sectionCode:', sectionCode);
        debug('freeSeatCodes:', freeSeatCodes);
        if (getStateReserveSeatResult.cntReserveFree <= 0) {
            throw new Error('no available seats');
        }
        // select a seat randomly
        // tslint:disable-next-line:insecure-random
        const selectedSeatCode = freeSeatCodes[Math.floor(freeSeatCodes.length * Math.random())];
        // select a ticket randomly
        // tslint:disable-next-line:insecure-random
        const selectedSalesTicket = selectedTicket;
        debug('creating a seat reservation authorization...');
        const seatReservationAuthorization = yield placeOrderService.createSeatReservationAuthorization({
            transactionId: transaction.id,
            eventIdentifier: event.identifier,
            offers: [
                {
                    seatSection: sectionCode,
                    seatNumber: selectedSeatCode,
                    ticketInfo: {
                        ticketCode: selectedSalesTicket.ticketCode,
                        mvtkAppPrice: 0,
                        ticketCount: 1,
                        addGlasses: 0,
                        kbnEisyahousiki: '00',
                        mvtkNum: '',
                        mvtkKbnDenshiken: '00',
                        mvtkKbnMaeuriken: '00',
                        mvtkKbnKensyu: '00',
                        mvtkSalesPrice: 0,
                        usePoint: selectedTicket.usePoint
                    }
                }
            ]
        });
        debug('seatReservationAuthorization:', seatReservationAuthorization);
        yield LINE.pushMessage(user.userId, `座席 ${selectedSeatCode} を確保しました。`);
        const LINE_ID = process.env.LINE_ID;
        const token = yield user.signFriendPayInfo({
            transactionId: transaction.id,
            userId: user.userId,
            price: seatReservationAuthorization.result.price
        });
        const friendMessage = `FriendPayToken.${token}`;
        const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押してそのままメッセージを送信してください。
line://oaMessage/${LINE_ID}/?${friendMessage}`);
        yield request.post({
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
                            title: '決済方法選択',
                            text: '決済方法を選択してください。Friend Payの場合、ボタンを押して友達を選択してください。',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'Pecorino',
                                    data: `action=choosePaymentMethod&paymentMethod=Pecorino&transactionId=${transaction.id}`
                                },
                                {
                                    type: 'uri',
                                    label: 'Friend Pay',
                                    uri: `line://msg/text/?${message}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.createTmpReservation = createTmpReservation;
// tslint:disable-next-line:max-func-body-length
function choosePaymentMethod(user, paymentMethod, transactionId, friendPayPrice) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const placeOrderService = new ssktsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        let price = 0;
        if (paymentMethod === 'Pecorino') {
            debug('checking balance...', paymentMethod, transactionId);
            yield LINE.pushMessage(user.userId, '残高を確認しています...');
            const actionRepo = new sskts.repository.Action(sskts.mongoose.connection);
            const authorizeActions = yield actionRepo.findAuthorizeByTransactionId(transactionId);
            const seatReservations = authorizeActions
                .filter((a) => a.actionStatus === ssktsapi.factory.actionStatusType.CompletedActionStatus)
                .filter((a) => a.object.typeOf === ssktsapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
            const amount = seatReservations[0].result.pecorinoAmount;
            // 口座番号取得
            let accounts = yield personService.findAccounts({ personId: 'me' });
            accounts = accounts.filter((a) => a.status === ssktsapi.factory.pecorino.accountStatusType.Opened);
            debug('accounts:', accounts);
            if (accounts.length === 0) {
                throw new Error('口座未開設です。');
            }
            const account = accounts[0];
            const pecorinoAuthorization = yield placeOrderService.createPecorinoPaymentAuthorization({
                transactionId: transactionId,
                amount: amount,
                fromAccountNumber: account.accountNumber
            });
            debug('Pecorino残高確認済', pecorinoAuthorization);
            yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
        }
        else if (paymentMethod === 'FriendPay') {
            price = friendPayPrice;
        }
        else {
            throw new Error(`Unknown payment method ${paymentMethod}`);
        }
        const contact = yield personService.getContacts({ personId: 'me' });
        yield placeOrderService.setCustomerContact({
            transactionId: transactionId,
            contact: contact
        });
        debug('customer contact set.');
        yield LINE.pushMessage(user.userId, `以下の通り注文を受け付けようとしています...
------------
購入者情報
------------
${contact.givenName} ${contact.familyName}
${contact.email}
${contact.telephone}

------------
決済方法
------------
${paymentMethod}
${price} JPY
`);
        // 注文内容確認
        yield request.post({
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
                            text: '注文を確定しますか？',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'Yes',
                                    data: `action=confirmOrder&transactionId=${transactionId}`
                                },
                                {
                                    type: 'postback',
                                    label: 'No',
                                    data: `action=cancelOrder&transactionId=${transactionId}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.choosePaymentMethod = choosePaymentMethod;
function confirmOrder(user, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, '注文を確定しています...');
        const placeOrderService = new ssktsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const order = yield placeOrderService.confirm({
            transactionId: transactionId
        });
        const event = order.acceptedOffers[0].itemOffered.reservationFor;
        const reservedTickets = order.acceptedOffers.map((orderItem) => {
            const item = orderItem.itemOffered;
            // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
            const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.coaTicketInfo.ticketName} ￥${item.reservedTicket.coaTicketInfo.salePrice}`;
            return str;
        }).join('\n');
        const orderDetails = `--------------------
注文内容
--------------------
予約番号: ${order.confirmationNumber}
--------------------
購入者情報
--------------------
${order.customer.name}
${order.customer.telephone}
${order.customer.email}
${(order.customer.memberOf !== undefined) ? `${order.customer.memberOf.membershipNumber}` : ''}
--------------------
座席予約
--------------------
${event.name.ja}
${moment(event.startDate).format('YYYY-MM-DD HH:mm')}-${moment(event.endDate).format('HH:mm')}
@${event.superEvent.location.name.ja} ${event.location.name.ja}
${reservedTickets}
--------------------
決済方法
--------------------
${order.paymentMethods.map((p) => p.paymentMethod).join(' ')}
${order.price}
--------------------
割引
--------------------
`;
        yield LINE.pushMessage(user.userId, orderDetails);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'this is a carousel template',
                        template: {
                            type: 'carousel',
                            columns: order.acceptedOffers.map((offer) => {
                                const itemOffered = offer.itemOffered;
                                // tslint:disable-next-line:max-line-length
                                const qr = `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${itemOffered.reservedTicket.ticketToken}`;
                                return {
                                    thumbnailImageUrl: qr,
                                    // imageBackgroundColor: '#000000',
                                    title: itemOffered.reservationFor.name.ja,
                                    // tslint:disable-next-line:max-line-length
                                    text: `${itemOffered.reservedTicket.ticketedSeat.seatNumber} ${itemOffered.reservedTicket.coaTicketInfo.ticketName} ￥${itemOffered.reservedTicket.coaTicketInfo.salePrice}`,
                                    actions: [
                                        {
                                            type: 'postback',
                                            label: '???',
                                            data: `action=selectTicket&ticketToken=${itemOffered.reservedTicket.ticketToken}`
                                        }
                                    ]
                                };
                            }),
                            imageAspectRatio: 'square'
                            // imageSize: 'cover'
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.confirmOrder = confirmOrder;
/**
 * 友達決済を承認確定
 * @param user LINEユーザー
 * @param transactionId 取引ID
 */
function confirmFriendPay(user, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const friendPayInfo = yield user.verifyFriendPayToken(token);
        yield LINE.pushMessage(user.userId, `${friendPayInfo.price}ポイントの友達決済を受け付けます。`);
        yield LINE.pushMessage(user.userId, '残高を確認しています...');
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const placeOrderService = new ssktsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const actionRepo = new sskts.repository.Action(sskts.mongoose.connection);
        const authorizeActions = yield actionRepo.findAuthorizeByTransactionId(friendPayInfo.transactionId);
        const seatReservations = authorizeActions
            .filter((a) => a.actionStatus === ssktsapi.factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === ssktsapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        const amount = seatReservations[0].result.pecorinoAmount;
        // 口座番号取得
        let accounts = yield personService.findAccounts({ personId: 'me' });
        accounts = accounts.filter((a) => a.status === ssktsapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です。');
        }
        const account = accounts[0];
        const pecorinoAuthorization = yield placeOrderService.createPecorinoPaymentAuthorization({
            transactionId: friendPayInfo.transactionId,
            amount: amount,
            fromAccountNumber: account.accountNumber
        });
        debug('Pecorino残高確認済', pecorinoAuthorization);
        yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
        yield LINE.pushMessage(user.userId, '友達決済を承認しました。');
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: friendPayInfo.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'This is a buttons template',
                        template: {
                            type: 'confirm',
                            text: '友達決済の承認が確認できました。取引を続行しますか?',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'Yes',
                                    // tslint:disable-next-line:max-line-length
                                    data: `action=continueTransactionAfterFriendPayConfirmation&transactionId=${friendPayInfo.transactionId}&price=${friendPayInfo.price}`
                                },
                                {
                                    type: 'postback',
                                    label: 'No',
                                    // tslint:disable-next-line:max-line-length
                                    data: `action=cancelTransactionAfterFriendPayConfirmation&transactionId=${friendPayInfo.transactionId}&price=${friendPayInfo.price}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.confirmFriendPay = confirmFriendPay;
/**
 * おこづかい承認確定
 * @param user LINEユーザー
 * @param token 金額転送情報トークン
 */
function confirmTransferMoney(user, token, price) {
    return __awaiter(this, void 0, void 0, function* () {
        const transferMoneyInfo = yield user.verifyTransferMoneyToken(token);
        yield LINE.pushMessage(user.userId, `${transferMoneyInfo.name}に${price}ポイントの振込を実行します...`);
        if (PECORINO_API_ENDPOINT === undefined) {
            throw new Error('PECORINO_API_ENDPOINT undefined.');
        }
        if (PECORINO_CLIENT_ID === undefined) {
            throw new Error('PECORINO_CLIENT_ID undefined.');
        }
        if (PECORINO_CLIENT_SECRET === undefined) {
            throw new Error('PECORINO_CLIENT_SECRET undefined.');
        }
        if (PECORINO_AUTHORIZE_SERVER_DOMAIN === undefined) {
            throw new Error('PECORINO_AUTHORIZE_SERVER_DOMAIN undefined.');
        }
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        let accounts = yield personService.findAccounts({ personId: 'me' });
        accounts = accounts.filter((a) => a.status === ssktsapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です。');
        }
        const account = accounts[0];
        const auth = new pecorinoapi.auth.ClientCredentials({
            domain: PECORINO_AUTHORIZE_SERVER_DOMAIN,
            clientId: PECORINO_CLIENT_ID,
            clientSecret: PECORINO_CLIENT_SECRET,
            scopes: [],
            state: ''
        });
        const transferService = new pecorinoapi.service.transaction.Transfer({
            endpoint: PECORINO_API_ENDPOINT,
            auth: auth
        });
        const transaction = yield transferService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(10, 'minutes').toDate(),
            agent: {
                name: user.userId
            },
            recipient: {
                typeOf: 'Person',
                id: transferMoneyInfo.userId,
                name: transferMoneyInfo.name,
                url: ''
            },
            amount: price,
            notes: 'LINEチケットおこづかい',
            fromAccountNumber: account.accountNumber,
            toAccountNumber: transferMoneyInfo.accountNumber
        });
        debug('transaction started.', transaction.id);
        yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
        // バックエンドで確定
        yield transferService.confirm({
            transactionId: transaction.id
        });
        debug('transaction confirmed.');
        yield LINE.pushMessage(user.userId, '転送が完了しました。');
        const contact = yield personService.getContacts({ personId: 'me' });
        // 振込先に通知
        yield LINE.pushMessage(transferMoneyInfo.userId, `${contact.familyName} ${contact.givenName}から${price}ポイントおこづかいが振り込まれました。`);
    });
}
exports.confirmTransferMoney = confirmTransferMoney;
/**
 * クレジットから口座へ入金する
 */
function selectDepositAmount(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const gmoShopId = 'tshop00026096';
        const creditCardCallback = `https://${user.host}/transactions/transactionId/inputCreditCard?userId=${user.userId}`;
        // tslint:disable-next-line:max-line-length
        const creditCardUrl = `https://${user.host}/transactions/inputCreditCard?cb=${encodeURIComponent(creditCardCallback)}&gmoShopId=${gmoShopId}`;
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: '口座へ入金',
                        template: {
                            type: 'buttons',
                            title: 'Pecorino口座へ入金する',
                            text: 'いくら入金しますか?',
                            actions: [
                                {
                                    type: 'uri',
                                    label: '100円',
                                    uri: `${creditCardUrl}&amount=100`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.selectDepositAmount = selectDepositAmount;
/**
 * クレジットから口座へ入金する
 */
function depositFromCreditCard(user, amount, __) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, `${amount}ポイントの入金処理を実行します...`);
        // const personService = new ssktsapi.service.Person({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: user.authClient
        // });
        // if (PECORINO_API_ENDPOINT === undefined) {
        //     throw new Error('PECORINO_API_ENDPOINT undefined.');
        // }
        // if (PECORINO_CLIENT_ID === undefined) {
        //     throw new Error('PECORINO_CLIENT_ID undefined.');
        // }
        // if (PECORINO_CLIENT_SECRET === undefined) {
        //     throw new Error('PECORINO_CLIENT_SECRET undefined.');
        // }
        // if (PECORINO_AUTHORIZE_SERVER_DOMAIN === undefined) {
        //     throw new Error('PECORINO_AUTHORIZE_SERVER_DOMAIN undefined.');
        // }
        // const auth = new pecorinoapi.auth.ClientCredentials({
        //     domain: PECORINO_AUTHORIZE_SERVER_DOMAIN,
        //     clientId: PECORINO_CLIENT_ID,
        //     clientSecret: PECORINO_CLIENT_SECRET,
        //     scopes: [],
        //     state: ''
        // });
        // const transferTransactionService4backend = new pecorinoapi.service.transaction.Deposit({
        //     endpoint: PECORINO_API_ENDPOINT,
        //     auth: auth
        // });
        // const transaction = await transferTransactionService4backend.start({
        //     // tslint:disable-next-line:no-magic-numbers
        //     expires: moment().add(10, 'minutes').toDate(),
        //     agent: {
        //         typeOf: 'Person',
        //         id: user.userId,
        //         name: 'self',
        //         url: ''
        //     },
        //     recipient: {
        //         typeOf: 'Person',
        //         id: user.userId,
        //         name: 'self',
        //         url: ''
        //     },
        //     price: amount,
        //     notes: 'LINEチケット入金',
        //     toAccountId: account.id
        // });
        // debug('transaction started.', transaction.id);
        // // バックエンドで確定
        // await transferTransactionService4backend.confirm({
        //     transactionId: transaction.id
        // });
        // debug('transaction confirmed.');
        yield LINE.pushMessage(user.userId, '入金処理が完了しました。');
    });
}
exports.depositFromCreditCard = depositFromCreditCard;

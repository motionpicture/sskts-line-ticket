"use strict";
/**
 * LINE webhook postbackコントローラー
 * @namespace app.controllers.webhook.postback
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
// tslint:disable-next-line:no-require-imports no-var-requires
require('moment-timezone');
const LINE = require("../../../line");
const debug = createDebug('sskts-line-ticket:controller:webhook:postback');
// const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';
/**
 * 購入番号で取引を検索する
 * @export
 * @memberof app.controllers.webhook.postback
 */
function searchTransactionByPaymentNo(userId, paymentNo, performanceDate) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${performanceDate}-${paymentNo}の取引を検索しています...`);
        yield LINE.pushMessage(userId, 'implementing...');
    });
}
exports.searchTransactionByPaymentNo = searchTransactionByPaymentNo;
/**
 * 取引IDから取引情報詳細を送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} transactionId 取引ID
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
// async function pushTransactionDetails(userId: string, orderNumber: string) {
//     await LINE.pushMessage(userId, `${orderNumber}の取引詳細をまとめています...`);
//     await LINE.pushMessage(userId, 'implementing...');
// }
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
            startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
        });
        // tslint:disable-next-line:no-magic-numbers
        events = events.slice(0, 10);
        yield LINE.pushMessage(user.userId, `${events.length}件のイベントがみつかりました。`);
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
                                return {
                                    //   'thumbnailImageUrl': 'https://example.com/bot/images/item2.jpg',
                                    //   'imageBackgroundColor': '#000000',
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
        const salesTicketResult = yield sskts.COA.services.reserve.salesTicket({
            theaterCode: event.coaInfo.theaterCode,
            dateJouei: event.coaInfo.dateJouei,
            titleCode: event.coaInfo.titleCode,
            titleBranchNum: event.coaInfo.titleBranchNum,
            timeBegin: event.coaInfo.timeBegin,
            flgMember: sskts.COA.services.reserve.FlgMember.NonMember
        }).then((results) => results.filter((result) => result.limitUnit === '001' && result.limitCount === 1));
        debug('salesTicketResult:', salesTicketResult);
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
        const selectedSalesTicket = salesTicketResult[Math.floor(salesTicketResult.length * Math.random())];
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
                        addGlasses: selectedSalesTicket.addGlasses,
                        kbnEisyahousiki: '00',
                        mvtkNum: '',
                        mvtkKbnDenshiken: '00',
                        mvtkKbnMaeuriken: '00',
                        mvtkKbnKensyu: '00',
                        mvtkSalesPrice: 0
                    }
                }
            ]
        });
        debug('seatReservationAuthorization:', seatReservationAuthorization);
        yield LINE.pushMessage(user.userId, `座席 ${selectedSeatCode} を確保しました。`);
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
                            text: '決済方法を選択してください。',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'Pecorino',
                                    data: `action=choosePaymentMethod&paymentMethod=Pecorino&transactionId=${transaction.id}`
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
function choosePaymentMethod(user, paymentMethod, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('checking balance...', paymentMethod, transactionId);
        yield LINE.pushMessage(user.userId, '残高を確認しています...');
        const personService = new ssktsapi.service.Person({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const contact = yield personService.getContacts({ personId: 'me' });
        const placeOrderService = new ssktsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const actionRepo = new sskts.repository.action.authorize.SeatReservation(sskts.mongoose.connection);
        const seatReservations = yield actionRepo.findByTransactionId(transactionId);
        const price = seatReservations[0].result.price;
        const pecorinoAuthorization = yield placeOrderService.createPecorinoAuthorization({
            transactionId: transactionId,
            price: price
        });
        debug('Pecorino残高確認済', pecorinoAuthorization);
        yield placeOrderService.setCustomerContact({
            transactionId: transactionId,
            contact: contact
        });
        debug('customer contact set.');
        yield LINE.pushMessage(user.userId, `注文内容
------------
購入者情報
------------
${contact.givenName} ${contact.familyName}
${contact.email}
${contact.telephone}

------------
決済方法
------------
Pecorino
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
        const reservedTickets = order.acceptedOffers.map(
        // tslint:disable-next-line:max-line-length
        (orderItem) => `${orderItem.itemOffered.reservedTicket.ticketedSeat.seatNumber} ${orderItem.itemOffered.reservedTicket.coaTicketInfo.ticketName} ￥${orderItem.itemOffered.reservedTicket.coaTicketInfo.salePrice}`).join('\n');
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
${order.acceptedOffers[0].itemOffered.reservationFor.name.ja}
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
    });
}
exports.confirmOrder = confirmOrder;
/**
 * 取引検索(csvダウンロード)
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
function searchTransactionsByDate(userId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${date}の取引を検索しています...`);
        const startFrom = moment(`${date}T00:00:00+09:00`);
        const startThrough = moment(`${date}T00:00:00+09:00`).add(1, 'day');
        const csv = yield sskts.service.transaction.placeOrder.download({
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        }, 'csv')(new sskts.repository.Transaction(sskts.mongoose.connection));
        yield LINE.pushMessage(userId, 'csvを作成しています...');
        const sasUrl = yield sskts.service.util.uploadFile({
            fileName: `sskts-line-ticket-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
            text: csv
        })();
        yield LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.searchTransactionsByDate = searchTransactionsByDate;

"use strict";
/**
 * 顔ログインミドルウェア
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
const sskts = require("@motionpicture/sskts-domain");
const http_status_1 = require("http-status");
const querystring = require("querystring");
const request = require("request-promise-native");
const LINE = require("../../line");
const user_1 = require("../user");
exports.default = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const event = (req.body.events !== undefined) ? req.body.events[0] : undefined;
        if (event === undefined) {
            throw new Error('Invalid request.');
        }
        const userId = event.source.userId;
        req.user = new user_1.default({
            host: req.hostname,
            userId: userId,
            state: JSON.stringify(req.body)
        });
        // face loginイベントであれば、メッセージを送信
        if (event.type === 'postback' && event.postback !== undefined) {
            const data = querystring.parse(event.postback.data);
            if (data.action === 'loginByFace') {
                yield LINE.pushMessage(userId, '顔写真を送信してください。');
                res.status(http_status_1.OK).send('ok');
                return;
            }
        }
        // 画像が送信されてくれば、顔認証
        if (event.type === 'message' && event.message !== undefined) {
            if (event.message.type === 'image') {
                yield LINE.pushMessage(userId, `これは写真です。${event.message.id}`);
                yield LINE.pushMessage(userId, 'getting content...');
                const content = yield getImage(event.message.id);
                yield LINE.pushMessage(userId, typeof content);
                yield LINE.pushMessage(userId, content.length);
                yield LINE.pushMessage(userId, content);
                res.status(http_status_1.OK).send('ok');
                return;
            }
        }
        next();
    }
    catch (error) {
        next(new sskts.factory.errors.Unauthorized(error.message));
    }
});
function getImage(messageId) {
    return __awaiter(this, void 0, void 0, function* () {
        return request.get({
            simple: false,
            url: `https://api.line.me/v2/bot/message/${messageId}/content`,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
        }).promise();
    });
}
exports.getImage = getImage;

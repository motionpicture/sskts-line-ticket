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
        // ログイン済であれば次へ
        const credentials = yield req.user.getCredentials();
        if (credentials !== null) {
            next();
            return;
        }
        // face loginイベントであれば、メッセージを送信
        if (event.type === 'postback' && event.postback !== undefined) {
            const data = querystring.parse(event.postback.data);
            if (data.action === 'loginByFace') {
                // ログイン前のstateを保管
                yield req.user.saveCallbackState(data.state);
                yield LINE.pushMessage(userId, '顔写真を送信してください。');
                res.status(http_status_1.OK).send('ok');
                return;
            }
        }
        // 画像が送信されてくれば、顔認証
        if (event.type === 'message' && event.message !== undefined) {
            if (event.message.type === 'image') {
                try {
                    const faces = yield req.user.searchFaces();
                    if (faces.length === 0) {
                        // 顔登録済でなければメッセージ送信
                        yield LINE.pushMessage(userId, '顔写真を少なくとも1枚登録してください。');
                    }
                    else {
                        yield LINE.pushMessage(userId, `画像を検証しています...${event.message.id}`);
                        const content = yield LINE.getContent(event.message.id);
                        const searchFacesByImageResponse = yield req.user.verifyFace(new Buffer(content));
                        // const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
                        if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                            yield LINE.pushMessage(userId, '一致しませんでした。');
                        }
                        else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                            yield LINE.pushMessage(userId, '一致しませんでした。');
                        }
                        else {
                            yield LINE.pushMessage(userId, `${searchFacesByImageResponse.FaceMatches[0].Similarity}%の確立で一致しました。`);
                            // 一致結果があれば、リフレッシュトークンでアクセストークンを手動更新して、ログイン
                            yield LINE.pushMessage(userId, 'ログインします...');
                            const refreshToken = yield req.user.getRefreshToken();
                            if (refreshToken === null) {
                                yield LINE.pushMessage(userId, 'LINEと会員が結合されていません。一度、IDとパスワードでログインしてください。');
                            }
                            else {
                                req.user.authClient.setCredentials({
                                    refresh_token: refreshToken,
                                    token_type: 'Bearer'
                                });
                                yield req.user.signInForcibly(yield req.user.authClient.refreshAccessToken());
                                yield LINE.pushMessage(userId, `ログインしました...${JSON.stringify(yield req.user.getCredentials()).length}`);
                                // イベントを強制的に再送信
                                try {
                                    const callbackState = yield req.user.findCallbackState();
                                    if (callbackState !== null) {
                                        yield req.user.deleteCallbackState();
                                        yield request.post(`https://${req.hostname}/webhook`, {
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            form: callbackState
                                        }).promise();
                                    }
                                }
                                catch (error) {
                                    yield LINE.pushMessage(event.source.userId, error.message);
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    yield LINE.pushMessage(userId, error.message);
                }
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

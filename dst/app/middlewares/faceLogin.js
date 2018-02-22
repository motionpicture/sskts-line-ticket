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
const AWS = require("aws-sdk");
const http_status_1 = require("http-status");
const querystring = require("querystring");
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
                const content = yield LINE.getContent(event.message.id);
                yield LINE.pushMessage(userId, `typeof content: ${typeof content}`);
                yield LINE.pushMessage(userId, `content.length: ${content.length}`);
                try {
                    const searchFacesByImageResponse = yield searchFacesByImage(new Buffer(content));
                    if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                        yield LINE.pushMessage(userId, '一致しません。');
                    }
                    else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                        yield LINE.pushMessage(userId, '一致しません。');
                    }
                    else {
                        yield LINE.pushMessage(userId, `searchFacesByImageResponse
--------------------
マッチ結果数: ${searchFacesByImageResponse.FaceMatches.length}
類似率: ${searchFacesByImageResponse.FaceMatches[0].Similarity}
SearchedFaceConfidence: ${searchFacesByImageResponse.SearchedFaceConfidence}
    `);
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
                            const credentials = yield req.user.authClient.refreshAccessToken();
                            yield req.user.signInForcibly(credentials);
                            yield LINE.pushMessage(userId, `ログインしました...${JSON.stringify(yield req.user.getCredentials()).length}`);
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
function searchFacesByImage(source) {
    return __awaiter(this, void 0, void 0, function* () {
        // 以下環境変数をセットすること
        // AWS_ACCESS_KEY_ID
        // AWS_SECRET_ACCESS_KEY
        const rekognition = new AWS.Rekognition({
            apiVersion: '2016-06-27',
            region: 'us-west-2'
        });
        const collectionId = 'tetsuphotos';
        return new Promise((resolve, reject) => {
            rekognition.searchFacesByImage({
                CollectionId: collectionId,
                FaceMatchThreshold: 90,
                MaxFaces: 5,
                Image: {
                    Bytes: source
                }
            }, (err, data) => {
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    });
}
exports.searchFacesByImage = searchFacesByImage;

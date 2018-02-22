"use strict";
/**
 * 画像メッセージハンドラー
 * @namespace app.controllers.webhook.message.image
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
const AWS = require("aws-sdk");
const createDebug = require("debug");
const LINE = require("../../../../line");
const debug = createDebug('sskts-line-ticket:controller:webhook:message:image');
const rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});
function indexFace(user, messageId) {
    return __awaiter(this, void 0, void 0, function* () {
        const collectionId = 'tetsuphotos';
        const content = yield LINE.getContent(messageId);
        // faceをコレクションに登録
        const source = new Buffer(content);
        yield new Promise((resolve, reject) => {
            rekognition.indexFaces({
                CollectionId: collectionId,
                Image: {
                    Bytes: source
                },
                DetectionAttributes: ['ALL']
                // ExternalImageId: 'STRING_VALUE'
            }, (err, __) => {
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    debug('face indexed.');
                    resolve();
                }
            });
        });
        yield LINE.pushMessage(user.userId, '顔写真を登録しました。Face Loginをご利用できます。');
    });
}
exports.indexFace = indexFace;

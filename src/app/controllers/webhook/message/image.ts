/**
 * 画像メッセージハンドラー
 * @namespace app.controllers.webhook.message.image
 */

import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';

import * as LINE from '../../../../line';
import User from '../../../user';

const debug = createDebug('sskts-line-ticket:controller:webhook:message:image');

const rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

export async function indexFace(user: User, messageId: string) {
    const collectionId = 'tetsuphotos';

    const content = await LINE.getContent(messageId);

    // faceをコレクションに登録
    const source = new Buffer(content);
    await new Promise((resolve, reject) => {
        rekognition.indexFaces(
            {
                CollectionId: collectionId,
                Image: {
                    Bytes: source
                },
                DetectionAttributes: ['ALL']
                // ExternalImageId: 'STRING_VALUE'
            },
            (err, __) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    debug('face indexed.');
                    resolve();
                }
            });
    });

    await LINE.pushMessage(user.userId, '顔写真を登録しました。Face Loginをご利用できます。');
}

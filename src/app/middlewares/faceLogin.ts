/**
 * 顔ログインミドルウェア
 */

import * as sskts from '@motionpicture/sskts-domain';
import * as AWS from 'aws-sdk';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as querystring from 'querystring';
import * as request from 'request-promise-native';

import * as LINE from '../../line';
import User from '../user';

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        const event: LINE.IWebhookEvent | undefined = (req.body.events !== undefined) ? req.body.events[0] : undefined;
        if (event === undefined) {
            throw new Error('Invalid request.');
        }

        const userId = event.source.userId;
        req.user = new User({
            host: req.hostname,
            userId: userId,
            state: JSON.stringify(req.body)
        });

        // face loginイベントであれば、メッセージを送信
        if (event.type === 'postback' && event.postback !== undefined) {
            const data = querystring.parse(event.postback.data);
            if (data.action === 'loginByFace') {
                await LINE.pushMessage(userId, '顔写真を送信してください。');
                res.status(OK).send('ok');

                return;
            }
        }

        // 画像が送信されてくれば、顔認証
        if (event.type === 'message' && event.message !== undefined) {
            if (event.message.type === 'image') {
                await LINE.pushMessage(userId, `これは写真です。${event.message.id}`);
                await LINE.pushMessage(userId, 'getting content...');
                const content = await getImage(event.message.id);
                await LINE.pushMessage(userId, `typeof content: ${typeof content}`);
                await LINE.pushMessage(userId, `content.length: ${content.length}`);

                try {
                    const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
                    if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                        await LINE.pushMessage(userId, 'no FaceMatches');
                    } else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                        await LINE.pushMessage(userId, 'no FaceMatches');
                    } else {
                        await LINE.pushMessage(userId, `searchFacesByImageResponse
    --------------------
    FaceMatches.length: ${searchFacesByImageResponse.FaceMatches.length}
    FaceMatches[0].Similarity: ${searchFacesByImageResponse.FaceMatches[0].Similarity}
    SearchedFaceConfidence: ${searchFacesByImageResponse.SearchedFaceConfidence}
    `);
                    }
                } catch (error) {
                    await LINE.pushMessage(userId, error.message);
                }

                res.status(OK).send('ok');

                return;
            }
        }

        next();
    } catch (error) {
        next(new sskts.factory.errors.Unauthorized(error.message));
    }
};

export async function getImage(messageId: string) {
    return request.get({
        encoding: null,
        simple: false,
        url: `https://api.line.me/v2/bot/message/${messageId}/content`,
        auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
    }).promise();
}

export async function searchFacesByImage(source: Buffer) {
    // 以下環境変数をセットすること
    // AWS_ACCESS_KEY_ID
    // AWS_SECRET_ACCESS_KEY
    const rekognition = new AWS.Rekognition({
        apiVersion: '2016-06-27',
        region: 'us-west-2'
    });
    const collectionId = 'tetsuphotos';

    return new Promise<AWS.Rekognition.Types.SearchFacesByImageResponse>((resolve, reject) => {
        rekognition.searchFacesByImage(
            {
                CollectionId: collectionId, // required
                FaceMatchThreshold: 95,
                MaxFaces: 5,
                Image: { // required
                    Bytes: source
                }
            },
            (err, data) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
    });
}

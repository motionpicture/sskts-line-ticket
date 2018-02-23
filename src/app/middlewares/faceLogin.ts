/**
 * 顔ログインミドルウェア
 */

import * as sskts from '@motionpicture/sskts-domain';
// import * as AWS from 'aws-sdk';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as querystring from 'querystring';

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

        // ログイン済であれば次へ
        const credentials = await req.user.getCredentials();
        if (credentials !== null) {
            next();

            return;
        }

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
                try {
                    const faces = await req.user.listFaces();
                    if (faces.length === 0) {
                        // 顔登録済でなければメッセージ送信
                        await LINE.pushMessage(userId, '顔写真を少なくとも1枚登録してください。');
                    } else {
                        await LINE.pushMessage(userId, `画像を検証しています...${event.message.id}`);
                        const content = await LINE.getContent(event.message.id);
                        const searchFacesByImageResponse = await req.user.verifyFace(new Buffer(content));
                        // const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
                        if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                            await LINE.pushMessage(userId, '一致しませんでした。');
                        } else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                            await LINE.pushMessage(userId, '一致しませんでした。');
                        } else {
                            await LINE.pushMessage(userId, `searchFacesByImageResponse
    --------------------
    マッチ結果数: ${searchFacesByImageResponse.FaceMatches.length}
    類似率: ${searchFacesByImageResponse.FaceMatches[0].Similarity}
    SearchedFaceConfidence: ${searchFacesByImageResponse.SearchedFaceConfidence}
        `);

                            // 一致結果があれば、リフレッシュトークンでアクセストークンを手動更新して、ログイン
                            await LINE.pushMessage(userId, 'ログインします...');
                            const refreshToken = await req.user.getRefreshToken();
                            if (refreshToken === null) {
                                await LINE.pushMessage(userId, 'LINEと会員が結合されていません。一度、IDとパスワードでログインしてください。');
                            } else {
                                req.user.authClient.setCredentials({
                                    refresh_token: refreshToken,
                                    token_type: 'Bearer'
                                });
                                await req.user.signInForcibly(<any>await req.user.authClient.refreshAccessToken());
                                await LINE.pushMessage(userId, `ログインしました...${JSON.stringify(await req.user.getCredentials()).length}`);
                            }
                        }
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

// export async function searchFacesByImage(source: Buffer) {
//     // 以下環境変数をセットすること
//     // AWS_ACCESS_KEY_ID
//     // AWS_SECRET_ACCESS_KEY
//     const rekognition = new AWS.Rekognition({
//         apiVersion: '2016-06-27',
//         region: 'us-west-2'
//     });
//     const collectionId = 'tetsuphotos';

//     return new Promise<AWS.Rekognition.Types.SearchFacesByImageResponse>((resolve, reject) => {
//         rekognition.searchFacesByImage(
//             {
//                 CollectionId: collectionId, // required
//                 FaceMatchThreshold: 90,
//                 MaxFaces: 5,
//                 Image: { // required
//                     Bytes: source
//                 }
//             },
//             (err, data) => {
//                 if (err instanceof Error) {
//                     reject(err);
//                 } else {
//                     resolve(data);
//                 }
//             });
//     });
// }

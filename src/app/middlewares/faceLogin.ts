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

// tslint:disable-next-line:max-line-length
const ACCESS_TOKEN = 'eyJraWQiOiI0eVpocWlFZlFRVEVmSTNERlA1ZjBWQXpwazFLekFBa3RQd2haSGZHdzBzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhZWJhZjU3My05OGMxLTRjZWEtODRiZi1lMjBlYmRjNjg2OWEiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIG9wZW5pZCBwcm9maWxlIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3BsYWNlcy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvcGVvcGxlLmNyZWRpdENhcmRzLnJlYWQtb25seSBodHRwczpcL1wvcGVjb3Jpbm8tYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9hY2NvdW50cy5yZWFkLW9ubHkgaHR0cHM6XC9cL3BlY29yaW5vLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvYWNjb3VudHMuYWN0aW9ucy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvcGVvcGxlLmNvbnRhY3RzIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3Blb3BsZS5jb250YWN0cy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvcGVvcGxlLm93bmVyc2hpcEluZm9zIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3Blb3BsZS5vd25lcnNoaXBJbmZvcy5yZWFkLW9ubHkgaHR0cHM6XC9cL3BlY29yaW5vLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvdHJhbnNhY3Rpb25zIHBob25lIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL2V2ZW50cy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvcGVvcGxlLmFjY291bnRzLmFjdGlvbnMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZ2FuaXphdGlvbnMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZGVycy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvcGVvcGxlLmNyZWRpdENhcmRzIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3RyYW5zYWN0aW9ucyBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9wZW9wbGUuYWNjb3VudHMucmVhZC1vbmx5IGVtYWlsIiwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLW5vcnRoZWFzdC0xX2xucVVldmlYaiIsImV4cCI6MTUxOTI5NDg0MiwiaWF0IjoxNTE5MjkxMjQyLCJ2ZXJzaW9uIjoyLCJqdGkiOiJhYzZhNzM5NS1kNGQ3LTQ2MmUtYTQzOS1lZWEzYmY3MjcwOGQiLCJjbGllbnRfaWQiOiJpdDIwN29lYXRiZDdmamRjdnNmM3Jtc2t1IiwidXNlcm5hbWUiOiJpbG92ZWdhZGQifQ.G2MofV5BA3Gr_x9IyMAKFFzRalUr6gARaS3pJhor5TUuWpAKqsJYLFSiQiFmN9DJREVkUlXgS-ZRkz26l3xA9VIO1H_W07qzFZixDXE1mcZlIYes7qZ1Tl6PL5iaeCQlL4xyyey9FbPCoRr8W3wGorjwpyV0_puBPWIWoPhGv2sTKX8FAxIXUpAN6cr7MFiaLuCkbZdUqDstKVeTZlmOoLbX4fbE_JKNJVdWzMO-JhsS6-JKvWWRJOu6vegzPdKpV-tBKjNJ8DMWglSZx89SVAS8AXdOnMg8d7asSZWdvEkSHcyYV7MYMvshUcbo071o6cQXvwyB7mULCuZCvSJpRw';
// tslint:disable-next-line:max-line-length
const REFRESH_TOKEN = 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.Aw0iu61QnJLqeInk9IvRvr55zGDf1TgH7PvQzVy1Dtw4V1zH3YZAp7WjEnw4_JjIl9w1cHcUjwzVmzthZN0ieHNh-1ZhN3f1MMDxFvngiA0-sNRbfcvclbdO9tWkmq7-3embK9Q2AwurGQ5odijEXj2boB1im_yyrd_FxLVcFyP6iigWlNGPFZszz0PxJ817gA08V2uhFpwDq9e29_b_aiJzw9awv-JzTwNfHBM2qWfWZ0EXGh2uDFwI34Fwl8TNV4-PF2y6lH33OG9GOg3sjc-utrQsuCzGuN20vkbcb6ei7hOvCHD-a1rMb9mkjFbe1XPP3X8W6-9yvfovSwH9sQ.Y--j4WtF_DunMCDN.J_as570MTE1GqsRXPPisQoJNcAt9x6x1XDBJZRyF1_gtzS-ntyUD9y1mkaYzDQr0_mU_AJds4rHwHqbvo5vnEteE6EeQalABch-AndgRuU8wztwkKDLB0XSpwYkXnggALjthTPioa_rfS0SWvhwnfF5-4dLY-_VHwMGQYOlW4702FS_8Mi7C4ScT6Qq8K-3grmMWvrEU60xJB-vYd4YW2KNm4aLHw4ulERNjL9Y3kc3RItq0HahwuG37X0JqOIUCJH3XQRSdKZ70EqmYwpS1mNphNyPI8ajmvZM_gLoFgEDeeTxY5vVfRbuoLJul8GgcA--xk9ZdCxw1p9GYtjBAv-Fv4ePNOp7WGqDCFtWy5C-OwvBbuMGg74buswAZerDrqCeJJ3GRGdEgss5kzOnYOWUa0hJ3DdhfFWBtcZg4e9aEBYd2Feuze97lZLP7MTV1HlqTwNqgBzS0gvMWuOQQQG7DFRfc519q5pDp0LWj2_lyofJhN_itsAlrAQtkE_pCenef8s9VsjbZrkKcn_eyQF6SfkE68SNS-vxxgOSt_EwFFwcW2ewthib_AbCXVWDKRX27kMoSLz7alcqcrtXlkowxZ0GQqdq5fIBCJd_cuu4zCSqyahit7OGTdZi3pGIjZxpbmYRoR8iogrI-zHlDUg9Y5MZ4nifNcSQLnUR5E6S57Vv7CbRuZPmaLnoKDO2mamvHcRrzWiAnQZwV39I0nrD1-E_v197Tt8U9IHxGQEHZku_AC8LqFFik2B7DHSRinewi4L7VkCKbnjlEvAm5nWspdkkrW2e_alJPuCG6FIbtsv-OchseLjVdOdB62G0ANERxb-qCXYvCzSh-EwQsgUoWBic_ALD1YJL6GQ-6Ty4fBepZHBzwA8xYuSiVMsiFRLBYV1oZIY1ntEXWW4S4V4sy5jML03WIFsUNMYO5xqLRnYfmVzTzqDEG2DG1_24wvaoPaJL3WxYNoLcWydKa1JCF1AfbehlGbjLSIF9eTfkvub3SLSZ4C6es4ixzSis3rlgPQSf5lGyoOX1A5NiD5q-syqSiBAuuhj5bH0hzoT-NkDZ2aIsDcPH6kA1yi5iESPGwSYlCAn6uDzAqqil_LXzn0s1WkyzAF-5a913OlXEgfmemlpCUdFOcdvqUHDAkkjyCrt3E6mqDf__GoL0bB9ZnvTnx5UL7mIUuPfLiFQTTm8hZ6pIpvo5g6SPDGGpdFipgeT9xzf2tU_qbcxDsUM7HOv1JiR2go3tmN-ZqOlLaXBcGOWQi8JSNZ_Qa-NNkJshQM9G6kLoP9xBcHkTNDr3DDLvqjSD0mzrOnRHC01jJAUkKkLP928w6EaZhNRzY5NLFi_kSW5m2ws7AXNlFim9iFuk69g2V6r3rzsX4Ju0iWVuaC8sbY7Fy_fiSSoFfxsNoP41odUa4uHBEBCeMxkem-4qFvdBfoRo1H1KNoFHVxlkPmJxcT-_UeX2YSB8SlK3N4i8l7ZTKvasVqoaWhwg3wHgMZcTHDihMaQYrBAWQdQtjWQPQuZpl6xVz91yI0P8Mir7R7u-Baww36htNjR6N4ZpaHHk7CrG_Y7CzCYvAL-troW66azBEojje-abxdtCGEdgvm7sebRzC3F7pwPV2edIH8rSgMWUfSfqesQnmj9dG7Ka0UJAuUh95CI8Q_nLWiEqqOKkIP9VChUfUewt8eHjxSL4r7dmqiZobfVJKD7XjigjkmhNgFPXkln9xPMZtV-aFUVjSpQXIeSB_c3KuVkp__b5y5-R8nzScBt89wEGB2LW2AEBOzW0nfIl1SymW0suRS2ldTvytwIFFbLuaUP2qy3zHUpsQlhHZ2-3mSO0bC9mtMSsSbNv70Kc2vLb90Lqjx5HG9y1dAQVJO3JMyGWgSPTS2ypGCcfWzv70Md9dwXx0a6Nble-PXQAJ_XadSlGY1P3Bd8-HJwtG1K7jZoHAUD7qNKRo08bdVlV1ttWtGCuzVnsCjRfN50Eti4eN60L_KShMbDsBVe-J4KDQ4FRMpVFWy4XJLSdn0bFOmw82PfXUNsFrSC7jG_6cHhE-84WLqruZx9SIa62mM04kPYFNChobKrwDhQE4M_HGT9I5iKQa8pmR8jJKC-PBmXQGozAud79zikmen4y3kkVJi1pXTi5Q99rXZs0bx13rf_kIalb7oZ2-EFp2nFKVSVUGamGhFLUZp1ZLRnf12EpvETW9hkgl-q8kT_jzA7m51imrXNuwDsjCeUBopPj4KT83sNGbtX-EYm_43QZBx5kHBXY-3_PkvgrhCjn_BBEv-Ymzu5FVmXcl3_AI2n4mxg7ckrLbMC2-sw_f-aES0d7lLJRrUYBzZtWiiTkCDQDbUOimncDIrJ4vO7Az_nheaLHLiXw3m6HNcHyd0DP7YM3TahOZ6Aj9CTKeGUTprh_JjuRufV4rdUnZBnK58E5M0kNjn7IN_tZvLOm1Ac8uW7iFDY91K57ghjnY_5sufZ40RqnTbZCbkLPEdZlQwOYzLUlEEIGC1ZKJBqtrQo_hRuqhVxc53g9ao07WBScjbq3Ej6o4zJ0d8Ep7BqE0whL8AmRfmW-P_2TqHVHSD9M3tDUaeIvSDABplkS3JgpQ_n4RgTE9Hs8aE8Vuxz_d1K2NylhjBdm4F2B9vhxcrM_AnSNHq8WGsac9xF7y_9x8qRKyvz2E1WXP5D8OzNnGtrBM5xib8bL5Tjwlo6U2GuPseQI00PPFKoe9f0CMQI68V-qcIeZe037Cvplu-IvQW0yKERGZjM7rLGp8XPF-a79Qigfv6qkd1amxIhMl6afmidrwU1B_cwpa94ciGtwYkD4duyyPN0jwVJCYmAPqPEhXl0CLQ9qXrmxttjj0VSPvFIrd0LDca8pqjaIP96GthAH5BtMC8_AieXmkevcAM9ASk4d9bEhzQi2GWXvnanghEvkc4_Qvnv0-Rko74UPfC2D49EuRGsx7reMFno1YCqKCiUvdAWN1DCg36lqquUZ2ZFg1i78GnGtf96I-4fSAryxUKzs92n-wO0P0JWm-rX9_1qQze6j_au_qUafRmjwlK7MJJXCJXmEh_-6kYLqCoDt179u9Ibl31lRLfYr4vQZf-pD-xsm9ium-Mdz-QpLy7wC-MB8LaBZXeRz5lCeXzVZenUY5AN3Cwq01Kfu5qXc73QNPsF9zleQnYGosVEs66aBGggIvd2lOKNG6YoJcvx3OeKgaAFfByVLlNg-XHF862ZkrX0Q-mOVGRccfS08_hOGORGAPux_7sGgpM9NlPfx7PzPJ8ihzF_SudG_Kmp5WgMXpHItlbfDZTX2iWZzIM9cURlXaNJekl0ylghrhE3uLVMJaYlnP.W6h7VB1ChqFGHqi3xUVBBA';

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
                        await LINE.pushMessage(userId, '一致しません。');
                    } else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                        await LINE.pushMessage(userId, '一致しません。');
                    } else {
                        await LINE.pushMessage(userId, `searchFacesByImageResponse
--------------------
マッチ結果数: ${searchFacesByImageResponse.FaceMatches.length}
類似率: ${searchFacesByImageResponse.FaceMatches[0].Similarity}
SearchedFaceConfidence: ${searchFacesByImageResponse.SearchedFaceConfidence}
    `);

                        // 一致結果があれば、ログイン
                        // ログイン状態をセットしてnext
                        await LINE.pushMessage(userId, `ログインします...${REFRESH_TOKEN.length}`);
                        await req.user.signInForcibly({
                            access_token: ACCESS_TOKEN,
                            refresh_token: REFRESH_TOKEN,
                            token_type: 'Bearer'
                        });
                        await LINE.pushMessage(userId, `ログインしました...${JSON.stringify(await req.user.getCredentials()).length}`);
                        await LINE.pushMessage(userId, 'Signed in.');
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
                FaceMatchThreshold: 90,
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

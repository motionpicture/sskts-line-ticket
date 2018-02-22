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
const REFRESH_TOKEN = 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.RAfeiLpsGeQ-pqS9deAevWNkMPjxs74G7l6eTY0QyfPEZvrK-RapvbizHcjVidahzbuQTFJRyoY2ehTuHtccjOPdaJZezAjfan1zGpyV_78bOBSGwGyTIvufJ68DjlHRd3hPLFPR7oUeYtipmsMKDhjfAkRWBq2YCyzwwlc-tCM3k9T5W2nwiEYPKlSWrDBVgxoHUMIrYDVSABhPID1eMLhZZBHEVRSthIb1XowxXKqcA88vzYU4E-SeafUnn_7GSVr662yu9NIkc5KOqYhrbdgGs7K-6HLr6nx219Ck_5u_7EyoGANg_-Qb2pfLH4lkUMS8RCnMwAHuN5bnyYj2MA.v7LpPSI2LS0Pi8DF.slbJUUm7aXOZ4JCcq2xfUZcSlctnzux7gut9Y_0ZtZSrL_PCDeEaxXuR0A5v5AI_d3evoq8k_vorgfLbps7pHD1G_KsEhEkTOYMTySxBUwM_DNbl5Y3i4zJS7Bwe8XtT3xct3q3AWiQLFShwREJeZtrO-K9nY4mt451rtxXCOt7rbFmpi2AzF6vNNERvCbBeffSMsO1KchitC7Uk8-NaKmz8NKcJ8jf8BdIEFJSE-qKjjekFZ8-W2HKkDupPgFfpCIiEkKNqoziVcZZVGRrwWvDoIEigKhhV16V9_uFhiMvPvQ4MyLzE_q9JZ-F_aEnOTwNFmVvuHIma1pR5KhH7oq4KZDi1vcMlErn5aDpAKqB1WzUBm0lJA6_zupXMw9JEW5UPRFijSp94LTFX-T-vKBGZVAGnBv3sfij8TQUjxa83m1LhUxh5UjV0BAxdTqStDvcRaQGuJZPTBzKmov681Ngu97Yez7sbzEqv_h7L7lI7CA4hfvPaXC_EiWU2iXPC6NLl79ge9RqXYuz_vwH9xsKgL-DS9IdWy8U3bvLVJ-Ow8UDMXJS42ytX_JmQcjcoZMooXOXA-zP82ruz_YB_X91jp4dwSoX_jMiRqvDYttX0a4ZCL3t5glCIvSrdcEX40f4tmFEIOqlOGTttL_3UUapWd30vOg8dRO1oyDtbNJG2-eRqFH5Qs8SV_YiVBHzPoKwXzOvNzInL7OZogGMoCG38rM60bdQYcNj3uVPxYkvhfVWgErwz5lE3N7On4aAJy-1bBa6Y2jSyLwUQlgcqE4im9EXbrpPvCEWzvExB01BYFzSuFi_7eETtgPeO-YSSxvuVPSAFH0yPz0LcPGBWCKNsOxfRTpJhcRoLNM7ZzjiFQgDDF9ugURFUEv0Vd-s5_tvaU6pJ4A7Kg8RUKwUrKtSHYvsp41mmoj6Ytl67lQFqyt50NDqYxp-PYa8kxtnWTL-JgoZw0XKn1PA6JtRo9tX8e0M8jAF8O8qTDbyZsSXLbjw6nmlY-ZJ656SnwYuJQ8N9IGiiSN65gNp5Rbm_yJ55t0XSJRYaFqeuh-zUcMjlSi89MYnACa4WmGaskgJCex2sAb0W3JEej9gPE3WNS-08oELtaAIN9t3EnfHW78ALrdYSjz9v1knFh59rAfpIApk2WsKKK5WpxASXWMsD7eQy-UG2UAClhePbifqTYMkXxotDZA-FHl8D9R8xPIzfbEv85bej-jJLFPoVqNn5zbRXalysGu2wZtixeZikujPUXfGuaypYgadPlYGvuqvLEX1fxD28oP62aUrJ-qRfhKdgGACiP9FaNTKY7LtTunBQ8wPU2mAfgWZ0GISB3Qp5ABnWf2S4hHFDsEXi2VoujyCBfQpv1GwSLce2QORkbnbrCtFb3cYFVDSvYG-VFH0APWIq2Sjn-Eyu7UJ3XG4QsZCuIEUftQRkYqCUUMCC4zm4yOklj2WfFIz7idNPFfdBoTyMrOk1oD-Mo4MHhPs_BZesin_W7hVoDv3ERvrrOw5_50Si6GkKd894LxQpkrRmvCx74ylPGONeVgWsvtJ4h5Oz73UHr1MBl7Tr8cwm04zd_KUxekXaZj0ojay7KrFxiWEni_N9MzLPBpyQPrj8n53cBFc4L_gj4m2hA7oyURY3Fw06oQt5vLEC8z0JMCpbH982rgblV1rikYgUi7VHofwh1YXt4220NLhPbBKxe2I3ht9lvpW3VnmSmW-LhFx7-xbm8LXxRsZps8f0fRyHJ8U0KBgHPvuPUUA3Qni6pXDMDsy6hlYriqLRQKOwuXleoBGbEKRlybI7hxLp5dXjFgpo_vLiKuHLgCh3uU6VlupLpTA8wXRghMA3CokRHeglIuJNRLvsAIrb_4j19Jc667rpYFD5TuYUzNhkBu8rpGx3WffXZrVnbDsBm5uCW2yDr5U67_ot21R3xAGljFuGMT40dIgPpVzVIFo6vDGiYs1AgWnvUFGnM8rGpX9Iz99_dwd_suhTng03M_d9iX7QksG-Fe4Dj_jcyOigPoHQGoWkuO0byq5qSPnOywYD8lCRcyPTPwcKjVGuNtQms76Y_TdDkLSfO59TtonzQgYIu17FS1Kq8DV1rGKYzjgoLLKUojBfFzFZwCOdUzFFdNnuk-E2iYVRb63WbeI0khXVdwekHI7x7I8xvIdWhYMqonaJ8DOaT_-Ad85EfKiXss2WkjnYnmR2boY70b95ktCMJyGre2tvdG2xSM_cyv8KIqxsO_gxHj_-HspY6ktd3SfiFaO4Sg-2BQ9fz8egPwcxWb4dLOx0mD3LqSeuzRK_Z9io5k_Dhvjwvajzyy9dAcEtLcRYeFwTSp3JzcQpnmrTE-WkYeS1IYwnDNPFX4r3r64L8DjAvZGXL5a5e8eyFPlcfdvS48nymzRLbBpKQKlU4tvDRCJ0Dq5sJxZmuqLnm3-H3vDXRVtW2oa5LJDnKC3Co-8cM2YxFUZjm2XI4dBfddA9cRNNHSn_JBBicFtXSMvyur_IXsOrearEeIjIlqM_5T63DtO934xepVunLLOGIwpWwX8yDUnWFSwyDp96sKGvTQ_TKH1mjVoffcu8FAnERvIYmt88YIO-1ir4r-_bmJfx_UKfuPGjExlA7BApCZT056Am4_BjgkrUAtGbsVniomqb6lthQcIGpmnLLfx7hDm_Olv9kR3K2HvSaHmuPBK7ChneXGzRceBR_61SJTvhm8Y71apFjLOROxjp1Eh_fg9o5wswjjm0fHoTMeU-0P649FZAlmuDYUsb4F0T3YyvCsekx1csMjV2oE7vBVF2PaxD-290DIJdcAgbBvOFamCfP6AVLlYz_NXJPTdDZ7_wmdQcNU92CySDXdNUua4TIZjo2SSd1Nk6ePxRSyXmIoEmLL4g_6e_u5fEWmpATcLAOyd-yz890XsXU_A3cr-_nl_uGNFD7pcE2ntwPXXQLhHMD8gNgVwmPkmbsgdCi8NavPHjCCzlx8OfpzjdAx_A4YFkpJ63YndweNrOZQ7PWzv61-NLPSzdE2SaSfoh8KIFGXHZn93uFCQoR7-Lj7hwgdC41A_Xi79Zd1ZMHG9rbAg6gmnSRR4YDjVWdhWoT9XqEZpjwI6gQaT-IL3rH1H0C0whK4qvdiHhU7CLo6QXoxwcwTLAq27zOU8_7tSY11Qpkq1iluc11i2sBoZ5Qh1LglhI5CIymjDHVXp3Gri9jOx2NGj075njln8Hfh-7FnMKP6FFDhcOcnq9Vj4LYRckN8EKIXBtQ0bhdCGlFOP2u4vQCqeW5ffUzqu7VeXNMSSPyw7kPfnfFNOqsg6QaKB56tbw4wuOAMTyXBzsyks1jVIj2KmfxQ5J.OvGCGzNt63weLEKl97aDEA';

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
                        await req.user.signInForcibly({
                            access_token: '',
                            refresh_token: REFRESH_TOKEN,
                            token_type: 'Bearer'
                        });
                        await LINE.pushMessage(event.source.userId, 'Signed in.');

                        next();

                        return;
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

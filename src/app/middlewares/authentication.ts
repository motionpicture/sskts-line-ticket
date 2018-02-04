/**
 * oauthミドルウェア
 * @module middlewares.authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */

import { cognitoAuth } from '@motionpicture/express-middleware';
import * as sskts from '@motionpicture/sskts-domain';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as request from 'request-promise-native';

import * as LINE from '../../line';
import User from '../user';

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        // ユーザー認証無効化の設定の場合
        if (process.env.USER_AUTHENTICATION_DISABLED === '1') {
            next();

            return;
        }

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
        const credentials = await req.user.getCredentials();
        if (credentials === null) {
            // ログインボタンを送信
            await sendLoginButton(req.user);
            res.status(OK).send('ok');

            return;
        }

        // RedisからBearerトークンを取り出す
        await cognitoAuth({
            issuers: [<string>process.env.API_TOKEN_ISSUER],
            authorizedHandler: async () => {
                // ログイン状態をセットしてnext
                req.user.setCredentials(credentials);
                next();
            },
            unauthorizedHandler: async () => {
                // ログインボタンを送信
                await sendLoginButton(req.user);
                res.status(OK).send('ok');
            },
            tokenDetecter: async () => credentials.access_token
        })(req, res, next);
    } catch (error) {
        next(new sskts.factory.errors.Unauthorized(error.message));
    }
};

export async function sendLoginButton(user: User) {
    await request.post({
        simple: false,
        url: LINE.URL_PUSH_MESSAGE,
        auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'template',
                    altText: 'ログインボタン',
                    template: {
                        type: 'buttons',
                        text: 'ログインしてください。',
                        actions: [
                            {
                                type: 'uri',
                                label: 'Sign In',
                                uri: user.generateAuthUrl()
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

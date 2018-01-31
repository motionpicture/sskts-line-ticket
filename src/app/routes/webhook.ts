/**
 * webhookルーター
 * @ignore
 */

import * as createDebug from 'debug';
import * as express from 'express';
import { OK } from 'http-status';

import * as LINE from '../../line';
import * as WebhookController from '../controllers/webhook';
import authentication from '../middlewares/authentication';

const webhookRouter = express.Router();
const debug = createDebug('sskts-line-ticket:router:webhook');

webhookRouter.all(
    '/',
    authentication,
    async (req, res) => {
        debug('body:', JSON.stringify(req.body));

        try {
            const event: LINE.IWebhookEvent | undefined = (req.body.events !== undefined) ? req.body.events[0] : undefined;
            if (event !== undefined) {
                switch (event.type) {
                    case 'message':
                        await WebhookController.message(event, req.user);
                        break;

                    case 'postback':
                        await WebhookController.postback(event, req.user);
                        break;

                    case 'follow':
                        await WebhookController.follow(event);
                        break;

                    case 'unfollow':
                        await WebhookController.unfollow(event);
                        break;

                    case 'join':
                        await WebhookController.join(event);
                        break;

                    case 'leave':
                        await WebhookController.leave(event);
                        break;

                    case 'beacon':
                        await WebhookController.postback(event, req.user);
                        break;

                    default:
                }
            }
        } catch (error) {
            console.error(error);
        }

        res.status(OK).send('ok');
    });

export default webhookRouter;

"use strict";
/**
 * 取引ルーター
 * @ignore
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
const createDebug = require("debug");
const express = require("express");
const PostbackController = require("../controllers/webhook/postback");
const user_1 = require("../user");
const transactionsRouter = express.Router();
const debug = createDebug('sskts-line-ticket-simplified:router:transactions');
/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get('/transactions/inputCreditCard', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/inputCreditCard', {
            amount: req.query.amount,
            gmoShopId: req.query.gmoShopId,
            cb: req.query.cb // フォームのPOST先
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 自分の取引のクレジットカード情報入力戻り先
 */
transactionsRouter.post('/transactions/:transactionId/inputCreditCard', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        debug('credit card token created.', req.body.token);
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: req.query.state
        });
        // 入金
        yield PostbackController.depositFromCreditCard(user, parseInt(req.body.amount, 10), req.body.token);
        const location = 'line://';
        res.send(`
<html>
<body onload="location.href='line://'">
<div style="text-align:center; font-size:400%">
<h1>入金完了</h1>
<a href="${location}">LINEに戻る</a>
</div>
</body>
</html>`);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = transactionsRouter;

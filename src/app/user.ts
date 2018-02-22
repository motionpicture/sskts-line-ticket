import * as ssktsapi from '@motionpicture/sskts-api-nodejs-client';
import * as createDebug from 'debug';
import * as redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

const debug = createDebug('sskts-line-ticket:user');

const redisClient = new redis({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: <any>{ servername: <string>process.env.REDIS_HOST }
});

export interface ICredentials {
    /**
     * リフレッシュトークン
     */
    refresh_token?: string;
    /**
     * 期限UNIXタイムスタンプ
     */
    expiry_date?: number;
    /**
     * アクセストークン
     */
    access_token: string;
    /**
     * トークンタイプ
     */
    token_type?: string;
}

/**
 * トークンに含まれる情報インターフェース
 * @export
 * @interface
 */
export interface IPayload {
    sub: string;
    token_use: string;
    scope: string;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}

/**
 * 公開鍵インターフェース
 * @export
 * @interface
 */
export interface IPems {
    [key: string]: string;
}

/**
 * ユーザー設定インターフェース
 * @export
 * @interface
 */
export interface IConfigurations {
    host: string;
    userId: string;
    state: string;
}

const USER_EXPIRES_IN_SECONDS = process.env.USER_EXPIRES_IN_SECONDS;
if (USER_EXPIRES_IN_SECONDS === undefined) {
    throw new Error('Environment variable USER_EXPIRES_IN_SECONDS required.');
}
// tslint:disable-next-line:no-magic-numbers
const EXPIRES_IN_SECONDS = parseInt(USER_EXPIRES_IN_SECONDS, 10);
// const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 31536000;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 300;

/**
 * LINEユーザー
 * @class
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
export default class User {
    public host: string;
    public state: string;
    public userId: string;
    public payload: IPayload;
    public accessToken: string;
    public authClient: ssktsapi.auth.OAuth2;

    constructor(configurations: IConfigurations) {
        this.host = configurations.host;
        this.userId = configurations.userId;
        this.state = configurations.state;

        this.authClient = new ssktsapi.auth.OAuth2({
            domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.API_CLIENT_ID,
            clientSecret: <string>process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout`
        });
    }

    public generateAuthUrl() {
        return this.authClient.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: <string>process.env.API_CODE_VERIFIER
        });
    }

    public generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }

    public async getCredentials(): Promise<ICredentials | null> {
        return redisClient.get(`line-ticket.credentials.${this.userId}`)
            .then((value) => (value === null) ? null : JSON.parse(value));
    }

    public async getRefreshToken(): Promise<string | null> {
        return redisClient.get(`line-ticket.refreshToken.${this.userId}`)
            .then((value) => (value === null) ? null : value);
    }

    public setCredentials(credentials: ICredentials) {
        const payload = <any>jwt.decode(credentials.access_token);
        debug('payload:', payload);

        this.payload = payload;
        this.accessToken = credentials.access_token;
        this.authClient.setCredentials(credentials);

        return this;
    }

    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClient.getToken(code, <string>process.env.API_CODE_VERIFIER);
        debug('credentials published', credentials);

        if (credentials.access_token === undefined) {
            throw new Error('Access token is required for credentials.');
        }

        if (credentials.refresh_token === undefined) {
            throw new Error('Refresh token is required for credentials.');
        }

        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-ticket.credentials.${this.userId}`, JSON.stringify(credentials))
            .expire(`line-ticket.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        // リフレッシュトークンを保管
        await redisClient.multi()
            .set(`line-ticket.refreshToken.${this.userId}`, credentials.refresh_token)
            .expire(`line-ticket.refreshToken.${this.userId}`, REFRESH_TOKEN_EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('refresh token saved.');

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async signInForcibly(credentials: ICredentials) {
        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-ticket.credentials.${this.userId}`, JSON.stringify(credentials))
            .expire(`line-ticket.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async logout() {
        await redisClient.del(`line-ticket.credentials.${this.userId}`);
    }

    public async findTransaction() {
        return redisClient.get(`transaction.${this.userId}`).then((value) => {
            return (value !== null) ? JSON.parse(value) : null;
        });
    }

    public async saveTransaction(transaction: ssktsapi.factory.transaction.placeOrder.ITransaction) {
        await redisClient.multi()
            .set(`transaction.${this.userId}`, JSON.stringify(transaction))
            .expire(`transaction.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }
}

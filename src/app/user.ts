import * as ssktsapi from '@motionpicture/sskts-api-nodejs-client';
import * as createDebug from 'debug';
import * as redis from 'ioredis';

const debug = createDebug('sskts-line-ticket:user');

const redisClient = new redis({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: <any>{ servername: <string>process.env.REDIS_HOST }
});

/**
 * cognito認可サーバーのOPEN ID構成インターフェース
 * @export
 * @interface
 */
export interface IOpenIdConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
    response_types_supported: string[];
    subject_types_supported: string[];
    version: string;
    id_token_signing_alg_values_supported: string[];
    x509_url: string;
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

if (process.env.USER_EXPIRES_IN_SECONDS === undefined) {
    throw new Error('USER_EXPIRES_IN_SECONDS undefined.');
}
// tslint:disable-next-line:no-magic-numbers
const EXPIRES_IN_SECONDS = parseInt(<string>process.env.USER_EXPIRES_IN_SECONDS, 10);

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

    public async getToken(): Promise<string | null> {
        return redisClient.get(`token.${this.userId}`);
    }

    public setCredentials(payload: IPayload, token: string) {
        this.payload = payload;
        this.accessToken = token;
        this.authClient.setCredentials({
            access_token: token
        });

        return this;
    }

    // public async isAuthenticated() {
    //     const token = await redisClient.get(`token.${this.userId}`);
    //     if (token === null) {
    //         return false;
    //     }

    //     const payload = await validateToken(token, {
    //         issuer: ISSUER,
    //         tokenUse: 'access' // access tokenのみ受け付ける
    //     });
    //     debug('verified! payload:', payload);
    //     // this.payload = payload;
    //     // this.scopes = (typeof payload.scope === 'string') ? payload.scope.split((' ')) : [];
    //     this.accessToken = token;
    //     this.authClient.setCredentials({
    //         access_token: token
    //     });

    //     return true;
    // }

    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClient.getToken(code, <string>process.env.API_CODE_VERIFIER);
        debug('credentials published', credentials);

        if (credentials.access_token === undefined) {
            throw new Error('Access token is required for credentials.');
        }

        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`token.${this.userId}`, credentials.access_token)
            .expire(`token.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        const payload = credentials.access_token.split('.')[1];
        this.setCredentials(JSON.parse(atob(payload)), credentials.access_token);

        return this;
    }

    public async logout() {
        await redisClient.del(`token.${this.userId}`);
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

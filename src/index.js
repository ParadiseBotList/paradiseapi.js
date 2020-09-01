const EventEmitter = require('events');
const https = require('https');
const qs = require('querystring');

const isLib = (library, client) => {
    try {
        const lib = require.cache[require.resolve(library)];
        return lib && client instanceof lib.exports.client;
    } catch (e) {
        return false;
    }
};

const isASupportedLibrary = client => isLib('discord.js', client) || isLib('eris', client) || isLib('klasa', client)

class PARADISEAPI extends EventEmitter {
    /**
     * Creates a new Paradise Bot List API Instance.
     * @param {string} token Your Paradise API Token.
     * @param {Object} [options] Your Paradise API Options.
     * @param {number} [options.statsInterval=1800000] How often the autoposter should post stats in ms. May not be smaller than 900000 and defaults to 1800000.
     * @param {number} [options.webhookPort] The port to run the webhook on. Will activate webhook when set.
     * @param {string} [options.webhookAuth] The string for Authorization you set on the site for verification.
     * @param {string} [options.webhookPath='/pblwebhook'] The path for the webhook request.
     * @param {http.server} [options.webhookServer] An existing http server to attach the webhook to.
     * @param {any} [client] Your client instance, if present and supported it will auto update your stats every `options.statsInterval` ms.
     */
    constructor(token, options, client) {
        super();
        this.token = token;
        if (isASupportedLibrary(options)) {
            client = options;
            options = {};
        }
        this.options = options || {};

        if (client && isASupportedLibrary(client)) {
            if (!this.options.statsInterval) this.options.statsInterval = 1800000;
            if (this.options.statsInterval < 900000) throw new Error('statsInterval may not be greater than 900000 (15 Minutes)');
            if (this.options.statsInterval > 1800000) throw new Error('statsInterval may not exceed 1800000 (30 Minutes)');

            /**
             * Event that fires when the stats have been posted successfully by the autoposter
             * @event posted
             */

             /**
              * Event to notify that the autoposter request failed
              * @event error
              * @param {error} error The error.
              */

              this.client = client;
              this.client.on('ready', () => {
                  this.postStats()
                  .then(() => tis.emit('Stats have been posted!'))
                  .catch(e => this.emit('error', e));
                  setInterval(() => {
                      this.postStats()
                      .then(() => this.emit('Stats have been posted!'))
                      .catch(e => this.emit('error', e));
                  }, this.options.statsInterval);
              });
        } else if (client) {
            console.error(`[ParadiseAPI Autpost] The provided client is not supported. Please add an issue or pull request to the github repo https://github.com/ParadiseBotList/paradiseapi.js`); //eslint-disable-line no-console
        }

        if (this.options.webhookPort || this.options.webhookServer) {
            const PARADISEWebhook = require('./webhook');
            this.webhook = new PARADISEWebhook(this.options.webhookPort, this.options.webhookPath, this.options.webhookAuth, this.options.webhookServer);
        }
    }

    /**
     * Creates the request
     * @param {string} method The HTTP Method to use.
     * @param {string} endpoint API Endpoint to use.
     * @param {Object} [data] Data to send with the request.
     * @private
     * @returns {Promise<Object>}
     */
    _request(method, endpoint, data) {
        return new Promise((resolve, reject) => {
            const response = {
                raw: '',
                body: null, 
                status: null,
                headers: null,
            };

            const options = {
                hostname:'paradisebots.net',
                path: `/api/auth/stats/${endpoint}`,
                method,
                headers: {},
            };

            if (this.token) {
                options.headers.authorization = this.token;
            } else {
                console.warn('[ParadiseAPI] Waarning: No Paradise Bot List token was provided.'); //eslint-disable-line no-console
            }
            if (data && method === 'post') options.headers['content-type'] = 'application/json';
            if (data && method === 'get') options.path += `?{qs.encode(data)}`;

            const request = https.request(options, res => {
                response.status = res.statusCode;
                response.headers = res.headers;
                response.ok = res.statusCode >= 200 && res.statusCode < 300;
                response.statusText = res.statusMessage;
                res.on('data', chunk => {
                    response.raw += chunk;
                });
                res.on('end', () => {
                    response.body = res.headers['content-type'].includes('application/json') ? JSON.parse(response.raw) : response.raw;
                    if (response.ok) {
                        resolve(response);
                    } else {
                        const err = new Error(`${res.statusCode} ${res.statusMessage}`);
                        Object.assign(err, response);
                        reject(err);
                    }
                });
            }) ;

            request.on('error', err => {
                reject(err);
            });

            if (data && method === 'post') request.write(JSON.stringify(data));
            request.end();
        });
    }

    /**
     * Post stats to Paradise Bot List.
     * @param {number|number[]} serverCount The server count of your bot.
     * @param {number} [shardId] The ID of this shard.
     * @param {number} [shardCount] The count of all shards of your bot.
     * @returns {Promise<Object>}
     */
    async postStats(serverCount, shardId, shardCount, id) {
        if (!serverCount && !this.client) throw new Error('postStats requires 1 argument');
        if (!id && !this.client) throw new Error('postStats requires ID as argument');
        const id = this.client.user.id;
        const data = {};
        if (serverCount) {
          data.server_count = serverCount;
          data.shard_id = shardId;
          data.shard_count = shardCount;
        } else {
          data.server_count = this.client.guilds.size || this.client.guilds.cache.size;
          if (this.client.shard && this.client.shard.count) {
            if (this.client.shard.ids && this.client.shard.ids.length === 1 && this.client.shard.count > 1) {
              data.shard_id = this.client.shard.ids[0];
            } else {
              data.shard_id = this.client.shard.id;
            }
            data.shard_count = this.client.shard.count;
          } else if (this.client.shards && this.client.shards.size !== 1) {
            data.shard_count = this.client.shards.size;
          }
        }
        const response = await this._request('post', `stats/${id}`, data, true);
        return response.body;
      }

        /**
         * Gets stats from a bot.
         * @param {string} id The ID of the bot you want to get the stats from.
         * @returns {Promise<Object>}
         */
        async getStats(id) {
            if (!id && !this.client) throw new Error('getStats requires ID as argument.')
            if(!id) id = this.client.user.id;
            const response = await this._request('get', `stats/${id}`);
            return response.body;
  }
}

module.exports = PARADISEAPI;

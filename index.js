'use strict';

var request = require('request'),
    _       = require('lodash'),
    url     = require('url'),
    fs      = require('fs');

var DM_API_ROOT = 'https://api.dailymotion.com';
var GRANT_TYPES = ['client_credentials', 'authorization_code', 'password'];

var DailymotionAPI = function(clientID, clientSecret, scope) {
    this.config = {};
    this.config.client_id = clientID;
    this.config.client_secret = clientSecret;
    this.config.scope = scope || null;

    this.credentials = {};
    this.grant_type = 'authorization_code';

    this._expirationTimestamp = null;
    this._authFailed = true;
};

/**
 * Sets access scope
 * @param {array} scope Array of scope permission strings
 */
DailymotionAPI.prototype.setScope = function(scope) {
    this.config.scope = scope;

    return this;
};

/**
 * Sets credentials
 * @param {string} grant_type  Can be either 'client_credentials', 'authorization_code' or 'password'
 * @param {object} credentials Credentials in the following structure
 *                                 password:
 *                                     - {string} username
 *                                     - {string} password
 *                                 authorization_code:
 *                                     - {string} access_token
 *                                     - {string} refresh_token
 *                                 client_credentials:
 *                                     leave it empty
 */
DailymotionAPI.prototype.setCredentials = function(grant_type, credentials) {
    if (GRANT_TYPES.indexOf(grant_type) === -1)
        throw 'DM.API :: Given grant_type in setCredentials() does not match any known type';

    this.grant_type = grant_type;

    if (this.grant_type === 'client_credentials')
        this.credentials = {};
    else
    {
        this.credentials = _.extend(this.credentials, credentials);
        if (this.grant_type === 'authorization_code')
        {
            this._expirationTimestamp = credentials.expires_at;
            delete this.credentials.expires_at;
        }
    }

    return this;
};

/**
 * Creates a token when you have 'password' grant type
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
DailymotionAPI.prototype.createToken = function(next) {
    var payload = _.extend(this.config, this.credentials);
    payload.scope = payload.scope.join(' ');
    payload.grant_type = this.grant_type;

    request.post({
        url: DM_API_ROOT + '/oauth/token',
        form: payload
    }, function(e, r, body) {
        var data = JSON.parse(body);
        this.credentials.accessToken = data.access_token;
        this.credentials.refreshToken = data.refresh_token;
        this._expirationTimestamp = Date.now() + data.expires_in * 1000;
        this._authFailed = false;
        next();
    }.bind(this));
};

/**
 * Refreshes an expired access_token with the help of a refresh_token
 * @param  {Function} next Callback for when the token is indeed refreshed
 */
DailymotionAPI.prototype.refreshToken = function(next) {
    if (!this.credentials.refreshToken)
        throw 'DM.API :: refresh_token not set!';

    request.post({
        url: DM_API_ROOT + '/oauth/token',
        form: {
            client_id: this.config.client_id,
            client_secret: this.config.client_secret,
            grant_type: 'refresh_token',
            refresh_token: this.credentials.refreshToken
        }
    }, function(e, r, body) {
        var data = JSON.parse(body);
        this.credentials.accessToken = data.access_token;
        this.credentials.refreshToken = data.refresh_token;
        this._expirationTimestamp = Date.now() + data.expires_in * 1000;
        this._authFailed = false;
        next();
    }.bind(this));
};

/**
 * Authenticated API Request
 * @param  {string}   verb     HTTP Verb to be used
 * @param  {string}   endpoint Endpoint path
 * @param  {object}   data     Data to send to given endpoint
 * @param  {Function} callback Function called when request is done. It is called with the body parsed as JSON as first parameter.
 */
DailymotionAPI.prototype.api = function(verb, endpoint, data, callback) {

    if (typeof data === 'function')
    {
        if (!callback) // switch args around
        {
            callback = data;
            data = {};
        }
        else
            data = data();
    }
    else if (!data)
        data = {};

    // Token expiration check
    if (!!this._expirationTimestamp && this._expirationTimestamp <= Date.now())
    {
        if (this._authFailed)
            throw 'DM.API :: Authentication failed twice, check your credentials';

        this._authFailed = true;
        return this.refreshToken(function() {
            this.api(verb, endpoint, data, callback);
        }.bind(this));
    }

    var opts = {
        url: DM_API_ROOT + endpoint,
        method: verb.toUpperCase(), // always UPPERCASEPLS
        auth: { // DM auth
            bearer: this.credentials.accessToken
        }
    };

    // Automatic data passing
    switch (opts.method)
    {
        case 'GET': // append query string
            opts.url += url.format({ query: data });
            break;
        case 'POST': // use form param
            opts.form = data;
            break;
        default: // strip the first ?
            opts.body = url.format({ query: data }).substring(1);
    }

    // Perform actual api request
    return request(opts, function(e, r, body) {
        if (typeof callback === 'function')
            callback(JSON.parse(body));
    });
};


// Convenience methods for api()
DailymotionAPI.prototype.get     = function(endpoint, data, callback) { this.api('GET',    endpoint, data, callback); };
DailymotionAPI.prototype.post    = function(endpoint, data, callback) { this.api('POST',   endpoint, data, callback); };
DailymotionAPI.prototype.head    = function(endpoint, data, callback) { this.api('HEAD',   endpoint, data, callback); };
DailymotionAPI.prototype.put     = function(endpoint, data, callback) { this.api('PUT',    endpoint, data, callback); };
DailymotionAPI.prototype.patch   = function(endpoint, data, callback) { this.api('PATCH',  endpoint, data, callback); };
DailymotionAPI.prototype.del     = function(endpoint, data, callback) { this.api('DELETE', endpoint, data, callback); };
DailymotionAPI.prototype.options = function(endpoint, callback)       { this.api('OPTIONS', endpoint, callback); };

/**
 * Uploads a video using user's auth data
 * @param  {object} options - Contains the following fields :
 *                              - {string} filepath - System path to video
 *                              - {object} meta - Metadata for the new video (such as title, channel, tags, etc)
 *                              - OPTIONAL {function} progress - Progress callback for upload progression
 *                              - OPTIONAL {function} done - Called when upload is finished with new video ID and other data.
 */
DailymotionAPI.prototype.upload = function(options) {
    if (!options.filepath || !options.meta)
        throw 'DM.API :: Filepath or meta not given in upload method';

    if (!fs.fileExistsSync(options.filepath))
        throw 'DM.API :: Filepath not found';

    // Request upload URL
    this.get('/file/upload', function(res) {
        var uploadURL = res.upload_url;
        var progressURL = res.progress_url;
        var progresshwnd = null;
        if (typeof options.progress === 'function')
        {
            // Progress Handle - check progress every 3 seconds
            progresshwnd = setInterval(function() {
                request({
                    url: progressURL,
                    method: 'GET',
                    auth: {
                        bearer: this.credentials.accessToken
                    },
                }, function(e, r, body) {
                    options.progress(JSON.parse(body));
                });
            }, 3000);
        }

        // Proceed to upload
        request({
            url: uploadURL,
            method: 'POST',
            auth: {
                bearer: this.credentials.accessToken
            },
            formData: {
                file: fs.createReadStream(options.filepath)
            },
            headers: {
                'Content-Type': 'video/mp4'
            }
        }, function(e, r, body) {
            var uploadRes = JSON.parse(body);
            var videoURL = uploadRes.url;

            // Stop progress checked
            if (!!progresshwnd)
            {
                clearInterval(progresshwnd);
                progresshwnd = null;
            }

            // Associate newly uploaded video to account
            this.post('/me/videos', _.extend(options.meta, {
                url: videoURL
            }), function(videoCreated) {
                if (typeof options.done === 'function')
                    options.done(videoCreated);
            });
        });
    });
};

module.exports.client = DailymotionAPI;

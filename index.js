var request = require('request'),
    _ = require('lodash'),
    url = require('url');

var DM_BASE_API = 'https://api.dailymotion.com';

var DailymotionAPI = function(clientID, clientSecret, login, password, scope) {
    this.config = {};
    this.config.client_id = clientID;
    this.config.client_secret = clientSecret;
    this.config.username = login;
    this.config.password = password;
    this.config.scope = scope || null;

    this._accessToken = null;
    this._refreshToken = null;
    this._expirationTimestamp = null;
    this._authFailed = true;
};

// Create token
DailymotionAPI.prototype.createToken = function(next) {
    var formData = _.clone(this.config);
    formData.scope = encodeURIComponent(formData.scope.join(' '));
    formData.grant_type = 'password';

    request.post({ url: DM_BASE_API + '/oauth/token', form: formData }, function(e, r, body) {
        var data = JSON.parse(body);
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token;
        this._expirationTimestamp = Date.now() + data.expires_in * 1000;
        this._authFailed = false;
        next();
    }.bind(this));
};

// Token refresh support
DailymotionAPI.prototype.refreshToken = function(next) {
    var formData = {
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        grant_type: 'refresh_token',
        refresh_token: this._refreshToken
    };

    request.post({ url: DM_BASE_API + '/oauth/token', form: formData }, function(e, r, body) {
        var data = JSON.parse(body);
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token;
        this._expirationTimestamp = Date.now() + data.expires_in * 1000;
        this._authFailed = false;
        next();
    }.bind(this));
};

DailymotionAPI.prototype.api = function(verb, endpoint, data, callback) {

    // Token expiration check
    if (!!this._expirationTimestamp 
    && this._expirationTimestamp <= Date.now())
    {
        if (this._authFailed)
            throw "Authentication failed twice, check your credentials";

        this._authFailed = true;
        return this.refreshToken((function() { 
            this.api(verb, endpoint, data, callback); 
        }).bind(this));
    }

    verb = verb.toUpperCase(); // always UPPERCASEPLS

    var opts = {
        url: DM_BASE_API + endpoint,
        method: verb,
        headers: { // DM auth
            'Authorization': 'OAuth ' + this._accessToken
        }
    };

    // Automatic data passing
    switch (verb)
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
    })
};


// Convenience methods for api
DailymotionAPI.prototype.get = function(endpoint, data, callback) { this.api('GET', endpoint, data, callback); };
DailymotionAPI.prototype.post = function(endpoint, data, callback) { this.api('POST', endpoint, data, callback); };
DailymotionAPI.prototype.head = function(endpoint, data, callback) { this.api('HEAD', endpoint, data, callback); };
DailymotionAPI.prototype.put = function(endpoint, data, callback) { this.api('PUT', endpoint, data, callback); };
DailymotionAPI.prototype.patch = function(endpoint, data, callback) { this.api('PATCH', endpoint, data, callback); };
DailymotionAPI.prototype.del = function(endpoint, data, callback) { this.api('DELETE', endpoint, data, callback); };

module.exports.client = DailymotionAPI;
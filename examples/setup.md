# Dailymotion SDK

## Example Setup

```javascript

var DMClient = require('dailymotion-sdk').client;

var clientId = ''; // Fill yours
var clientSecret = ''; // Fill yours
var scope = [
    //'desired scopes',
    //'refer to API documentation',
    'email',
    'userinfo',
    'feed',
    'manage_videos'
];

var client = new DMClient(clientId, clientSecret, scope);

// For authorization there are several ways possible in the API
// First being using login/password : 'password'
client.setCredentials(DMClient.GRANT_TYPES.PASSWORD, {
    username: 'your_username',
    password: 'your_dm_password'
});

// Then there is 'client_credentials' using only client ID/Secret pair to access unauthorized API parts only
client.setCredentials(DMClient.GRANT_TYPES.CLIENT_CREDENTIALS);

// Lastly there is the 'authorization_code' mode if you need authorized requests for a user.
// There are two ways to use it as described in the API, first by providing access_token & refresh_token pair
client.setCredentials(DMClient.GRANT_TYPES.AUTHORIZATION_CODE, {
    access_token: 'abc123', // user token
    refresh_token: 'etc' // refresh token
});
// The other way is to use redirect_uri/authorization code pair, that'll be useful if you don't have the token but only the authorization code
client.setCredentials(DMClient.GRANT_TYPES.AUTHORIZATION_CODE, {
    redirect_uri: 'http://your.redirect.uri.tld/etc',
    code: 'ABC12345' // authorization code
});

// If you're using 'password' or 'authorization_code' (with uri/code pair) you must create an access token prior making any requests
client.createToken(next);
// Otherwise, refresh your access_token/refresh_token pair
client.refreshToken(next);

var next = function() {
    // Now you should be able to make fully authenticated requests to the DM API
    client.get('/user/me', {
        fields: ['avatar_240_url', 'cover_url', 'description', 'id', 'url', 'username']
    }, function(err, req, data) {
        if (!!err) {
            console.error(err);
            return;
        }

        //console.log(req); // req is the original request object, useful to get headers, debug stuff and so on

        console.log(data); // the api response is here
    });
};

```

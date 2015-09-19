dailymotion-sdk-node
====================

Node.js SDK for Dailymotion API

# Examples
Refer to the `examples` folder to get a setup example

# API


* * *

### setScope(scope) 

Sets access scope

**Parameters**

**scope**: `array | function | string`, Permission scopes. Can be array, function or string (separated by spaces)



### setCredentials(grant_type, credentials) 

Sets credentials

**Parameters**

**grant_type**: `string`, Can be either 'client_credentials', 'authorization_code' or 'password'

**credentials**: `object`, Credentials in the following structure

`object`password:

* `string` username
* `string` password

`object` authorization_code:

* `string` access_token
* `string` refresh_token

OR

* `string` redirect_uri
* `string` code

`object` client_credentials:
leave it empty



### createToken(next) 

Creates a token when you have 'password' grant type

**Parameters**

**next**: `function`, Callback for when the token is indeed refreshed. Can be called with 1 param if error



### refreshToken(next) 

Refreshes an expired access_token with the help of a refresh_token

**Parameters**

**next**: `function`, Callback for when the token is indeed refreshed. Can be called with 1 param if error



### api(verb, endpoint, data, callback) 

Authenticated API Request

`data` and `callback` arguments are swappable.

**Parameters**

**verb**: `string`, HTTP Verb to be used

**endpoint**: `string`, Endpoint path

**data**: `object`, Data to send to given endpoint

**callback**: `function`, Function called when request is done. Callback params are:

* `Error` err  - It should be null most of the time
* `Request` r  - Request object for better control
* `Object` res - Parsed response body

# The following methods are used to facilitate api calls
### get(enpoint, data, callback)
### post(enpoint, data, callback)
### put(enpoint, data, callback)
### delete(enpoint, data, callback)
### patch(enpoint, callback)
### head(enpoint, callback)

***


### upload(options) 

Uploads a video using user's auth data

**Parameters**

**options**: `object`, Contains the following fields :

* `string` filepath - System path to video
* `object` meta - Metadata for the new video (such as title, channel, tags, etc)
* OPTIONAL `function` progress - Progress callback for upload progression
* OPTIONAL `function` done - Called when upload is finished with new video ID and other data.




* * *





[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/OtaK/dailymotion-sdk-node/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


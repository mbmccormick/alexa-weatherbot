var Request = require("request");
var Moment = require("moment-timezone");

var PERMISSIONS = [
    "read::alexa:device:all:address"
];

var AlexaDeviceAddressClient = require("./lib/AlexaDeviceAddressClient");

exports.getRequestedLocation = function(_alexa, callback) {
    if (_alexa.event.request.intent &&
        _alexa.event.request.intent.slots &&
        _alexa.event.request.intent.slots.Location.value) {
        var input = _alexa.event.request.intent.slots.Location.value;

        getGeocodeResult(_alexa, input, false, function (latitude, longitude, location, timezone) {
            callback(latitude, longitude, location, timezone);
        });
    }
    else {
        getDeviceAddress(_alexa, function (address) {
            if (_alexa.attributes["LATITUDE"] &&
                _alexa.attributes["LONGITUDE"] &&
                _alexa.attributes["LOCATION"] &&
                _alexa.attributes["TIMEZONE"]) {
                callback(_alexa.attributes["LATITUDE"], _alexa.attributes["LONGITUDE"], _alexa.attributes["LOCATION"], _alexa.attributes["TIMEZONE"]);
            }
            else {
                getGeocodeResult(_alexa, address, true, function (latitude, longitude, location, timezone) {
                    callback(latitude, longitude, location, timezone);
                });
            }
        });
    }
}

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}

function getDeviceAddress(_alexa, callback) {
    var context = _alexa.event.context;

    if (!context) {
        printDebugInformation("ERROR: _alexa.event.context");
        printDebugInformation(_alexa.event);
        
        _alexa.response.speak("There was a problem accessing device permissions. Please try again later.");
        _alexa.emit(":responseReady");

        return;
    }

    var permissions = _alexa.event.context.System.user.permissions;

    if (!permissions) {
        printDebugInformation("ERROR: _alexa.event.context.System.user.permissions");
        printDebugInformation(_alexa.event.context.System.user);
        
        _alexa.response.speak("There was a problem accessing device permissions. Please try again later.");
        _alexa.emit(":responseReady");

        return;
    }

    var consentToken = _alexa.event.context.System.user.permissions.consentToken;

    if (!consentToken) {
        _alexa.response.speak("In order to provide your hyperlocal weather forecast, I need to know your address. Please update your address and enable location permissions in the Alexa app.")
            .askForPermissionsConsentCard(PERMISSIONS);
        _alexa.emit(":responseReady");

        return;
    }

    var deviceId = _alexa.event.context.System.device.deviceId;
    var apiEndpoint = _alexa.event.context.System.apiEndpoint;

    var alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);

    let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();

    deviceAddressRequest.then(function (addressResponse) {
        switch (addressResponse.statusCode) {
            case 200:
                // successfully got the address associated with this deviceId
                var address = "";
                if (addressResponse.address["addressLine1"] &&
                    addressResponse.address["city"] &&
                    addressResponse.address["stateOrRegion"]) {
                    address = addressResponse.address["addressLine1"] + ", " + addressResponse.address["city"] + ", " + addressResponse.address["stateOrRegion"] + " " + addressResponse.address["postalCode"];
                }
                else {
                    address = addressResponse.address["postalCode"];
                }

                if (_alexa.attributes["ADDRESS"] != address) {
                    _alexa.attributes["LATITUDE"] = null;
                    _alexa.attributes["LONGITUDE"] = null;
                    _alexa.attributes["LOCATION"] = null;
                    _alexa.attributes["TIMEZONE"] = null;
                }

                _alexa.attributes["ADDRESS"] = address;

                callback(address);

                break;
            case 204:
                // the query did not return any results
                _alexa.response.speak("It doesn't look like you've set up your address yet. Please enter your address in the Alexa app.");
                _alexa.emit(":responseReady");

                break;
            case 403:
                // the authentication token is invalid or doesn’t have access to the resource
                _alexa.response.speak("It doesn't look like you've granted Weatherbot permission to access your location yet. Please enable location permissions in the Alexa app.")
                    .askForPermissionsConsentCard(PERMISSIONS);
                _alexa.emit(":responseReady");

                break;
            default:
                // catch all other responses
                _alexa.response.speak("There was a problem retrieving your address. Please try again later.");
                _alexa.emit(":responseReady");

                break;
        }
    });

    deviceAddressRequest.catch(function (err) {
        printDebugInformation("ERROR: deviceAddressRequest()");
        printDebugInformation(err);

        _alexa.response.speak("There was a problem retrieving your address. Please try again later.");
        _alexa.emit(":responseReady");
    });
}

function getGeocodeResult(_alexa, address, cache, callback) {
    var url = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=" + encodeURI(address) + "&key=" + process.env.GOOGLE_MAPS_API_KEY;

    Request.get({
        uri: url,
        gzip: true
    }, function (err, response, body) {
        printDebugInformation(url);

        if (err) {
            printDebugInformation("ERROR: getGeocodeResult()");
            printDebugInformation(err);

            _alexa.response.speak("There was a problem locating your address. Please try again later.");
            _alexa.emit(":responseReady");
        }

        var data = JSON.parse(body);

        var latitude = data.results[0].geometry.location.lat;
        var longitude = data.results[0].geometry.location.lng;
        var location = "that location";

        var locality = data.results[0].address_components.find(z => z.types.find(y => y == "locality"));
        var neighborhood = data.results[0].address_components.find(z => z.types.find(y => y == "neighborhood"));

        if (locality) {
            location = locality.long_name;
        }
        else if (neighborhood) {
            location = neighborhood.long_name;
        }

        getTimezoneResult(_alexa, latitude, longitude, function (timezone) {
            if (cache) {
                _alexa.attributes["LATITUDE"] = latitude;
                _alexa.attributes["LONGITUDE"] = longitude;
                _alexa.attributes["LOCATION"] = location;
                _alexa.attributes["TIMEZONE"] = timezone;
            }

            callback(latitude, longitude, location, timezone);
        });
    });
}

function getTimezoneResult(_alexa, latitude, longitude, callback) {
    var url = "https://maps.googleapis.com/maps/api/timezone/json?location=" + latitude + "," + longitude + "&timestamp=" + Moment().unix() + "&key=" + process.env.GOOGLE_MAPS_API_KEY;

    Request.get({
        uri: url,
        gzip: true
    }, function (err, response, body) {
        printDebugInformation(url);

        if (err) {
            printDebugInformation("ERROR: getTimezoneResult()");
            printDebugInformation(err);

            _alexa.response.speak("There was a problem detecting your timezone. Please try again later.");
            _alexa.emit(":responseReady");
        }

        var data = JSON.parse(body);

        var timezone = data.timeZoneId;

        callback(timezone);
    });
}

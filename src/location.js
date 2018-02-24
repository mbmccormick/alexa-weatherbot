var Alexa = require("alexa-sdk");
var Request = require("request");
var Moment = require("moment-timezone");

var PERMISSIONS = [
    "read::alexa:device:all:address"
];

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

function getDeviceAddress(_alexa, callback) {
    var deviceId = _alexa.event.context.System.device.deviceId;
    var apiEndpoint = _alexa.event.context.System.apiEndpoint;

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

    var token = _alexa.event.context.System.user.permissions.consentToken;

    if (!token) {
        _alexa.response.speak("In order to provide your hyperlocal weather forecast, I need to know your address. Please update your address and enable location permissions in the Alexa app.")
            .askForPermissionsConsentCard(PERMISSIONS);
        
        _alexa.emit(":responseReady");

        return;
    }

    var deviceAddressService = new Alexa.services.DeviceAddressService();

    let deviceAddressServiceRequest = deviceAddressService.getFullAddress(deviceId, apiEndpoint, token)
    
    deviceAddressServiceRequest.then(function (addressResponse) {
        var address = "";
        if (addressResponse.addressLine1 &&
            addressResponse.city &&
            addressResponse.stateOrRegion) {
            address = addressResponse.addressLine1 + ", " + addressResponse.city + ", " + addressResponse.stateOrRegion + " " + addressResponse.postalCode;
        }
        else {
            address = addressResponse.postalCode;
        }

        if (_alexa.attributes["ADDRESS"] != address) {
            _alexa.attributes["LATITUDE"] = null;
            _alexa.attributes["LONGITUDE"] = null;
            _alexa.attributes["LOCATION"] = null;
            _alexa.attributes["TIMEZONE"] = null;
        }

        _alexa.attributes["ADDRESS"] = address;

        callback(address);
    });

    deviceAddressServiceRequest.catch(function (err) {
        printDebugInformation("ERROR: getFullAddress()");
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

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}
'use strict';

var Alexa = require("alexa-sdk");
var Geocoder = require("geocoder");
var DarkSky = require("forecast.io");
var Moment = require("moment");

var alexa;

exports.handler = function (event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.registerHandlers(defaultHandler);
    alexa.execute();
};

const ALL_ADDRESS_PERMISSION = "read::alexa:device:all:address";
const PERMISSIONS = [ALL_ADDRESS_PERMISSION];

const AlexaDeviceAddressClient = require("./AlexaDeviceAddressClient");

var defaultHandler = {
    "LaunchRequest": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var temperature = Math.round(data.currently.temperature);
                var minutely_summary = data.minutely.summary;
                var hourly_summary = data.hourly.summary;
                var high = Math.round(data.daily.data[0].temperatureMax);
                var low = Math.round(data.daily.data[0].temperatureMin);

                _alexa.emit(":tell", "Welcome to Weatherbot! Right now, it's " + temperature + " degrees and " + minutely_summary + ". " + hourly_summary + " with a high of " + high + " degrees and a low of " + low + "degrees." + getWeatherAlerts(data));
            });
        });
    },
    "FORECASTNOW": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var temperature = Math.round(data.currently.temperature);
                var summary = data.minutely.summary;

                _alexa.emit(":tell", "Right now, it's " + temperature + " degrees and " + summary + "." + getWeatherAlerts(data));
            });
        });
    },
    "FORECASTTODAY": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var summary = data.hourly.summary;
                var high = Math.round(data.daily.data[0].temperatureMax);
                var low = Math.round(data.daily.data[0].temperatureMin);

                summary = summary.replace("°F", " degrees");
                summary = summary.replace("°C", " degrees");

                _alexa.emit(":tell", summary + " with a high of " + high + " degrees and a low of " + low + "degrees." + getWeatherAlerts(data));
            });
        });
    },
    "FORECASTWEEK": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var summary = data.daily.summary;

                summary = summary.replace("°F", " degrees");
                summary = summary.replace("°C", " degrees");

                _alexa.emit(":tell", summary + "." + getWeatherAlerts(data));
            });
        });
    },
    "TEMPERATURE": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var temperature = Math.round(data.currently.temperature);

                _alexa.emit(":tell", "Right now, it's " + temperature + " degrees." + getWeatherAlerts(data));
            });
        });
    },
    "HUMIDITY": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var humidity = Math.round(data.currently.humidity * 100);

                _alexa.emit(":tell", "Right now, there's " + humidity + "% humidity." + getWeatherAlerts(data));
            });
        });
    },
    "PRECIPITATION": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var probability = Math.round(data.currently.precipProbability * 100);
                var type = data.currently.precipType ? data.currently.precipType : "precipitation";

                _alexa.emit(":tell", "Right now, there's a " + probability + "% chance of " + type + "." + getWeatherAlerts(data));
            });
        });
    },
    "WIND": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var wind = Math.round(data.currently.windSpeed);

                if (wind > 0) {
                    _alexa.emit(":tell", "Right now, there's a " + wind + " mile per hour wind." + getWeatherAlerts(data));
                }
                else {
                    _alexa.emit(":tell", "Right now, there's no wind." + getWeatherAlerts(data));
                }
            });
        });
    },
    "UVINDEX": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var uvIndex = data.currently.uvIndex;

                _alexa.emit(":tell", "Right now, the UV index is  " + uvIndex + "." + getWeatherAlerts(data));
            });
        });
    },
    "VISIBILITY": function () {
        var _alexa = this;

        getDeviceAddress(this, function (err, latitude, longitude) {
            getForecast(latitude, longitude, function (err, data) {
                var visibility = Math.round(data.currently.visibility);

                if (visibility > 0) {
                    _alexa.emit(":tell", "Right now, there's " + visibility + " mile visibility." + getWeatherAlerts(data));
                }
                else {
                    _alexa.emit(":tell", "Right now, there's no visibility." + getWeatherAlerts(data));
                }
            });
        });
    },
    "AMAZON.HelpIntent": function () {
        this.emit(":ask", "You can ask for things like current conditions, today's forecast, this week's forecast, temperature, humidity, precipitation, wind, UV index, and visibility.", "You can ask for things like current conditions, today's forecast, this week's forecast, temperature, humidity, precipitation, wind, UV index, and visibility.");
    },
    "Unhandled": function () {
        this.emitWithState("AMAZON.HelpIntent");
    }
};

function getDeviceAddress(_alexa, callback) {
    const consentToken = _alexa.event.context.System.user.permissions.consentToken;

    if (!consentToken) {
        _alexa.emit(":tellWithPermissionCard", "In order to provide your hyperlocal weather forecast, I need to know your address. Please update your address and enable location permissions in the Alexa app.", PERMISSIONS);
        return;
    }

    const deviceId = _alexa.event.context.System.device.deviceId;
    const apiEndpoint = _alexa.event.context.System.apiEndpoint;

    const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
    let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();

    deviceAddressRequest.then(function (addressResponse) {
        switch (addressResponse.statusCode) {
            case 200:
                // successfully got the address associated with this deviceId
                var address = addressResponse.address['addressLine1'] + ", " + addressResponse.address['stateOrRegion'] + " " + addressResponse.address['postalCode'];

                getGeocodeResult(address, function (err, data) {
                    if (data) {
                        var latitude = data.geometry.location.lat;
                        var longitude = data.geometry.location.lng;

                        callback(null, latitude, longitude);
                    }
                });

                break;
            case 204:
                // the query did not return any results
                __alexa.emit(":tell", "It doesn't look like you've set up your address yet. Please enter your address in the Alexa app.");

                break;
            case 403:
                // the authentication token is invalid or doesn’t have access to the resource
                __alexa.emit(":tellWithPermissionCard", "It doesn't look like you've granted Weatherbot permission to access your location yet. Please enable location permissions in the Alexa app.", PERMISSIONS);

                break;
            default:
                // catch all other responses
                this.emit(":tell", "There was an error finding your address. Please try again later.");

                break;
        }
    });

    deviceAddressRequest.catch(function (err) {
        __alexa.emit(":tell", "Sorry, an error has occurred");
    });
}

function getGeocodeResult(query, callback) {
    Geocoder.geocode(query, function (err, data) {
        var result = data.results[0];

        callback(err, result);
    });
}

function getForecast(latitude, longitude, callback) {
    var options = {
        APIKey: process.env.DARKSKY_API_KEY,
        timeout: 1000
    };

    var darksky = new DarkSky(options);

    darksky.get(latitude, longitude, { solar: 1 }, function (err, res, data) {
        callback(err, data);
    });
}

function getWeatherAlerts(data) {
    var alerts = "";
    if (data.alerts != null) {
        for (var i = 0; i < data.alerts.length; i++) {
            var alert = data.alerts[i];

            if (alert.expires) {
                alerts += " A " + alert.title + " is in effect until " + Moment(alert.expires * 1000).calendar() + ".";
            }
            else {
                alerts += " A " + alert.title + " is in effect.";
            }
        }
    }

    return alerts;
}
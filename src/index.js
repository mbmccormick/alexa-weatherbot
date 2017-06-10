var Alexa = require("alexa-sdk");
var Geocoder = require("geocoder");
var DarkSky = require("forecast.io");
var Windrose = require("windrose");
var Moment = require("moment");

var alexa;

exports.handler = function (event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.appId = "amzn1.ask.skill.45bd54a7-8512-438a-8191-ca2407990891";
    alexa.dynamoDBTableName = "Weatherbot";
    alexa.registerHandlers(defaultHandler);
    alexa.execute();
};

var ALL_ADDRESS_PERMISSION = "read::alexa:device:all:address";
var PERMISSIONS = [ALL_ADDRESS_PERMISSION];

var AlexaDeviceAddressClient = require("./AlexaDeviceAddressClient");

var defaultHandler = {
    "LaunchRequest": function () {
        printDebugInformation("defaultHandler:LaunchRequest");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;
                    var minutely_summary = data.minutely.summary;
                    var daily_summary = data.daily.data[0].summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    _alexa.emit(":tell", "Welcome to Weatherbot! Right now, it's " + temperature + " degrees and " + currently_summary + ". " + minutely_summary + " Today, the forecast has " + daily_summary + " with a high of " + high + " degrees and a low of " + low + "degrees." + getWeatherAlerts(data));
                });
            });
        });
    },
    "FORECASTNOW": function () {
        printDebugInformation("defaultHandler:FORECASTNOW");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;
                    var minutely_summary = data.minutely.summary;

                    _alexa.emit(":tell", "Right now, it's " + temperature + " degrees and " + currently_summary + ". " + minutely_summary + getWeatherAlerts(data));
                });
            });
        });
    },
    "FORECASTDAY": function () {
        printDebugInformation("defaultHandler:FORECASTDAY");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var summary = data.daily.data[0].summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    _alexa.emit(":tell", summary + " with a high of " + high + " degrees and a low of " + low + "degrees." + getWeatherAlerts(data));
                });
            });
        });
    },
    "FORECASTWEEK": function () {
        printDebugInformation("defaultHandler:FORECASTWEEK");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var summary = data.daily.summary;

                    summary = summary.replace("°F", " degrees");
                    summary = summary.replace("°C", " degrees");

                    _alexa.emit(":tell", summary + "." + getWeatherAlerts(data));
                });
            });
        });
    },
    "FORECASTFUTURETIME": function () {
        printDebugInformation("defaultHandler:FORECASTFUTURETIME");

        var _alexa = this;

        var time = this.event.request.intent.slots.Time.value;

        time = time.replace("MO", "8:00");
        time = time.replace("AF", "14:00");
        time = time.replace("EV", "18:00");
        time = time.replace("NI", "23:00");

        var unixTime = Moment(time, "h:mm");

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecastAtTime(_alexa, latitude, longitude, unixTime, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;

                    _alexa.emit(":tell", "The forecast for " + Moment(unixTime).calendar() + " is " + temperature + " degrees and " + currently_summary + ".");
                });
            });
        });
    },
    "FORECASTFUTUREDATE": function () {
        printDebugInformation("defaultHandler:FORECASTFUTUREDATE");

        var _alexa = this;

        var date = this.event.request.intent.slots.Date.value;

        var unixDate = Moment(date);

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecastAtTime(_alexa, latitude, longitude, unixDate, function (data) {
                    var summary = data.daily.data[0].summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    _alexa.emit(":tell", "The forecast for " + Moment(unixDate).calendar() + " is " + summary + " with a high of " + high + " degrees and a low of " + low + "degrees.");
                });
            });
        });
    },
    "TEMPERATURE": function () {
        printDebugInformation("defaultHandler:TEMPERATURE");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var temperature = Math.round(data.currently.temperature);

                    _alexa.emit(":tell", "Right now, the temperature is " + temperature + " degrees." + getWeatherAlerts(data));
                });
            });
        });
    },
    "PRECIPITATION": function () {
        printDebugInformation("defaultHandler:PRECIPITATION");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var probability = Math.round(data.currently.precipProbability * 100);
                    var type = data.currently.precipType ? data.currently.precipType : "precipitation";

                    _alexa.emit(":tell", "Right now, there's a " + probability + "% chance of " + type + "." + getWeatherAlerts(data));
                });
            });
        });
    },
    "WIND": function () {
        printDebugInformation("defaultHandler:WIND");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var speed = Math.round(data.currently.windSpeed);
                    var direction = Windrose.getPoint(data.currently.windBearing).name;

                    if (speed > 0) {
                        _alexa.emit(":tell", "Right now, the wind speed is " + speed + " mph out of the " + direction + "." + getWeatherAlerts(data));
                    }
                    else {
                        _alexa.emit(":tell", "Right now, there's no wind." + getWeatherAlerts(data));
                    }
                });
            });
        });
    },
    "HUMIDITY": function () {
        printDebugInformation("defaultHandler:HUMIDITY");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var humidity = Math.round(data.currently.humidity * 100);

                    _alexa.emit(":tell", "Right now, the humidity is " + humidity + "%." + getWeatherAlerts(data));
                });
            });
        });
    },
    "DEWPOINT": function () {
        printDebugInformation("defaultHandler:DEWPOINT");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var dewPoint = data.currently.dewPoint;

                    _alexa.emit(":tell", "Right now, the dew point is  " + dewPoint + " degrees." + getWeatherAlerts(data));
                });
            });
        });
    },
    "UVINDEX": function () {
        printDebugInformation("defaultHandler:UVINDEX");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var uvIndex = data.currently.uvIndex;

                    _alexa.emit(":tell", "Right now, the UV index is  " + uvIndex + "." + getWeatherAlerts(data));
                });
            });
        });
    },
    "VISIBILITY": function () {
        printDebugInformation("defaultHandler:VISIBILITY");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var visibility = Math.round(data.currently.visibility);

                    _alexa.emit(":tell", "Right now, the visibility is " + visibility + " mi." + getWeatherAlerts(data));
                });
            });
        });
    },
    "AMAZON.HelpIntent": function () {
        printDebugInformation("defaultHandler:AMAZON.HelpIntent");

        this.emit(":tell", "You can ask for things like the current forecast, today's forecast, this week's forecast, the forecast for a specific time, the forecast on a specific day, temperature, precipitation, wind, humidity, dew point, UV index, and visibility.");
    },
    "Unhandled": function () {
        printDebugInformation("defaultHandler:Unhandled");

        this.emitWithState("AMAZON.HelpIntent");
    }
};

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}

function getDeviceAddress(_alexa, callback) {
    var permissions = _alexa.event.context.System.user.permissions;

    if (!permissions) {
        _alexa.emit(":tell", "There was a problem accessing device permissions. Please try again later.");

        return;
    }
    
    var consentToken = _alexa.event.context.System.user.permissions.consentToken;

    if (!consentToken) {
        _alexa.emit(":tellWithPermissionCard", "In order to provide your hyperlocal weather forecast, I need to know your address. Please update your address and enable location permissions in the Alexa app.", PERMISSIONS);

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
                var address = addressResponse.address['addressLine1'] + ", " + addressResponse.address['stateOrRegion'] + " " + addressResponse.address['postalCode'];

                if (_alexa.attributes['ADDRESS'] != address) {
                    _alexa.attributes['LATITUDE'] = null;
                    _alexa.attributes['LONGITUDE'] = null;
                }

                _alexa.attributes['ADDRESS'] = address;

                callback(address);

                break;
            case 204:
                // the query did not return any results
                _alexa.emit(":tell", "It doesn't look like you've set up your address yet. Please enter your address in the Alexa app.");

                break;
            case 403:
                // the authentication token is invalid or doesn’t have access to the resource
                _alexa.emit(":tellWithPermissionCard", "It doesn't look like you've granted Weatherbot permission to access your location yet. Please enable location permissions in the Alexa app.", PERMISSIONS);

                break;
            default:
                // catch all other responses
                _alexa.emit(":tell", "There was a problem retrieving your address. Please try again later.");

                break;
        }
    });

    deviceAddressRequest.catch(function (err) {
        printDebugInformation("ERROR: deviceAddressRequest()");
        printDebugInformation(err);

        _alexa.emit(":tell", "There was a problem retrieving your address. Please try again later.");
    });
}

function getGeocodeResult(_alexa, query, callback) {
    if (_alexa.attributes['LATITUDE'] &&
        _alexa.attributes['LONGITUDE']) {
        callback(_alexa.attributes['LATITUDE'], _alexa.attributes['LONGITUDE']);
    }
    else {
        Geocoder.geocode(query, function (err, data) {
            if (err) {
                printDebugInformation("ERROR: getGeocodeResult()");
                printDebugInformation(err);

                _alexa.emit(":tell", "There was a problem locating your address. Please try again later.");
            }
            else {
                var latitude = data.results[0].geometry.location.lat;
                var longitude = data.results[0].geometry.location.lng;

                callback(latitude, longitude);
            }
        });
    }
}

function getForecast(_alexa, latitude, longitude, callback) {
    var darksky = new DarkSky({
        APIKey: process.env.DARKSKY_API_KEY
    });

    darksky.get(latitude, longitude, { solar: 1 }, function (err, res, data) {
        if (err) {
            printDebugInformation("ERROR: getForecast()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem retrieving your forecast. Please try again later.");
        }
        else {
            callback(data);
        }
    });
}

function getForecastAtTime(_alexa, latitude, longitude, time, callback) {
    var darksky = new DarkSky({
        APIKey: process.env.DARKSKY_API_KEY
    });

    darksky.getAtTime(latitude, longitude, time, { solar: 1 }, function (err, res, data) {
        if (err) {
            printDebugInformation("ERROR: getForecastAtTime()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem retrieving your forecast. Please try again later.");
        }
        else {
            callback(data);
        }
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

var Alexa = require("alexa-sdk");
var Request = require("request");
var Moment = require("moment");
var Windrose = require("windrose");

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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var minutely_summary = data.minutely.summary;
                    var hourly_summary = data.hourly.summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    _alexa.emit(":tell", "Welcome to Weatherbot! Right now, it's " + temperature + " degrees and " + minutely_summary + ". Today, the forecast is " + hourly_summary + ", with a high of " + high + " degrees and a low of " + low + "degrees." + getWeatherAlerts(data));
                });
            });
        });
    },

    "FORECASTNOW": function () {
        printDebugInformation("defaultHandler:FORECASTNOW");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var summary = data.minutely.summary;

                    _alexa.emit(":tell", "Right now, it's " + temperature + " degrees and " + summary + "." + getWeatherAlerts(data));
                });
            });
        });
    },

    "FORECASTDAY": function () {
        printDebugInformation("defaultHandler:FORECASTDAY");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var summary = data.hourly.summary;
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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

        if (!time) {
            this.emitWithState("Unhandled");

            return;
        }

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                var now = Moment().utc().add(offset, "seconds");

                time = time.replace("MO", "8:00");
                time = time.replace("AF", "14:00");
                time = time.replace("EV", "18:00");
                time = time.replace("NI", "23:00");

                var tmp = Moment(time, "h:mm");

                var unixTime = now.hour(tmp.hour()).minute(tmp.minute()).unix();

                if (tmp.hour() <= now.hour() &&
                    tmp.minute() < now.minute()) {
                    unixTime += (24 * 60 * 60);
                }

                getForecastAtTime(_alexa, latitude, longitude, unixTime, function (data) {
                    var timestamp = Moment(data.currently.time * 1000);
                    var temperature = Math.round(data.currently.temperature);
                    var summary = data.currently.summary;

                    _alexa.emit(":tell", "The forecast for " + timestamp.calendar(now) + " is " + temperature + " degrees and " + summary + ".");
                });
            });
        });
    },

    "FORECASTFUTUREDATE": function () {
        printDebugInformation("defaultHandler:FORECASTFUTUREDATE");

        var _alexa = this;

        var date = this.event.request.intent.slots.Date.value;

        if (!date) {
            this.emitWithState("Unhandled");

            return;
        }

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                var now = Moment().utc().add(offset, "seconds");

                var unixDate = Moment(date).unix();

                getForecastAtTime(_alexa, latitude, longitude, unixDate, function (data) {
                    var timestamp = Moment(data.currently.time * 1000);
                    var summary = data.hourly.summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    var calendarOptionsFuture = {
                        sameDay: "[today]",
                        nextDay: "[tomorrow]",
                        nextWeek: "dddd",
                        lastDay: "[yesterday]",
                        lastWeek: "[last] dddd",
                        sameElse: "MM/DD/YYYY"
                    };

                    var calendarOptionsPast = {
                        sameDay: "[today]",
                        nextDay: "[tomorrow]",
                        nextWeek: "dddd",
                        lastDay: "[yesterday]",
                        lastWeek: "[last] dddd",
                        sameElse: "[on] MM/DD/YYYY"
                    };

                    if (timestamp > now) {
                        _alexa.emit(":tell", "The forecast for " + timestamp.calendar(now, calendarOptionsFuture) + " is " + summary + " with a high of " + high + " degrees and a low of " + low + "degrees.");
                    }
                    else {
                        _alexa.emit(":tell", "The weather " + timestamp.calendar(now, calendarOptionsPast) + " was " + summary + " with a high of " + high + " degrees and a low of " + low + "degrees.");
                    }
                });
            });
        });
    },

    "TEMPERATURE": function () {
        printDebugInformation("defaultHandler:TEMPERATURE");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var dewPoint = Math.round(data.currently.dewPoint);

                    _alexa.emit(":tell", "Right now, the dew point is  " + dewPoint + " degrees." + getWeatherAlerts(data));
                });
            });
        });
    },

    "UVINDEX": function () {
        printDebugInformation("defaultHandler:UVINDEX");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
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
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var visibility = Math.round(data.currently.visibility);

                    _alexa.emit(":tell", "Right now, the visibility is " + visibility + " mi." + getWeatherAlerts(data));
                });
            });
        });
    },

    "ALERTS": function () {
        printDebugInformation("defaultHandler:ALERTS");

        var _alexa = this;

        getDeviceAddress(_alexa, function (address) {
            getGeocodeResult(_alexa, address, function (latitude, longitude, offset) {
                getForecast(_alexa, latitude, longitude, function (data) {
                    var alerts = "";
                    if (data.alerts != null) {
                        for (var i = 0; i < data.alerts.length; i++) {
                            var alert = data.alerts[i];

                            if (alert.expires) {
                                alerts += " A " + alert.title + " is in effect for your area until " + Moment(alert.expires * 1000).calendar() + ".";
                            }
                            else {
                                alerts += " A " + alert.title + " is in effect for your area.";
                            }

                            alerts += " " + alert.description.replace("\\n", " ");
                        }
                    }

                    if (alerts == "") {
                        alerts += "There are no weather alerts in effect for your area at this time.";
                    }

                    _alexa.emit(":tell", alerts);
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
    var context = _alexa.event.context;

    if (!context) {
        _alexa.emit(":tell", "There was a problem accessing device permissions. Please try again later.");

        return;
    }

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
                    _alexa.attributes['OFFSET'] = null;
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

function getGeocodeResult(_alexa, address, callback) {
    if (_alexa.attributes['LATITUDE'] &&
        _alexa.attributes['LONGITUDE'] &&
        _alexa.attributes['OFFSET']) {
        callback(_alexa.attributes['LATITUDE'], _alexa.attributes['LONGITUDE'], _alexa.attributes['OFFSET']);
    }
    else {
        Request.get({
            uri: "https://maps.googleapis.com/maps/api/geocode/json",
            gzip: true,
            qs: {
                sensor: false,
                address: address
            }
        }, function (err, response, body) {
            if (err) {
                printDebugInformation("ERROR: getGeocodeResult()");
                printDebugInformation(err);

                _alexa.emit(":tell", "There was a problem locating your address. Please try again later.");
            }

            var data = JSON.parse(body);

            var latitude = data.results[0].geometry.location.lat;
            var longitude = data.results[0].geometry.location.lng;

            getTimezoneResult(_alexa, latitude, longitude, function (offset) {
                _alexa.attributes['LATITUDE'] = latitude;
                _alexa.attributes['LONGITUDE'] = longitude;
                _alexa.attributes['OFFSET'] = offset;

                callback(latitude, longitude, offset);
            });
        });
    }
}

function getTimezoneResult(_alexa, latitude, longitude, callback) {
    Request.get({
        uri: "https://maps.googleapis.com/maps/api/timezone/json",
        gzip: true,
        qs: {
            location: latitude + "," + longitude,
            timestamp: Moment().unix()
        }
    }, function (err, response, body) {
        if (err) {
            printDebugInformation("ERROR: getTimezoneResult()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem detecting your timezone. Please try again later.");
        }

        var data = JSON.parse(body);

        var offset = data.rawOffset;

        callback(offset);
    });
}

function getForecast(_alexa, latitude, longitude, callback) {
    Request.get({
        uri: "https://api.darksky.net/forecast/" + process.env.DARKSKY_API_KEY + "/" + latitude + "," + longitude + "/?solar=1",
        gzip: true
    }, function (err, response, body) {
        if (err) {
            printDebugInformation("ERROR: getForecast()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem retrieving your forecast. Please try again later.");
        }

        var data = JSON.parse(body);

        callback(data);
    });
}

function getForecastAtTime(_alexa, latitude, longitude, timestamp, callback) {
    Request.get({
        uri: "https://api.darksky.net/forecast/" + process.env.DARKSKY_API_KEY + "/" + latitude + "," + longitude + "," + timestamp + "/?solar=1",
        gzip: true
    }, function (err, response, body) {
        if (err) {
            printDebugInformation("ERROR: getForecastAtTime()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem retrieving your forecast. Please try again later.");
        }

        var data = JSON.parse(body);

        callback(data);
    });
}

function getWeatherAlerts(data) {
    var alerts = "";
    if (data.alerts != null) {
        for (var i = 0; i < data.alerts.length; i++) {
            var alert = data.alerts[i];

            if (alert.expires) {
                alerts += " A " + alert.title + " is in effect for your area until " + Moment(alert.expires * 1000).calendar() + ".";
            }
            else {
                alerts += " A " + alert.title + " is in effect for your area.";
            }
        }
    }

    alerts += " If you'd like to know more, just ask me for your weather alerts."

    return alerts;
}

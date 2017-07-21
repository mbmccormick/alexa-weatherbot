var Alexa = require("alexa-sdk");
var Request = require("request");
var Moment = require("moment-timezone");
var Windrose = require("windrose");

var alexa;

exports.handler = function (event, context, callback) {
    if (event.source == "aws.events") {
        printDebugInformation("Received keep alive request from " + event.resources[0] + ".");

        return callback(null, "Success");
    }

    alexa = Alexa.handler(event, context);
    alexa.appId = process.env.DEBUG ? alexa.appId : "amzn1.ask.skill.45bd54a7-8512-438a-8191-ca2407990891";
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

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;
                    var hourly_summary = data.hourly.summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    _alexa.emit(":tell", "Welcome to Weatherbot! Right now in " + location + ", it's " + temperature + " degrees and " + currently_summary + ". Today, the forecast is " + hourly_summary + ", with a high of " + high + " degrees and a low of " + low + " degrees." + getWeatherAlerts(data));
                });
            });
        });
    },

    "FORECASTNOW": function () {
        printDebugInformation("defaultHandler:FORECASTNOW");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var summary = data.currently.summary;

                    _alexa.emit(":tell", "Right now in " + location + ", it's " + temperature + " degrees and " + summary + "." + getWeatherAlerts(data));
                });
            });
        });
    },

    "FORECASTDATE": function () {
        printDebugInformation("defaultHandler:FORECASTDATE");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var summary = data.daily.data[0].summary;
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var low = Math.round(data.daily.data[0].temperatureMin);

                    if (difference == 0) {
                        _alexa.emit(":tell", "The forecast for Today in " + location + " is " + summary + " with a high of " + high + " degrees and a low of " + low + " degrees." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecast is " + summary + " with a high of " + high + " degrees and a low of " + low + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the weather was " + summary + " with a high of " + high + " degrees and a low of " + low + " degrees.");
                    }
                });
            });
        });
    },

    "FORECASTDATETIME": function () {
        printDebugInformation("defaultHandler:FORECASTDATETIME");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var summary = data.currently.summary;

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", it's " + temperature + " degrees and " + summary + "." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecast is " + temperature + " degrees and " + summary + ".");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the weather was " + temperature + " degrees and " + summary + ".");
                    }
                });
            });
        });
    },

    "FORECASTWEEK": function () {
        printDebugInformation("defaultHandler:FORECASTWEEK");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var summary = data.daily.summary;

                    summary = summary.replace("°F", " degrees");
                    summary = summary.replace("°C", " degrees");

                    if (difference == 0) {
                        _alexa.emit(":tell", "In " + location + ", " + summary + "." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", "Sorry, weekly forecasts are not available for past dates or times.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", "Sorry, weekly forecasts are not available for past dates or times.");
                    }
                });
            });
        });
    },

    "TEMPERATURE": function () {
        printDebugInformation("defaultHandler:TEMPERATURE");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", the temperature is " + temperature + " degrees." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted temperature is " + temperature + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the temperature was " + temperature + " degrees.");
                    }
                });
            });
        });
    },

    "HIGH": function () {
        printDebugInformation("defaultHandler:HIGH");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var high = Math.round(data.daily.data[0].temperatureMax);
                    var timestamp = Moment.unix(data.daily.data[0].temperatureMaxTime).tz(timezone);

                    var difference = timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.emit(":tell", "The forecast for Today in " + location + " has a high of " + high + " degrees." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted high is " + high + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the high was " + high + " degrees.");
                    }
                });
            });
        });
    },

    "LOW": function () {
        printDebugInformation("defaultHandler:LOW");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var low = Math.round(data.daily.data[0].temperatureMin);
                    var timestamp = Moment.unix(data.daily.data[0].temperatureMinTime).tz(timezone);

                    var difference = timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.emit(":tell", "The forecast for Today in " + location + " has a low of " + low + " degrees." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted low is " + low + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the low was " + low + " degrees.");
                    }
                });
            });
        });
    },

    "PRECIPITATION": function () {
        printDebugInformation("defaultHandler:PRECIPITATION");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var probability = Math.round(data.currently.precipProbability * 100);
                    var type = data.currently.precipType ? data.currently.precipType : "precipitation";

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", there's a " + probability + "% chance of " + type + "." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", there's a " + probability + "% chance of " + type + ".");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", there was a " + probability + "% chance of " + type + ".");
                    }
                });
            });
        });
    },

    "WIND": function () {
        printDebugInformation("defaultHandler:WIND");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var speed = Math.round(data.currently.windSpeed);
                    var direction = Windrose.getPoint(data.currently.windBearing, { depth: 1 }).name;

                    var units = "miles per hour";

                    if (data.flags.units == "ca") {
                        units = "kilometers per hour";
                    }
                    else if (data.flags.units == "uk2") {
                        units = "miles per hour";
                    }
                    else if (data.flags.units == "si") {
                        units = "meters per second";
                    }

                    if (difference == 0) {
                        if (speed > 0) {
                            _alexa.emit(":tell", "Right now in " + location + ", there's a " + speed + " " + units + " wind out of the " + direction + "." + getWeatherAlerts(data));
                        }
                        else {
                            _alexa.emit(":tell", "Right now in " + location + ", there's no wind." + getWeatherAlerts(data));
                        }
                    }
                    else if (difference > 0) {
                        if (speed > 0) {
                            _alexa.emit(":tell", calendarTime + " in " + location + ", there's a forecasted " + speed + " " + units + " wind out of the " + direction + ".");
                        }
                        else {
                            _alexa.emit(":tell", calendarTime + " in " + location + ", there's no wind forecasted.");
                        }
                    }
                    else if (difference < 0) {
                        if (speed > 0) {
                            _alexa.emit(":tell", calendarTime + " in " + location + ", there was a " + speed + " " + units + " wind out of the " + direction + ".");
                        }
                        else {
                            _alexa.emit(":tell", calendarTime + " in " + location + ", there was no wind.");
                        }
                    }
                });
            });
        });
    },

    "HUMIDITY": function () {
        printDebugInformation("defaultHandler:HUMIDITY");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var humidity = Math.round(data.currently.humidity * 100);

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", the humidity is " + humidity + "%." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted humidity is " + humidity + "%.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the humidity was " + humidity + "%.");
                    }
                });
            });
        });
    },

    "DEWPOINT": function () {
        printDebugInformation("defaultHandler:DEWPOINT");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var dewPoint = Math.round(data.currently.dewPoint);

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", the dew point is " + dewPoint + " degrees." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted dew point is " + dewPoint + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the dew point was " + dewPoint + " degrees.");
                    }
                });
            });
        });
    },

    "UVINDEX": function () {
        printDebugInformation("defaultHandler:UVINDEX");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var uvIndex = data.currently.uvIndex;

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", the UV index is " + uvIndex + "." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted UV index is " + uvIndex + ".");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the UV index was " + uvIndex + ".");
                    }
                });
            });
        });
    },

    "VISIBILITY": function () {
        printDebugInformation("defaultHandler:VISIBILITY");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var visibility = Math.round(data.currently.visibility);

                    var units = "miles";

                    if (data.flags.units == "ca") {
                        units = "kilometers";
                    }
                    else if (data.flags.units == "uk2") {
                        units = "miles";
                    }
                    else if (data.flags.units == "si") {
                        units = "kilometers";
                    }

                    if (difference == 0) {
                        _alexa.emit(":tell", "Right now in " + location + ", the visibility is " + visibility + " " + units + "." + getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the forecasted visibility is " + visibility + " " + units + ".");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", calendarTime + " in " + location + ", the visibility was " + visibility + " " + units + ".");
                    }
                });
            });
        });
    },

    "ALERTS": function () {
        printDebugInformation("defaultHandler:ALERTS");

        var _alexa = this;

        getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var response = "";

                    if (data.alerts != null) {
                        for (var i = 0; i < data.alerts.length; i++) {
                            var alert = data.alerts[i];

                            var title = alert.title;
                            var description = alert.description;

                            description = description.replace(/\n/g, " ");

                            if (alert.expires) {
                                var expires = Moment.unix(alert.expires).tz(timezone);

                                response += " A " + title + " is in effect for the " + location + " area until " + expires.calendar() + ". " + description;
                            }
                            else {
                                response += " A " + title + " is in effect for the " + location + " area. " + description;
                            }
                        }
                    }
                    else {
                        response = "There are no weather alerts in effect for the " + location + " area at this time.";
                    }

                    if (difference == 0) {
                        _alexa.emit(":tell", response);
                    }
                    else if (difference > 0) {
                        _alexa.emit(":tell", "Sorry, weather alerts are not available for future dates or times.");
                    }
                    else if (difference < 0) {
                        _alexa.emit(":tell", "Sorry, weather alerts are not available for past dates or times.");
                    }
                });
            });
        });
    },

    "AMAZON.HelpIntent": function () {
        printDebugInformation("defaultHandler:AMAZON.HelpIntent");

        this.emit(":tell", "You can ask for things like the current forecast, today's forecast, this week's forecast, temperature, high, low, precipitation, wind, humidity, dew point, UV index, visibility, and weather alerts. You can ask for these things for a specific date, time, or location. For example, try asking for \"the UV index on Saturday at 3:00 PM in Seattle\".");
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

function getRequestedLocation(_alexa, callback) {
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

function getRequestedDateTime(_alexa, timezone, callback) {
    var now = Moment().tz(timezone);
    var dateTime = null;

    if (_alexa.event.request.intent &&
        _alexa.event.request.intent.slots &&
        _alexa.event.request.intent.slots.Date.value) {
        var input = _alexa.event.request.intent.slots.Date.value;

        var parse = Moment.tz(input, timezone);

        dateTime = parse;
    }

    if (_alexa.event.request.intent &&
        _alexa.event.request.intent.slots &&
        _alexa.event.request.intent.slots.Time.value) {
        var input = _alexa.event.request.intent.slots.Time.value;

        var parse = Moment.tz(input, "h:mm", timezone);

        if (dateTime) {
            dateTime.set({
                "hour": parse.hour(),
                "minute": parse.minute(),
                "second": 0
            });
        }
        else {
            dateTime = parse;
        }

        if (_alexa.event.request.intent === undefined ||
            _alexa.event.request.intent.slots === undefined ||
            _alexa.event.request.intent.slots.Date.value === undefined) {
            if (((dateTime.hours() * 60) + dateTime.minutes()) < ((now.hours() * 60) + now.minutes())) {
                dateTime.add(1, "days");
            }
        }
    }

    if (dateTime == null) {
        dateTime = now;
    }

    var calendarOptions = null;

    if (_alexa.event.request.intent &&
        _alexa.event.request.intent.slots &&
        _alexa.event.request.intent.slots.Time.value) {
        calendarOptions = {
            sameDay: "[Today] [at] h:mma",
            nextDay: "[Tomorrow] [at] h:mma",
            nextWeek: "dddd [at] h:mma",
            lastDay: "[Yesterday] [at] h:mma",
            lastWeek: "[Last] dddd [at] h:mma",
            sameElse: "[On] MMMM Do, YYYY [at] h:mma"
        };
    }
    else {
        calendarOptions = {
            sameDay: "[Today]",
            nextDay: "[Tomorrow]",
            nextWeek: "dddd",
            lastDay: "[Yesterday]",
            lastWeek: "[Last] dddd",
            sameElse: "[On] MMMM Do, YYYY"
        };
    }

    var calendarTime = dateTime.calendar(now, calendarOptions);

    var difference = Math.floor((dateTime.unix() - now.unix()) / 60 / 60);

    var timestamp = dateTime.unix();

    callback(timestamp, difference, calendarTime);
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
                var address = "";
                if (addressResponse.address["addressLine1"] &&
                    addressResponse.address["stateOrRegion"]) {
                    address = addressResponse.address["addressLine1"] + ", " + addressResponse.address["stateOrRegion"] + " " + addressResponse.address["postalCode"];
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

function getGeocodeResult(_alexa, address, cache, callback) {
    var url = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=" + encodeURI(address);

    Request.get({
        uri: url,
        gzip: true
    }, function (err, response, body) {
        printDebugInformation(url);

        if (err) {
            printDebugInformation("ERROR: getGeocodeResult()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem locating your address. Please try again later.");
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
    var url = "https://maps.googleapis.com/maps/api/timezone/json?location=" + latitude + "," + longitude + "&timestamp=" + Moment().unix();

    Request.get({
        uri: url,
        gzip: true
    }, function (err, response, body) {
        printDebugInformation(url);

        if (err) {
            printDebugInformation("ERROR: getTimezoneResult()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem detecting your timezone. Please try again later.");
        }

        var data = JSON.parse(body);

        var timezone = data.timeZoneId;

        callback(timezone);
    });
}

function getForecast(_alexa, latitude, longitude, timestamp, callback) {
    var url = "https://api.darksky.net/forecast/" + process.env.DARKSKY_API_KEY + "/" + latitude + "," + longitude + (timestamp != null && isNaN(timestamp) == false ? "," + timestamp : "") + "/?units=auto&solar=1";

    Request.get({
        uri: url,
        gzip: true
    }, function (err, response, body) {
        printDebugInformation(url);

        if (err) {
            printDebugInformation("ERROR: getForecast()");
            printDebugInformation(err);

            _alexa.emit(":tell", "There was a problem retrieving your forecast. Please try again later.");
        }

        var data = JSON.parse(body);

        callback(data);
    });
}

function getWeatherAlerts(data) {
    if (data.alerts != null) {
        var response = "";

        for (var i = 0; i < data.alerts.length; i++) {
            var alert = data.alerts[i];

            var title = alert.title;

            response += " A " + title + " is in effect for the area.";
        }

        return response + " If you'd like to know more, just ask me for your weather alerts.";
    }
    else {
        return "";
    }
}

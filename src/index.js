var Alexa = require("alexa-sdk");
var Moment = require("moment-timezone");
var Windrose = require("windrose");

var location = require("./location");
var datetime = require("./datetime");
var forecast = require("./forecast");

var alexa;

exports.handler = function (event, context, callback) {
    if (event.source == "aws.events") {
        printDebugInformation("Received keep alive request from " + event.resources[0] + ".");

        return callback(null, "Success");
    }

    alexa = Alexa.handler(event, context);
    alexa.appId = "amzn1.ask.skill.45bd54a7-8512-438a-8191-ca2407990891";
    alexa.dynamoDBTableName = "Weatherbot";

    alexa.registerHandlers(defaultHandler);

    alexa.execute();
};

var vowels = ['a', 'e', 'i', 'o', 'u', 'y'];

var defaultHandler = {

    "LaunchRequest": function () {
        printDebugInformation("defaultHandler:LaunchRequest");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getCurrentForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    _alexa.response.speak("Welcome to Weatherbot! Right now in " + location + ", it's " + data.temperature + " degrees and " + data.currently_summary.toLowerCase() + ". " + data.minutely_summary + data.precipitation + " The forecast for the next 24 hours is " + data.hourly_summary.toLowerCase().replace(/.$/,"") + ", with a high of " + data.high + " degrees and a low of " + data.low + " degrees." + data.alerts);
                   
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle("Right Now in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + data.temperature + "° " + data.currently_summary + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + data.minutely_summary + " " + data.precipitation + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + "The forecast for the next 24 hours is " + data.hourly_summary.toLowerCase().replace(/.$/,"") + ", with a high of " + data.high + " degrees and a low of " + data.low + " degrees." + "</font>"
                            ))
                            .build();
                        
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "FORECASTNOW": function () {
        printDebugInformation("defaultHandler:FORECASTNOW");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getCurrentForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    _alexa.response.speak("Right now in " + location + ", it's " + data.temperature + " degrees and " + data.currently_summary.toLowerCase() + ". " + data.minutely_summary + data.precipitation + data.alerts);
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle("Right Now in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + data.temperature + "° " + data.currently_summary + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + data.minutely_summary + " " + data.precipitation + "</font>"
                            ))
                            .build();
                        
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "FORECASTDATE": function () {
        printDebugInformation("defaultHandler:FORECASTDATE");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getDateForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " is " + data.summary.toLowerCase().replace(/.$/,"") + ", with a high of " + data.high + " degrees and a low of " + data.low + " degrees." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecast is " + data.summary.toLowerCase().replace(/.$/,"") + ", with a high of " + data.high + " degrees and a low of " + data.low + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the weather was " + data.summary.toLowerCase().replace(/.$/,"") + ", with a high of " + data.high + " degrees and a low of " + data.low + " degrees.");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + data.high + "° / " + data.low + "°</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + data.summary + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "FORECASTDATETIME": function () {
        printDebugInformation("defaultHandler:FORECASTDATETIME");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getDateTimeForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", it's " + data.temperature + " degrees and " + data.summary + "." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecast is " + data.temperature + " degrees and " + data.summary + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the weather was " + data.temperature + " degrees and " + data.summary + ".");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>" + data.temperature + "° " + data.summary + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "FORECASTWEEK": function () {
        printDebugInformation("defaultHandler:FORECASTWEEK");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getWeekForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("In " + location + ", " + data.summary.toLowerCase() + data.alerts);
                        
                        if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                            var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                            
                            var template = builder.setTitle("This Week in " + location)
                                .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                    "<font size='5'>" + data.summary + "</font>"
                                ))
                                .build();
                        
                            _alexa.response.renderTemplate(template);
                        }
                    }
                    else if (difference > 0) {
                        _alexa.response.speak("Sorry, weekly forecasts are not available for past dates or times.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak("Sorry, weekly forecasts are not available for past dates or times.");
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "TEMPERATURE": function () {
        printDebugInformation("defaultHandler:TEMPERATURE");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getTemperature(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the temperature is " + data.temperature + " degrees." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted temperature is " + data.temperature + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the temperature was " + data.temperature + " degrees.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Temperature: " + data.temperature + "°" + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "HIGH": function () {
        printDebugInformation("defaultHandler:HIGH");

        // time is irrelevant for high forecasts
        this.event.request.intent.slots.Time.value = null;

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getHigh(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var difference = data.timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " has a high of " + data.high + " degrees at " + data.timestamp.format("h:mma") + "." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted high is " + data.high + " degrees at " + data.timestamp.format("h:mma") + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the high was " + data.high + " degrees at " + data.timestamp.format("h:mma") + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>High: " + data.high + "°" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.timestamp.format("h:mma") + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "LOW": function () {
        printDebugInformation("defaultHandler:LOW");

        // time is irrelevant for low forecasts
        this.event.request.intent.slots.Time.value = null;

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getLow(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var difference = data.timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " has a low of " + data.low + " degrees at " + data.timestamp.format("h:mma") + "." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted low is " + data.low + " degrees at " + data.timestamp.format("h:mma") + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the low was " + data.low + " degrees at " + data.timestamp.format("h:mma") + ".");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Low: " + data.low + "°" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.timestamp.format("h:mma") + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "PRECIPITATION": function () {
        printDebugInformation("defaultHandler:PRECIPITATION");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getPrecipitation(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", there's a " + data.probability + "% chance of " + data.type + "." + data.precipitation + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", there's a " + data.probability + "% chance of " + data.type + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", there was a " + data.probability + "% chance of " + data.type + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Precipitation: " + data.probability + "%" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.type + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "WIND": function () {
        printDebugInformation("defaultHandler:WIND");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getWind(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        if (data.speed > 0) {
                            _alexa.response.speak("Right now in " + location + ", there's a " + data.speed + " " + data.units + " wind out of the " + data.direction + "." + data.alerts);
                        }
                        else {
                            _alexa.response.speak("Right now in " + location + ", there's no wind." + data.alerts);
                        }
                    }
                    else if (difference > 0) {
                        if (data.speed > 0) {
                            _alexa.response.speak(calendarTime + " in " + location + ", there's a forecasted " + data.speed + " " + data.units + " wind out of the " + data.direction + ".");
                        }
                        else {
                            _alexa.response.speak(calendarTime + " in " + location + ", there's no wind forecasted.");
                        }
                    }
                    else if (difference < 0) {
                        if (data.speed > 0) {
                            _alexa.response.speak(calendarTime + " in " + location + ", there was a " + data.speed + " " + data.units + " wind out of the " + data.direction + ".");
                        }
                        else {
                            _alexa.response.speak(calendarTime + " in " + location + ", there was no wind.");
                        }
                    }                   
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Wind: " + data.speed + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.units + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.direction + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "HUMIDITY": function () {
        printDebugInformation("defaultHandler:HUMIDITY");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getHumidity(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the humidity is " + data.humidity + "%." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted humidity is " + data.humidity + "%.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the humidity was " + data.humidity + "%.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Humidity: " + data.humidity + "%" + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "DEWPOINT": function () {
        printDebugInformation("defaultHandler:DEWPOINT");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getDewPoint(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the dew point is " + data.dewPoint + " degrees." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted dew point is " + data.dewPoint + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the dew point was " + data.dewPoint + " degrees.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Dew Point: " + data.dewPoint + "°" + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "UVINDEX": function () {
        printDebugInformation("defaultHandler:UVINDEX");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getUvIndex(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the UV index is " + data.uvIndex + "." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted UV index is " + data.uvIndex + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the UV index was " + data.uvIndex + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>UV Index: " + data.uvIndex + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "VISIBILITY": function () {
        printDebugInformation("defaultHandler:VISIBILITY");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getVisibility(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the visibility is " + data.visibility + " " + data.units + "." + data.alerts);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted visibility is " + data.visibility + " " + data.units + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the visibility was " + data.visibility + " " + data.units + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Visibility: " + data.visibility + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + data.units + "</font>"
                            ))
                            .build();
                    
                        _alexa.response.renderTemplate(template);
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "ALERTS": function () {
        printDebugInformation("defaultHandler:ALERTS");

        var _alexa = this;

        location.getRequestedLocation(_alexa, function (latitude, longitude, location, timezone) {
            datetime.getRequestedDateTime(_alexa, timezone, function (timestamp, difference, calendarTime) {
                forecast.getAlerts(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var response = "";

                    if (data.alerts != null) {
                        for (var i = 0; i < data.alerts.length; i++) {
                            var alert = data.alerts[i];

                            var title = alert.title;
                            var description = alert.description;

                            description = description.replace(/\n/g, " ");

                            var prefix = "A";
                            if (vowels.indexOf(title[0].toLowerCase()) > -1) {
                                prefix = "An";
                            }

                            if (alert.expires) {
                                var expires = Moment.unix(alert.expires).tz(timezone);

                                response += " " + prefix + " " + title + " is in effect for the " + location + " area until " + expires.calendar() + ". " + description;
                            }
                            else {
                                response += " " + prefix + " " + title + " is in effect for the " + location + " area. " + description;
                            }
                        }
                    }
                    else {
                        response = "There are no weather alerts in effect for the " + location + " area at this time.";
                    }

                    if (difference == 0) {
                        _alexa.response.speak(response);
                    }
                    else if (difference > 0) {
                        _alexa.response.speak("Sorry, weather alerts are not available for future dates or times.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak("Sorry, weather alerts are not available for past dates or times.");
                    }

                    _alexa.emit(":responseReady");
                });
            });
        });
    },

    "AMAZON.HelpIntent": function () {
        printDebugInformation("defaultHandler:AMAZON.HelpIntent");

        var _alexa = this;
        
        _alexa.response.speak("You can ask for things like the current forecast, today's forecast, this week's forecast, temperature, high, low, precipitation, wind, humidity, dew point, UV index, visibility, and weather alerts. You can ask for these things for a specific date, time, or location. For example, try asking for \"the UV index on Saturday at 3:00 PM in Seattle\".");
        
        _alexa.emit(":responseReady");
    },

    "Unhandled": function () {
        printDebugInformation("defaultHandler:Unhandled");

        var _alexa = this;
        
        _alexa.response.speak("Sorry, I didn't understand that. You can ask for things like the current forecast, today's forecast, this week's forecast, temperature, high, low, precipitation, wind, humidity, dew point, UV index, visibility, and weather alerts. You can ask for these things for a specific date, time, or location. For example, try asking for \"the UV index on Saturday at 3:00 PM in Seattle\".");
        
        _alexa.emit(":responseReady");
    }

};

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}
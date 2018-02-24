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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;
                    var minutely_summary = data.minutely.summary;

                    var hourly_summary = data.hourly.summary.toLowerCase().replace(/.$/,"");
                    var high = timestamp <= data.daily.data[0].temperatureHighTime ? Math.round(data.daily.data[0].temperatureHigh) : Math.round(data.daily.data[1].temperatureHigh);
                    var low = timestamp <= data.daily.data[0].temperatureLowTime ? Math.round(data.daily.data[0].temperatureLow) : Math.round(data.daily.data[1].temperatureLow);
                    
                    _alexa.response.speak("Welcome to Weatherbot! Right now in " + location + ", it's " + temperature + " degrees and " + currently_summary.toLowerCase() + ". " + minutely_summary + forecast.getPrecipitation(data) + " The forecast for the next 24 hours is " + hourly_summary + ", with a high of " + high + " degrees and a low of " + low + " degrees." + forecast.getWeatherAlerts(data));
                   
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle("Right Now in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + temperature + "° " + currently_summary + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + minutely_summary + " " + forecast.getPrecipitation(data) + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + "The forecast for the next 24 hours is " + hourly_summary + ", with a high of " + high + " degrees and a low of " + low + " degrees." + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var currently_summary = data.currently.summary;
                    var minutely_summary = data.minutely.summary;

                    _alexa.response.speak("Right now in " + location + ", it's " + temperature + " degrees and " + currently_summary.toLowerCase() + ". " + minutely_summary + forecast.getPrecipitation(data) + forecast.getWeatherAlerts(data));
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle("Right Now in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + temperature + "° " + currently_summary + "</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + minutely_summary + " " + forecast.getPrecipitation(data) + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var summary = data.daily.data[0].summary;
                    var high = Math.round(data.daily.data[0].temperatureHigh);
                    var low = Math.round(data.daily.data[0].temperatureLow);

                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " is " + summary.toLowerCase().replace(/.$/,"") + ", with a high of " + high + " degrees and a low of " + low + " degrees." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecast is " + summary.toLowerCase().replace(/.$/,"") + ", with a high of " + high + " degrees and a low of " + low + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the weather was " + summary.toLowerCase().replace(/.$/,"") + ", with a high of " + high + " degrees and a low of " + low + " degrees.");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='5'>" + high + "° / " + low + "°</font>" +
                                "<br/><br/>" +
                                "<font size='3'>" + summary + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);
                    var summary = data.currently.summary.toLowerCase();

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", it's " + temperature + " degrees and " + summary + "." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecast is " + temperature + " degrees and " + summary + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the weather was " + temperature + " degrees and " + summary + ".");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>" + temperature + "° " + summary + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var summary = data.daily.summary;

                    summary = summary.replace("°F", " degrees");
                    summary = summary.replace("°C", " degrees");

                    if (difference == 0) {
                        _alexa.response.speak("In " + location + ", " + summary.toLowerCase() + forecast.getWeatherAlerts(data));
                        
                        if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                            var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                            
                            var template = builder.setTitle("This Week in " + location)
                                .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                    "<font size='5'>" + summary + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var temperature = Math.round(data.currently.temperature);

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the temperature is " + temperature + " degrees." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted temperature is " + temperature + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the temperature was " + temperature + " degrees.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Temperature: " + temperature + "°" + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var high = Math.round(data.daily.data[0].temperatureHigh);
                    var timestamp = Moment.unix(data.daily.data[0].temperatureHighTime).tz(timezone);

                    var difference = timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " has a high of " + high + " degrees at " + timestamp.format("h:mma") + "." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted high is " + high + " degrees at " + timestamp.format("h:mma") + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the high was " + high + " degrees at " + timestamp.format("h:mma") + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>High: " + high + "°" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + timestamp.format("h:mma") + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var low = Math.round(data.daily.data[0].temperatureLow);
                    var timestamp = Moment.unix(data.daily.data[0].temperatureLowTime).tz(timezone);

                    var difference = timestamp.diff(Moment.tz(timezone), "hours");

                    if (difference == 0) {
                        _alexa.response.speak("The forecast for today in " + location + " has a low of " + low + " degrees at " + timestamp.format("h:mma") + "." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted low is " + low + " degrees at " + timestamp.format("h:mma") + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the low was " + low + " degrees at " + timestamp.format("h:mma") + ".");
                    }

                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Low: " + low + "°" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + timestamp.format("h:mma") + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var probability = Math.round(data.currently.precipProbability * 100);
                    var type = data.currently.precipType ? data.currently.precipType : "precipitation";

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", there's a " + probability + "% chance of " + type + "." + forecast.getPrecipitation(data) + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", there's a " + probability + "% chance of " + type + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", there was a " + probability + "% chance of " + type + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Precipitation: " + probability + "%" + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + type + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var speed = Math.round(data.currently.windSpeed);
                    var direction = Windrose.getPoint(data.currently.windBearing, { depth: 1 }).name.toLowerCase().replace(" ", "");

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
                            _alexa.response.speak("Right now in " + location + ", there's a " + speed + " " + units + " wind out of the " + direction + "." + forecast.getWeatherAlerts(data));
                        }
                        else {
                            _alexa.response.speak("Right now in " + location + ", there's no wind." + forecast.getWeatherAlerts(data));
                        }
                    }
                    else if (difference > 0) {
                        if (speed > 0) {
                            _alexa.response.speak(calendarTime + " in " + location + ", there's a forecasted " + speed + " " + units + " wind out of the " + direction + ".");
                        }
                        else {
                            _alexa.response.speak(calendarTime + " in " + location + ", there's no wind forecasted.");
                        }
                    }
                    else if (difference < 0) {
                        if (speed > 0) {
                            _alexa.response.speak(calendarTime + " in " + location + ", there was a " + speed + " " + units + " wind out of the " + direction + ".");
                        }
                        else {
                            _alexa.response.speak(calendarTime + " in " + location + ", there was no wind.");
                        }
                    }                   
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Wind: " + speed + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + units + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + direction + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var humidity = Math.round(data.currently.humidity * 100);

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the humidity is " + humidity + "%." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted humidity is " + humidity + "%.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the humidity was " + humidity + "%.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Humidity: " + humidity + "%" + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var dewPoint = Math.round(data.currently.dewPoint);

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the dew point is " + dewPoint + " degrees." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted dew point is " + dewPoint + " degrees.");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the dew point was " + dewPoint + " degrees.");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Dew Point: " + dewPoint + "°" + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
                    var uvIndex = data.currently.uvIndex;

                    if (difference == 0) {
                        _alexa.response.speak("Right now in " + location + ", the UV index is " + uvIndex + "." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted UV index is " + uvIndex + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the UV index was " + uvIndex + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>UV Index: " + uvIndex + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
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
                        _alexa.response.speak("Right now in " + location + ", the visibility is " + visibility + " " + units + "." + forecast.getWeatherAlerts(data));
                    }
                    else if (difference > 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the forecasted visibility is " + visibility + " " + units + ".");
                    }
                    else if (difference < 0) {
                        _alexa.response.speak(calendarTime + " in " + location + ", the visibility was " + visibility + " " + units + ".");
                    }
                    
                    if (_alexa.event.context.System.device.supportedInterfaces.Display) {
                        var builder = new Alexa.templateBuilders.BodyTemplate2Builder();
                        
                        var template = builder.setTitle(calendarTime + " in " + location)
                            .setTextContent(Alexa.utils.TextUtils.makeRichText(
                                "<font size='7'>Visibility: " + visibility + "</font>" +
                                "<br/>" +
                                "<font size='5'>" + units + "</font>"
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
                forecast.getForecast(_alexa, latitude, longitude, difference == 0 ? null : timestamp, function (data) {
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
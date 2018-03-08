var Request = require("request");
var Windrose = require("windrose");

exports.getCurrentForecast = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var temperature = Math.round(data.currently.temperature);

        var currently_summary = data.currently.summary;
        var minutely_summary = data.minutely.summary;
        var hourly_summary = data.hourly.summary;

        var high = timestamp <= data.daily.data[0].temperatureHighTime ? Math.round(data.daily.data[0].temperatureHigh) : Math.round(data.daily.data[1].temperatureHigh);
        var low = timestamp <= data.daily.data[0].temperatureLowTime ? Math.round(data.daily.data[0].temperatureLow) : Math.round(data.daily.data[1].temperatureLow);

        callback({
            temperature: temperature,
            currently_summary: currently_summary,
            minutely_summary: minutely_summary,
            hourly_summary: hourly_summary,
            high: high,
            low: low,
            precipitation: getNearestPrecipitation(data),
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getDateForecast = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var summary = data.daily.data[0].summary;
        var high = Math.round(data.daily.data[0].temperatureHigh);
        var low = Math.round(data.daily.data[0].temperatureLow);

        callback({
            summary: summary,
            high: high,
            low: low,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getDateTimeForecast = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var temperature = Math.round(data.currently.temperature);
        var summary = data.currently.summary.toLowerCase();

        callback({
            temperature: temperature,
            summary: summary,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getWeekForecast = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var summary = data.daily.summary;

        summary = summary.replace("°F", " degrees");
        summary = summary.replace("°C", " degrees");

        callback({
            summary: summary,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getTemperature = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var temperature = Math.round(data.currently.temperature);

        callback({
            temperature: temperature,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getHigh = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var high = Math.round(data.daily.data[0].temperatureHigh);
        var timestamp = Moment.unix(data.daily.data[0].temperatureHighTime).tz(timezone);

        callback({
            high: high,
            timestamp: timestamp,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getLow = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var low = Math.round(data.daily.data[0].temperatureLow);
        var timestamp = Moment.unix(data.daily.data[0].temperatureLowTime).tz(timezone);

        callback({
            low: low,
            timestamp: timestamp,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getPrecipitation = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var probability = Math.round(data.currently.precipProbability * 100);
        var type = data.currently.precipType ? data.currently.precipType : "precipitation";

        callback({
            probability: probability,
            type: type,
            precipitation: getNearestPrecipitation(data),
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getWind = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
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

        callback({
            speed: speed,
            direction: direction,
            units: units,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getHumidity = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var humidity = Math.round(data.currently.humidity * 100);

        callback({
            humidity: humidity,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getDewPoint = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var dewPoint = Math.round(data.currently.dewPoint);

        callback({
            dewPoint: dewPoint,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getUvIndex = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var uvIndex = data.currently.uvIndex;

        callback({
            uvIndex: uvIndex,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getVisibility = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
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

        callback({
            visibility: visibility,
            units: units,
            alerts: getWeatherAlerts(data)
        });
    });
}

exports.getAlerts = function(_alexa, latitude, longitude, timestamp, callback) {
    getForecast(_alexa, latitude, longitude, timestamp, function (data) {
        var alerts = data.alerts;

        callback({
            alerts: alerts
        });
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

            _alexa.response.speak("There was a problem retrieving your forecast. Please try again later.");
            
            _alexa.emit(":responseReady");
        }

        var data = JSON.parse(body);

        callback(data);
    });
}

function getNearestPrecipitation(data) {
    if (data.currently.nearestStormDistance > 0 &&
        data.currently.nearestStormDistance < 100) {
        var distance = data.currently.nearestStormDistance;
        var direction = Windrose.getPoint(data.currently.nearestStormBearing, { depth: 1 }).name.toLowerCase().replace(" ", "");

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
        
        return " Nearest precipitation is " + distance + " " + units + " to the " + direction + ".";
    }
    else {
        if (data.currently.precipIntensity > 0) {
            return "";
        }
        else {
            return " No precipitation anywhere in the area.";
        }
    }
}

function getWeatherAlerts(data) {
    if (data.alerts != null) {
        var response = "";

        if (data.alerts.length > 1) {
            response += " Weather alerts are in effect for this area.";
        }
        else {
            response += " A weather alert is in effect for this area.";
        }

        return response + " If you'd like to know more, just ask for your weather alerts.";
    }
    else {
        return "";
    }
}

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}

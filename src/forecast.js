var Request = require("request");
var Windrose = require("windrose");

exports.getForecast = function(_alexa, latitude, longitude, timestamp, callback) {
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

exports.getPrecipitation = function(data) {
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

exports.getWeatherAlerts = function(data) {
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
var Alexa = require("alexa-sdk");
var DarkSky = require('forecast.io');
var Geocoder = require('geocoder');

var alexa;

var states = {
    SETUPMODE: '_SETUPMODE',
    FORECASTMODE: '_FORECASTMODE'
};

exports.handler = function(event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.appId = 'amzn1.ask.skill.45bd54a7-8512-438a-8191-ca2407990891';
    alexa.dynamoDBTableName = 'Weatherbot';
    alexa.registerHandlers(newSessionHandler, setupHandler, askHandler);
    alexa.execute();
};

var newSessionHandler = {
    'LaunchRequest': function() {
        if (Object.keys(this.attributes).length === 0) {
            this.handler.state = states.SETUPMODE;
        } else {
            this.handler.state = states.FORECASTMODE;
        }

        this.emitWithState('LaunchRequest');
    },
    'Unhandled': function() {
        this.emit('LaunchRequest');
    }
};

var setupHandler = Alexa.CreateStateHandler(states.SETUPMODE, {
    'LaunchRequest': function() {
        this.emit(':ask', 'Welcome to Weatherbot! To get started, I need to know your address.', 'Please tell me your address.');
    },
    'ADDRESS': function() {
        var street = this.event.request.intent.slots.street.value;
        var city = this.event.request.intent.slots.city.value;
        
        var address = street + ', ' + city;

        // TODO: passing this.attributes should be unnecessary, but it does not seem to be accessible as alexa.attributes
        getGeocodeResult(this.attributes, address, function (attributes, err, data) {
            var formatted_address = data.formatted_address;
            var latitude = data.geometry.location.lat;
            var longitude = data.geometry.location.lng;

            attributes['FORMATTED_ADDRESS'] = formatted_address;
            attributes['LATITUDE'] = latitude;
            attributes['LONGITUDE'] = longitude;

            alexa.emit(':ask', 'The address I found is ' + formatted_address + '. Is that right?');
        });
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = states.FORECASTMODE;
        this.emit(':saveState', true);

        this.emit(':ask', 'Great! Now you can ask me for current conditions, temperature, chance of precipitation, or wind speed.', 'You can say current conditions, temperature, chance of precipitation, or wind speed.');
    },
    'AMAZON.NoIntent': function() {
        this.attributes['FORMATTED_ADDRESS'] = null;
        this.attributes['LATITUDE'] = null;
        this.attributes['LONGITUDE'] = null;

        this.emit(':ask', 'OK, let\'s try that again. Please tell me your address.');
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'To get started, I need to know your address.');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. To get started, I need to know your address.');
    }
});

var askHandler = Alexa.CreateStateHandler(states.FORECASTMODE, {
    'LaunchRequest': function() {
        this.emit(':ask', 'Welcome to Weatherbot! You can ask me for current conditions, temperature, chance of precipitation, or wind speed.', 'You can say current conditions, temperature, chance of precipitation, or wind speed.');
    },
    'CONDITIONS': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var conditions = data.minutely.summary;

            alexa.emit(':tell', 'Right now, there is ' + conditions + '.');
        });
    },
    'TEMPERATURE': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var temperature = Math.round(data.currently.temperature);

            alexa.emit(':tell', 'Right now, it\'s ' + temperature + ' degrees outside.');
        });
    },
    'PRECIPITATION': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var probability = Math.round(data.currently.precipProbability * 100);
            var type = data.currently.precipType;

            alexa.emit(':tell', 'Right now, there\'s a ' + probability + '% chance of ' + type + ' outside.');
        });
    },
    'WIND': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var wind = Math.round(data.currently.windSpeed);

            alexa.emit(':tell', 'Right now, there\'s a ' + wind + ' mph wind outside.');
        });
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':tell', 'You can ask me for current conditions, temperature, chance of precipitation, or wind speed.');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function() {
        this.emit(':tell', 'Sorry, I didn\'t catch that. You can ask me for current conditions, temperature, chance of precipitation, or wind speed.');
    }
});

function getGeocodeResult(attributes, query, callback) {
    Geocoder.geocode(query, function (err, data) {
        var result = data.results[0];

        callback(attributes, err, result);
    });
}

function getForecast(latitude, longitude, callback) {
    var options = {
        APIKey: process.env.DARKSKY_API_KEY,
        timeout: 1000
    };
    
    var darksky = new DarkSky(options);

    darksky.get(latitude, longitude, function (err, res, data) {
        callback(err, data);
    });
}

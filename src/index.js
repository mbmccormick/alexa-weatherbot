var Alexa = require("alexa-sdk");
var DarkSky = require('forecast.io');
var Geocoder = require('geocoder');

var alexa;

var states = {
    SETUPMODE: '_SETUPMODE',
    FORECASTMODE: '_FORECASTMODE',
    CHANGEADDRESSMODE: '_CHANGEADDRESSMODE'
};

exports.handler = function(event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.appId = 'amzn1.ask.skill.45bd54a7-8512-438a-8191-ca2407990891';
    alexa.dynamoDBTableName = 'Weatherbot';
    alexa.registerHandlers(newSessionHandler, setupHandler, askHandler, changeAddressHandler);
    alexa.execute();
};

var newSessionHandler = {
    'LaunchRequest': function() {
        if (Object.keys(this.attributes).length === 0) {
            this.handler.state = states.SETUPMODE;
        } else {
            this.handler.state = this.attributes['STATE'];
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
        var city = this.event.request.intent.slots.city ? this.event.request.intent.slots.city.value : undefined;
        var postal_code = this.event.request.intent.slots.postal_code ? this.event.request.intent.slots.postal_code.value : undefined;
        
        var address = street;

        if (city) {
            address += ', ' + city;
        }
        
        if (postal_code) {
            if (city) { 
                address += ' ' + postal_code;
            } else {
                address += ', ' + postal_code
            }
        }

        // TODO: passing this.attributes should be unnecessary, but it does not seem to be accessible as alexa.attributes
        getGeocodeResult(this.attributes, address, function (attributes, err, data) {
            if (data) {
                var formatted_address = data.formatted_address;
                var latitude = data.geometry.location.lat;
                var longitude = data.geometry.location.lng;

                attributes['FORMATTED_ADDRESS'] = formatted_address;
                attributes['LATITUDE'] = latitude;
                attributes['LONGITUDE'] = longitude;

                alexa.emit(':ask', 'The address I found is ' + formatted_address + '. Is that right?', 'Is that address right?');
            } else {
                alexa.emit(':ask', 'Hmm, I couldn\'t find the address that I heard. Please try again.', 'Please tell me your address.');
            }
        });
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = states.FORECASTMODE;
        this.emit(':saveState', true);

        this.emit(':ask', 'Great! Now you can ask me for current conditions, forecast, temperature, chance of precipitation, wind speed, or change address.', 'You can say current conditions, forecast, temperature, chance of precipitation, wind speed, or change address..');
    },
    'AMAZON.NoIntent': function() {
        this.attributes['FORMATTED_ADDRESS'] = null;
        this.attributes['LATITUDE'] = null;
        this.attributes['LONGITUDE'] = null;

        this.emit(':ask', 'OK, let\'s try that again. Please tell me your address.', 'Please tell me your address.');
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'To get started, I need to know your address.');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. To get started, I need to know your address.', 'Please tell me your address.');
    }
});

var askHandler = Alexa.CreateStateHandler(states.FORECASTMODE, {
    'LaunchRequest': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var minutely_summary = data.minutely.summary;
            var hourly_summary = data.hourly.summary;
            var high = Math.round(data.daily.data[0].temperatureMax);
            var low = Math.round(data.daily.data[0].temperatureMin);

            alexa.emit(':tell', 'Welcome to Weatherbot! Right now, there is ' + minutely_summary + '. Today, you can expect ' + hourly_summary + ' with a high of ' + high + ' degrees and a low of ' + low + ' degrees.');
        });
    },
    'CHANGE_ADDRESS': function() {
        var formatted_address = this.attributes['FORMATTED_ADDRESS'];

        this.emit(':ask', 'The address that I have for you is ' + formatted_address + '. Would you like to change it?', 'Would you like to change your address?');
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = states.CHANGEADDRESSMODE;
        this.emit(':saveState', true);

        this.emit(':ask', 'OK, please tell me your new address.', 'Please tell me your new address.');
    },
    'AMAZON.NoIntent': function() {
        this.emit(':tell', 'OK.');
    },
    'CONDITIONS': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var conditions = data.minutely.summary;

            alexa.emit(':tell', 'Right now, there is ' + conditions + '.');
        });
    },
    'FORECAST': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var forecast = data.daily.summary;
            forecast = forecast.replace('°F', ' degrees');
            forecast = forecast.replace('°C', ' degrees');

            alexa.emit(':tell', 'You can expect ' + forecast + '.');
        });
    },
    'TEMPERATURE': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var temperature = Math.round(data.currently.temperature);

            alexa.emit(':tell', 'Right now, it\'s ' + temperature + ' degrees.');
        });
    },
    'PRECIPITATION': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var probability = Math.round(data.currently.precipProbability * 100);
            var type = data.currently.precipType ? data.currently.precipType : 'precipitation';

            alexa.emit(':tell', 'Right now, there\'s a ' + probability + '% chance of ' + type + '.');
        });
    },
    'WIND': function() {
        getForecast(this.attributes['LATITUDE'], this.attributes['LONGITUDE'], function (err, data) {
            var wind = Math.round(data.currently.windSpeed);

            alexa.emit(':tell', 'Right now, there\'s a ' + wind + ' mph wind.');
        });
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'You can say current conditions, forecast, temperature, chance of precipitation, wind speed, or change address..', 'You can say current conditions, forecast, temperature, chance of precipitation, wind speed, or change address..');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function() {
        this.emit(':tell', 'Sorry, I didn\'t catch that. You can say current conditions, forecast, temperature, chance of precipitation, wind speed, or change address..', 'You can say current conditions, forecast, temperature, chance of precipitation, wind speed, or change address..');
    }
});

var changeAddressHandler = Alexa.CreateStateHandler(states.CHANGEADDRESSMODE, {
    'LaunchRequest': function() {
        this.emit(':ask', 'Welcome to Weatherbot! You previously asked me to change your address, but we never finished the update. Please tell me your new address.', 'Please tell me your new address.');
    },
    'ADDRESS': function() {
        var street = this.event.request.intent.slots.street.value;
        var city = this.event.request.intent.slots.city ? this.event.request.intent.slots.city.value : undefined;
        var postal_code = this.event.request.intent.slots.postal_code ? this.event.request.intent.slots.postal_code.value : undefined;
        
        var address = street;

        if (city) {
            address += ', ' + city;
        }
        
        if (postal_code) {
            if (city) { 
                address += ' ' + postal_code;
            } else {
                address += ', ' + postal_code
            }
        }

        // TODO: passing this.attributes should be unnecessary, but it does not seem to be accessible as alexa.attributes
        getGeocodeResult(this.attributes, address, function (attributes, err, data) {
            if (data) {
                var formatted_address = data.formatted_address;
                var latitude = data.geometry.location.lat;
                var longitude = data.geometry.location.lng;

                attributes['FORMATTED_ADDRESS'] = formatted_address;
                attributes['LATITUDE'] = latitude;
                attributes['LONGITUDE'] = longitude;

                alexa.emit(':ask', 'The address I found is ' + formatted_address + '. Is that right?', 'Is that address right?');
            } else {
                alexa.emit(':ask', 'Hmm, I couldn\'t find the address that I heard. Please try again.', 'Please tell me your address.');
            }
        });
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = states.FORECASTMODE;
        this.emit(':saveState', true);

        this.emit(':tell', 'Great! I have updated your address.');
    },
    'AMAZON.NoIntent': function() {
        this.attributes['FORMATTED_ADDRESS'] = null;
        this.attributes['LATITUDE'] = null;
        this.attributes['LONGITUDE'] = null;

        this.emit(':ask', 'OK, let\'s try that again. Please tell me your new address.', 'Please tell me your new address.');
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'Please tell me your new address or say cancel.');
    },
    'AMAZON.CancelIntent': function() {
        this.handler.state = states.FORECASTMODE;
        this.emit(':saveState', true);

        this.emit(':tell', 'OK, cancelling. Your address has not been changed.');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. Please tell me your new address.', 'Please tell me your new address.');
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

var Moment = require("moment-timezone");

exports.getRequestedDateTime = function(_alexa, timezone, callback) {
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
                dateTime.add(12, "hours");
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

function printDebugInformation(message) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}
var express = require('express');
var path = require('path');
var app = express();

// ----------------------------------------------------------------------------
// Misc. helper functions and variables.
var monthArr = ['January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'];
var daysInMonthArr = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var daysInMonthLeapArr = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var secs_in_day = 24*60*60;
var secs_in_year = 365*secs_in_day;
var secs_in_leap_year = 366*secs_in_day;

function getMonthNumber (monthString) {
    return monthArr.indexOf(monthString);
}

function getMonthString (monthNumber) {
    return monthArr[monthNumber];
}

function getDaysInMonth (monthCode) {
    return daysInMonthArr[monthCode];
}

function getDaysInMonthLeap (monthCode) {
    return daysInMonthLeapArr[monthCode];
}

function isLeapYear (year) {
    return year % 4 === 0;
}

// ----------------------------------------------------------------------------
// Conversion functions: UNIX to natural date, and conversely.
// Note: natural dates are given as arrays of strings: [day, month, year].
function unixToNatural(unix) {
    unix -= unix % secs_in_day;
    var days = unix / secs_in_day;
    var fourYearBlocks = Math.floor(days / (365*3 + 366));
    var daysToCount = days - fourYearBlocks*(365*3 + 366);
    var year;
    if (daysToCount >= 365*2 + 366) {
        year = 1970 + 4*fourYearBlocks + 3;
        daysToCount -= 365*2 + 366;
    } else if (daysToCount >= 365*2) {
        year = 1970 + 4*fourYearBlocks + 2;
        daysToCount -= 365*2;
    } else if (daysToCount >= 365) {
        year = 1970 + 4*fourYearBlocks + 1;
        daysToCount -= 365;
    } else {
        year = 1970 + 4*fourYearBlocks;
    }
    var month = 0;
    if (isLeapYear(year)) {
        while (daysToCount >= getDaysInMonthLeap(month)) {
            daysToCount -= getDaysInMonthLeap(month);
            month++;
        }
    } else {
        while (daysToCount >= getDaysInMonth(month)) {
            daysToCount -= getDaysInMonth(month);
            month++;
        }
    }
    var day = daysToCount + 1;
    return [day.toString(), getMonthString(month), year.toString()];
}

function naturalToUnix(natural) {
    var day = parseInt(natural[0]);
    var month = getMonthNumber(natural[1]);
    var year = parseInt(natural[2]);
    var numLeapYears = Math.floor((year - 1970 + 1)/4);
    var unix = (year - 1970 - numLeapYears)*secs_in_year
                + numLeapYears*secs_in_leap_year;
    var i = 0;
    if (isLeapYear(year)) {
        while (i < month) {
            unix += getDaysInMonthLeap(i)*secs_in_day;
            i++;
        }
    } else {
        while (i < month) {
            unix += getDaysInMonth(i)*secs_in_day;
            i++;
        }
    }
    unix += (day - 1)*secs_in_day;
    return unix;
}

// ----------------------------------------------------------------------------
// Parse string into [unix, day, month, year].
// 'unix' is a number, the rest are strings.
// If can't parse, return with no value.
function parseDate(str) {
    str = decodeURI(str);
    var dayIndex = str.search( /[0-9][0-9]/ );
    if (dayIndex < 0) {return;}
    var day = str.slice(dayIndex, dayIndex + 2);
    str = str.replace( /[0-9][0-9]/ , '');
    var yearIndex = str.search( /[0-9][0-9][0-9][0-9]/ );
    if (yearIndex < 0) {return;}
    var year = str.slice(yearIndex, yearIndex + 4);
    var month;
    if (str.search( /jan/i ) >= 0) {month = 'January';} 
    else if (str.search( /feb/i ) >= 0) {month = 'February';} 
    else if (str.search( /mar/i ) >= 0) {month = 'March';} 
    else if (str.search( /apr/i ) >= 0) {month = 'April';} 
    else if (str.search( /may/i ) >= 0) {month = 'May';} 
    else if (str.search( /jun/i ) >= 0) {month = 'June';} 
    else if (str.search( /jul/i ) >= 0) {month = 'July';} 
    else if (str.search( /aug/i ) >= 0) {month = 'August';} 
    else if (str.search( /sep/i ) >= 0) {month = 'September';}
    else if (str.search( /oct/i ) >= 0) {month = 'October';}
    else if (str.search( /nov/i ) >= 0) {month = 'November';}
    else if (str.search( /dec/i ) >= 0) {month = 'December';} 
    else {return;}
    return [naturalToUnix([day, month, year]), day, month, year];
}
// Parse string as a unix timestamp.
function parseUnix(str) {
    var unix = parseInt(str);
    if (isNaN(unix)) {return;}
    return [unix].concat(unixToNatural(unix));
}

// ----------------------------------------------------------------------------
// HTTP request handling.
app.get('/', function (request, response) {
    // For an empty URL, display an about page.
    response.sendFile(path.join(__dirname, '/about.html'));
});

app.get('*', function (request, response) {
  // Extract url and attempt to parse it.
  // If succsessful, parsed = [unix, day, month, year].
  // 'unix' is a number, the rest are strings.
  var parsed = parseDate(request.url);
  if (parsed) {
      response.writeHead(200, { 'Content-Type' : 'application/json' });
      response.end(JSON.stringify(
          { 
            "unix": parsed[0], 
            "natural": parsed[2] + " " + parsed[1] + ", " + parsed[3]
          }
      ));
  } else {
      parsed = parseUnix(request.url.slice(1)); //remove leading '/' from url
      if (parsed) {
          response.writeHead(200, { 'Content-Type' : 'application/json' });
          response.end(JSON.stringify(
              { 
                "unix": parsed[0], 
                "natural": parsed[2] + " " + parsed[1] + ", " + parsed[3]
              }
          ));
      } else {
          response.writeHead(200, { 'Content-Type' : 'application/json' });
          response.end(JSON.stringify(
              { "unix": null, "natural": null }
          ));
      }
  }
});

app.listen(process.env.PORT, process.env.IP);
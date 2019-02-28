const { Client, Attachment, RichEmbed } = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const request = require('request');
const getJSON = require('get-json');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('guz.db', sqlite3.open_READWRITE);
const bot = new Client();

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
	colorize: true
});

logger.level = 'debug';

// initialize bot
bot.on('ready', function (evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.user.username + ' - (' + bot.user.id + ')');
});

bot.login(auth.token);
bot.on('message', message => {
	
	// a shrug picture for river
	if (message.content.toLowerCase() == 'shrug') {
        const shrugImage = new Attachment("attachments/shrug.jpg");
        message.channel.send(shrugImage);
	}

	// bot has a 1 in 10 chance to "kek" back to user
	if (message.content.toLowerCase() == 'kek' && message.author.id != bot.user.id) {
		let randint = getRandInt(1, 10);
		if (randint == 4) {
			message.channel.send('kek');
		}
	}

	//
	// The bot will listen to messages that start with '!'
	//
	if (message.content.substring(0, 1) == '!') {
		console.log(message.author.username + ': ' + message.content);
		var args = message.content.substring(1).split(' ');
		var cmd = args[0];
		var cmd2 = args[1];
		var cmd3 = args[2];
		var cmd4 = args[3];
		
        args = args.splice(1);
        
        // make sure user isn't using a blacklisted command
        db.all("SELECT rowid AS id, Command FROM Blacklists WHERE GuildID = ? AND UserID = ? AND Command = ?", message.guild.id, message.author.id, cmd, function(err, row) {

            // if error user probably isn't blacklisted from anything and can move on
            if (err) {
                console.log(err);

            // if this returns anything other than 0, user is blacklisted
            } else if ((Array.isArray(row) && row.length) === 0) {
                switch(cmd) {
                    
                    //
                    // !help
                    //
                    case 'help':
                            message.channel.send("Hi I'm Guzbot, " +
                                                "all I do at the moment is: ```" +
                                                "\n!avatar | Gets your avatar" +
                                                "\n!roll  [number] | Rolls a random number" +
                                                "\n!weather [city] | Gets weather for location" +
                                                "\n!osu user [username] [mode] | Gets a users osu! stats (default mode: mania)" +
                                                "\n!sr [subreddit] | Grabs random image from a subreddit" +
                                                "\n!wiki [search term] | Searches Wikipedia" +
                                                "\n!blacklist [add/remove] [command] [@user] | Blacklists a user from specified command" +
                                                "\n!convert [temperature] [unit to convert FROM] | Converts a temperature from C to F or vice versa```");
                            break;
                            
                    //
                    // posts the users avatar in chat	
                    //	
                    case 'avatar':
                        message.reply(message.author.avatarURL);
                        break;
        
                    //
                    // gets the weather for a given location
                    //
                    case 'weather':
                        args.join(' ');
                        var apiKey = auth.weatherkey;
                        var url = 'http://dataservice.accuweather.com/locations/v1/cities/search?apikey=' + apiKey + '&q=' + args;
                        var city;
                        var country;
                        var cityKey;
        
                        getJSON(url, function(error, response) {
                            if (!error) {
                                if (response[0] != null) {
                                    cityKey = response[0].Key;
                                    city = response[0].LocalizedName;
                                    if (response[0].Country.ID == "US") {
                                        country = response[0].AdministrativeArea.ID;
                                    } else {
                                        country = response[0].Country.ID;
                                    }	
                                }
                            }
        
                            var finalUrl = 'http://dataservice.accuweather.com/currentconditions/v1/' + cityKey + '?apikey=' + apiKey + '&details=true';
                        
                            getJSON(finalUrl, function(error, response) {
                                if (!error) {
                                        message.channel.send("```The weather for " + city + ", " + country + ":\n\n" +
                                                            "Condition:     " + response[0].WeatherText +
                                                            "\nTemperature:   " + response[0].Temperature.Imperial.Value + "\u00B0 F " +
                                                            "| " + response[0].Temperature.Metric.Value + "\u00b0 C" +
                                                            "\nFeels like:    " + response[0].RealFeelTemperature.Imperial.Value + "\u00B0 F " +
                                                            "| " + response[0].RealFeelTemperature.Metric.Value + "\u00B0 C" +
                                                            "\nWind:          " + response[0].Wind.Speed.Imperial.Value + " mph" +
                                                            "\nHumidity:      " + response[0].RelativeHumidity + "%```"); 
                                } else {
                                    message.channel.send("Enter an actual place silly");
                                }
                            });
                        });
        
                        break;	
        
                    //	
                    // this obviously doesn't actually ban anyone
                    //
                    case 'ban':
                        if (cmd2.toLowerCase() == 'guzbot') {
                            message.channel.send(message.author.username + " has been banned.");
                            break;
                        }
                            
                        message.channel.send(cmd2 + " has been banned.");
                        break;	
        
                    //
                    // Allows blacklisting a user from a specified command
                    //
                    case 'blacklist':
                        if (message.guild.ownerID !== message.author.id) {
                            message.channel.send("You are not authorized to use this command.");
                            break;
                        }
        
                        let command = cmd3.toLowerCase();
                        let userID = message.mentions.users.first().id;
                        let blacklisted = false;
        
                        if (cmd2.toLowerCase() === "add") {

                            // check if user is already blacklisted from the command
                            db.all("SELECT rowid AS id, Command FROM Blacklists WHERE UserID = ? AND GuildID = ?", userID, message.guild.id, function(err, row) {
                                
                                for (i = 0; i < row.length; i++) {
                                    if (row[i].Command === command) {
                                        blacklisted = true;
                                        message.channel.send(message.mentions.users.first().username + " is already blacklisted.");
                                    }
                                }

                                if (!blacklisted) {
                                    db.run("INSERT INTO Blacklists VALUES ($guildID, $userID, $command)", {
                                        $guildID: message.guild.id,
                                        $userID: userID,
                                        $command: command
                                    });
                                    message.channel.send(message.mentions.users.first().username + " added to blacklist.");
                                }
                            });

                        } else if (cmd2.toLowerCase() === "remove") {
                            // maybe check first?
                            db.run("DELETE FROM Blacklists WHERE GuildID = ? AND UserID = ? AND Command = ?", message.guild.id, userID, command);
                            message.channel.send(message.mentions.users.first().username + " removed from blacklist.");
                        }
        
                        break;
        
                    //	
                    // converts celsius to fahrenheit or vice versa
                    //
                    case 'convert':
                        var conversion;
                        var unit;
                        if (cmd3.toLowerCase() == 'c') {
                            conversion = (cmd2 * 1.8) + 32;
                            unit = 'F';
                        } else if (cmd3.toLowerCase() == 'f') {
                            conversion = (cmd2 - 32) / 1.8;
                            unit = 'C';
                        } else {
                            message.channel.send("Invalid unit");
                            break;
                        }	
        
                        message.channel.send(Math.round(conversion) + "\u00B0 " + unit);
                        break;
                    
                    //
                    // !sr grabs random image from a subreddit
                    //
                    case 'sr':
                        // ignore sunjay
                        if (message.author.id == 155380567846813697) {
                            break;
                        }

                        var url = 'https://www.reddit.com/r/' + cmd2 + '.json?limit=100';

                        // maybe use objects instead of 3 arrays
                        var titles = [];
                        var images = [];
                        //var links = [];
                        
                        getJSON(url, function(error, response) {
                            if (!error) {
                                var length = response.data.children.length;
        
                                for (i = 0; i < length; i++) {
                                    if(response.data.children[i].data.thumbnail_height != null) {
                                        titles.push(response.data.children[i].data.title);
                                        images.push(response.data.children[i].data.url);
                                        //links.push("https://www.reddit.com" + response.data.children[i].data.permalink);
                                    }
                                }
                                var randint = getRandInt(0, titles.length);
                                if (titles.length == 0) {
                                    message.channel.send("Could not find anything");	
        
                                // don't allow nsfw content in non nsfw channel
                                } else if (response.data.children[randint].data.over_18 && !message.channel.nsfw) {
                                    return;
                                } else {
                                    message.channel.send(titles[randint] + '\n\n' + images[randint]);
                                }
                            }
                        });
                        break;
                        
                    //
                    // gets the top time for a kz map
                    //
                    case 'maptop':
                        if (cmd2 == null) {
                            message.channel.send("Usage: !maptop <mapname>");
                            break;
                        } 
        
                        var map = cmd2;
                        var player = null;
                        var runtime = null;
                        getJSON("http://www.kzstats.com/api/map/", function(error, response) {
                            if (!error) {
                                for (i = 0, k = response.length; i < k; i++) {
                                    if (map == response[i].mapname) {
                                        runtime = response[i].runtime;
                                        player = response[i].player;
        
                                        // https://stackoverflow.com/a/25279340
                                        // a very simple solution that seems to work well so far
                                        var milliseconds = runtime * 1000.0
                                        var date = new Date(null);
                                        date.setSeconds(0, milliseconds);
                                        var result = date.toISOString().substr(11, 11);
        
                                        message.channel.send(result + " by " + player);
                                        break;
                                    }
                                }
                                if (player == null || runtime == null) {
                                    message.channel.send("Could not find map");
                                }
                            }
                        });
                        break;
        
                    //
                    // !roll up to certain num
                    //	
                    case 'roll':
                        if (cmd2 == null || isNaN(cmd2)) {
                            var randint100 = getRandInt(1, 100);
                            message.channel.send(message.author.username + ' rolled ' + randint100);
                            break;
        
                        } else {	
                            var randint = getRandInt(1, cmd2);
                            message.channel.send(message.author.username + ' rolled ' + randint);
                            break;
                        }
        
                    //
                    // gets users osu stats
                    //	
                    case 'osu':
                        var apiKey = auth.osukey;
                        var userUrl, mode, user, rank, country, country_rank, acc, pp, level;
        
                        if (cmd2 == "user" && cmd4 == null || cmd4 == "mania") {
                            userUrl = "https://osu.ppy.sh/api/get_user?k=" + apiKey + "&u=" + cmd3 + "&m=3";
                            mode = "osu!mania";
        
                        } else if (cmd2 == "user" && cmd4 == "osu" || cmd4 == "std") {
                            userUrl = "https://osu.ppy.sh/api/get_user?k=" + apiKey + "&u=" + cmd3 + "&m=0";
                            mode = "osu!";
        
                        } else if (cmd2 == "user" && cmd4 == "taiko") {
                            userUrl = "https://osu.ppy.sh/api/get_user?k=" + apiKey + "&u=" + cmd3 + "&m=1";
                            mode = "Taiko";
        
                        } else if (cmd2 == "user" && cmd4 == "ctb" || cmd4 == "catch") {
                            userUrl = "https://osu.ppy.sh/api/get_user?k=" + apiKey + "&u=" + cmd3 + "&m=2";
                            mode = "osu!catch";
                            
                        } else {
                            message.channel.send("```Usage: !osu user [username] [mode] - Default mode is mania```");
                            break;
                        }
        
                        getJSON(userUrl, function(error, response) {
                            if (!error) {
                                try {
                                    user = response[0].username;
                                    rank = response[0].pp_rank;
                                    country_rank = response[0].pp_country_rank;
                                    country = response[0].country;
                                    acc = parseFloat(response[0].accuracy);
                                    pp = Math.round(response[0].pp_raw);
                                    level = parseFloat(response[0].level);
        
                                    message.channel.send("```" + mode + "\n\nUser: " + user + " - " + country + "\nRank: #" + rank + " | #" + country_rank + 
                                                        " " + country + "\nLevel: " + level.toFixed(1) + "\nAccuracy: " + acc.toFixed(2) + "%```");
                                } catch (err) {
                                    message.channel.send("Cannot find that user");
                                }
                            }
                        });
                        
                        break;
        
                    //	
                    // search wikipedia
                    //
                    case 'wiki':
                        var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=' + args;
                        var description;
                        var link;
        
                        getJSON(wikiUrl, function(error, response) {
                            if (!error) {
                                description = response[2][0];
                                link = response[3][0];
                                message.channel.send(description + "\n\n" + link); 
                            }
                        });
                        break;	
                }

            }
            });
        }
    });

function getRandInt(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
    
}

// error handler
bot.on("error", console.error);

// ensure db closes on exit
process.on("exit", (code) => {
    console.log("\nExiting");
    db.close();
    process.exit();
});

process.on("SIGINT", () => {
    process.exit();
})


const { S_IFBLK } = require('constants');
const { connect } = require('http2');

const Discord = require('discord.js'),
  fs = require('fs'),
  config = JSON.parse(fs.readFileSync('config.json', 'utf8')),
  warnfile = require("./warns.json"),
  muterole = '696750135727882310',
  Enmap = require('enmap'),
  imgur = require('imgur'),
  modules = new Map(),
  mysql = require('mysql'),
  // CONFIG
  guild_cmdprefix = new Map(),
  guild_adminrole = new Map(),
  guild_modlog = new Map(),
  guild_module_moderation = new Map(),
  guild_module_fun = new Map(),
  guild_module_log = new Map(),
  guild_activated = new Map(),
  guild_lang = new Map(),
  cron = require("cron"),
  moment = require('moment'),
  fetch = require('node-fetch'),
  http = require('http'),
  formidable = require('formidable');

var connection = mysql.createConnection({
  host: config.sql_host,
  user: 'n0chteil',
  password: config.sql_password,
  database: 'bagley',
  charset: 'utf8mb4',
}, console.log('Database connected'))
if (err => {
  console.log('Database connection error'),
    console.log(err.code), // 'ECONNREFUSED'
    console.log(err.fatal) // true
});

connection.connect();
handleDisconnect(connection);

const COLOR = {
  blue: 0x00b7e5,
  red: 0xe74c3c,
  orange: 0xffc348,
  bagley: 0xd93630
}
let client = new Discord.Client({ ws: { intents: Discord.ALL } })

imgur.setClientId('d28f4b30457eb9b');
imgur.setAPIUrl('https://api.imgur.com/3/upload/');

let newguilds = 0;
let scheduledMessage = new cron.CronJob('00 00 00 * * *', () => {
  // ist rückwärts - 00 30 10 für 10:30
  let embed = new Discord.MessageEmbed()
    .setDescription(
      '📊 **Daily statistics**\n' +
      `New/Lost Guilds: **${newguilds}**\n` +
      `Users: **${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}**\n`
    )
    .setTimestamp()
    .setColor(COLOR.bagley)

  client.channels.cache.get('809778897259855892').send(embed);
  newguilds = 0;
});


client.on('ready', async () => {
  console.log(`Started as: ${client.user.tag}`);
  client.user.setPresence({ activity: { name: 'the Spider-Arena', type: 'COMPETING' }, status: 'dnd' }).catch(console.error);

  scheduledMessage.start()

  console.log("Setting guild variables...")

  client.guilds.cache.forEach(guild => {
    connection.query(`SELECT guild_prefix FROM guild_config WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
      if (result[0] == undefined) {
        connection.query(`INSERT INTO guild_config (guild_id, guild_prefix) VALUES ('${guild.id}', 'b!')`);
        guild_cmdprefix.set(guild.id, 'b!');
      } else {
        guild_cmdprefix.set(guild.id, result[0].guild_prefix);
      }
    });

    connection.query(`SELECT guild_id FROM guilds WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
      if (result[0] == undefined) {
        connection.query(`INSERT INTO guilds (guild_id, guild_name, guild_premium) VALUES('${guild.id}', '${guild.name}', 'false')`);
      }
    });

    connection.query(`SELECT guild_modlog FROM guild_config WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
      if (result[0] == undefined) {
        guild_modlog.set(guild.id, undefined);
      } else {
        guild_modlog.set(guild.id, result[0].guild_modlog);
      }
    });

    connection.query(`SELECT guild_lang FROM guild_config WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
      if (result[0] == undefined) {
        guild_lang.set(guild.id, "en_AE");
      } else {
        guild_lang.set(guild.id, result[0].guild_lang);
      }
    });

    //connection.query(`SELECT * FROM modules WHERE guild_id = '${guild.id}'`, function (error, results, fields) {
    //  results.forEach(function(result) {
    //    let id = result.id;
    //    modules.set(guild.id, result[id].module, result[id].status);
    //  });
    //});

    connection.query(`SELECT * FROM modules WHERE guild_id = '${guild.id}'`, function (error, results, fields) {
      if (results[0] == undefined) {
        connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'moderation', 'false')`);
        connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'fun', 'false')`);
        connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'log', 'false')`);
        connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'welcome', 'false')`);
      } else {
        results.forEach(function (result) {
          if (result.module == 'moderation') {
            guild_module_moderation.set(guild.id, result.status)
          } else if (result.module == 'fun') {
            guild_module_fun.set(guild.id, result.status)
          } else if (result.module == 'log') {
            guild_module_log.set(guild.id, result.status)
          }
        });
      }
    });

    connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'logging'`, function (error, results, fields) {
      if (results[0] == undefined) {
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'voice', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'channel', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'moderation', 'true')`);
      }
    });

    connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'moderation'`, function (error, results, fields) {
      if (results[0] == undefined) {
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'bad_words', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'server_invites', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'zalgo', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'caps', 'true')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'virustotal', 'false')`);
      }
    });

    connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'welcome'`, function (error, results, fields) {
      if (results[0] == undefined) {
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'type', 'message')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'channel', NULL)`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'message', 'Hey {tag}, welcome to {gname}!')`);
        connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'image', NULL)`);
      }
    });

    //APRIL APRIL
    // let channel = guild.channels.cache.filter(ch => ch.type === "text").find(x => x.position === 0);
    // channel.send('April, April 🥳 🥴').then(console.log("Sended: "+guild.id));
  });

  connection.query(`SELECT COUNT(*) as total FROM guilds`, function (error, result, fields) {
    if (result[0] != undefined) {

      let readyEmbed = new Discord.MessageEmbed()
        .setDescription(
          '🟢 **Bot started**\n' +
          'The bot was started and is usable again.\n\n' +
          '📊 **Statistics**\n' +
          `Guilds: **${result[0].total}**\n` +
          `Users: **${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}**`)
        .setTimestamp()
        .setColor(0x44B37F)

      //client.channels.cache.get('809778897259855892').send(readyEmbed);
    }
  })
});

var server = http.createServer(function (req, res) {
  if (res.socket.remoteAddress == '::ffff:127.0.0.1') {
    if (req.method == 'POST') {
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        res.writeHead(200, [["Content-Type", "text/plain"]
          , ["Content-Length", 0]
        ]);
        res.write('');
        res.end();

        handleServerNotice(fields);
      });
    }
  }
});
server.listen(8001);

function handleDisconnect(sqlclient) {
  sqlclient.on('error', function (error) {
    if (!error.fatal) return;
    //if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;

    console.error('> Re-connecting lost MySQL connection: ' + error.stack);
    connection = mysql.createConnection({
      host: config.sql_host,
      user: 'bagley',
      password: config.sql_password,
      database: 'bagley',
      charset: 'utf8mb4',
    });
    handleDisconnect(connection);
    connection.connect();
  });
};

function makekey(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function handleServerNotice(field) {
  console.log(field);
  const data = JSON.parse(field['data']);

  if (field['guild_id'] && field['type'] === 'setstatus') {
    client.user.setPresence({ activity: { name: data.name, type: data.type }, status: 'dnd' }).catch(console.error);
  }
  else if (field['guild_id'] && field['type'] === 'setlanguage') {
    guild_lang.set(field['guild_id'], data['language'])
    connection.query(`UPDATE guild_config SET guild_lang = '${data['language']}', lastedited = CURRENT_TIMESTAMP WHERE guild_id = '${field['guild_id']}'`);
  }
}

function validateZalgo(s) {
  return /[^\u+0300-\u+036F]/.test(s); 
}

function addWarn(guild_id, muteUser, muteReason, message) {
  if(!guild_id && !muteUser && !muteReason && !message) return "Not enough information";

  if(!message)
    connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, message, date) VALUES ('${guild_id}', '${muteUser}', '${muteReason}', NULL, CURRENT_TIMESTAMP)`);
  else
    connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, message, date) VALUES ('${guild_id}', '${muteUser}', '${muteReason}', '${message}', CURRENT_TIMESTAMP)`);
}

function sendModLog(guild_id, embed) {
  const guildConfig = {
      config_modlog: guild_modlog.get(channel.guild.id),
      config_module_log: guild_module_log.get(channel.guild.id)
    };
  
  if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
    client.channels.cache.get(guildConfig.config_modlog).send(embed)
  }
}

function setGuildModLog(guild_id, variable) {
  connection.query(`UPDATE guild_config SET guild_modlog = '${variable}' WHERE guild_id = '${guild_id}'`);
  guild_modlog.set(guild_id, variable)
}

client.on("guildCreate", guild => {
  let channel = guild.channels.cache.filter(ch => ch.type === "text").find(x => x.position === 0);

  connection.query(`SELECT guild_id FROM guilds WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
    if (result[0] == undefined) {
      connection.query(`INSERT INTO guilds (guild_id, guild_name, guild_premium) VALUES('${guild.id}', '${guild.name}', 'false')`);
    }
  })
  connection.query(`SELECT guild_id FROM guild_config WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
    if (result[0] == undefined) {
      connection.query(`INSERT INTO guild_config (guild_id, guild_prefix) VALUES('${guild.id}', 'b!')`);
    }
  })

  connection.query(`SELECT * FROM modules WHERE guild_id = '${guild.id}'`, function (error, results, fields) {
    if (results[0] == undefined) {
      connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'moderation', 'false')`);
      connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'fun', 'false')`);
      connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'log', 'false')`);
      connection.query(`INSERT INTO modules (guild_id, module, status) VALUES ('${guild.id}', 'welcome', 'false')`);
    } else {
      results.forEach(function (result) {
        if (result.module == 'moderation') {
          guild_module_moderation.set(guild.id, result.status)
        } else if (result.module == 'fun') {
          guild_module_fun.set(guild.id, result.status)
        } else if (result.module == 'log') {
          guild_module_log.set(guild.id, result.status)
        }
      });
    }
  });

  connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'logging'`, function (error, results, fields) {
    if (results[0] == undefined) {
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'voice', 'true')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'channel', 'true')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'logging', 'moderation', 'true')`);
    }
  });

  connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'moderation'`, function (error, results, fields) {
    if (results[0] == undefined) {
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'bad_words', 'true')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'server_invites', 'true')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'zalgo', 'true')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'moderation', 'caps', 'true')`);
    }
  });

  connection.query(`SELECT guild_id FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'welcome'`, function (error, results, fields) {
    if (results[0] == undefined) {
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'type', 'message')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'channel', NULL)`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'message', 'Hey {tag}, welcome to {gname}!')`);
      connection.query(`INSERT INTO modules_setting (guild_id, module, setting, value) VALUES ('${guild.id}', 'welcome', 'image', NULL)`);
    }
  });

  connection.query(`SELECT status FROM guilds WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
    if (result[0] == undefined) {
      if(result[0].status == 'false') connection.query(`UPDATE guilds SET status = 'true' WHERE guild_id = '${guild.id}'`);
    }
  });


  guild_lang.set(guild.id, "en_AE");
  guild_modlog.set(guild.id, undefined);
  guild_cmdprefix.set(guild.id, 'b!');

  connection.query(`SELECT COUNT(*) as total FROM guilds WHERE guild_id != "${guild.id}"`, function (error, result, fields) {
    if (result[0] != undefined) {
      let embed = new Discord.MessageEmbed()
        .setTitle(`📊 Guild added`)
        .setDescription(`**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Members:** ${guild.memberCount}\n\n**Guild counter:** ${result[0].total + 1}`)
        .setColor(COLOR.bagley)
        .setTimestamp()

      client.channels.cache.get("809778897259855892").send(embed)
    }
  })

  newguilds = newguilds + 1;
});

client.on("guildDelete", guild => {
  connection.query(`SELECT COUNT(*) as total FROM guilds`, function (error, result, fields) {
    if (result[0] != undefined) {
      let embed = new Discord.MessageEmbed()
        .setTitle(`📊 Guild removed`)
        .setDescription(`**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Members:** ${guild.memberCount}`)
        .setColor(COLOR.bagley)
        .setTimestamp()

      client.channels.cache.get("809778897259855892").send(embed)
    }
  })

  newguilds = newguilds - 1;

  connection.query(`UPDATE guilds SET status = 'false' WHERE guild_id = '${guild.id}'`);
});

// client.on("guildMemberAdd", async member => {
// const guild = member.guild;

// connection.query(`SELECT welcome FROM modules WHERE guild_id = '${guild.id}'`, function (error, result, fields) {
// if(result[0] != undefined) {
// if(result[0].welcome === 'true') {
// const msg_type = connection.query(`SELECT setting FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'welcome' AND setting = 'type'`),
// msg_channel = connection.query(`SELECT setting FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'welcome' AND setting = 'channel'`),
// msg_message = connection.query(`SELECT setting FROM modules_setting WHERE guild_id = '${guild.id}' AND module = 'welcome' AND setting = 'message'`);

// var msg_ch = msg_channel[0].setting,
// msg_tpe = msg_type[0].setting,
// msg = msg_message[0].setting;

// if(msg_tpe === 'message') {
// msg_ch.send(msg);
// } else if(msg_tpe === 'embed') {
// var color = msg['color'] || COLOR.bagley,
// title = msg['title'].relace('{tag}', member.tag).relace('{name}', member.name).relace('{gname}', guild.name).relace('{membercount}', guild.members.filter(member => !member.user.bot).size),
// embed = new Discord.MessageEmbed()
// .setTitle(title)
// .setDescription(msg['description'])
// .setThumbnail(msg['thumbnail'])
// .setColor(color);

// msg_ch.send(embed);
// }
// }
// }
// })
// });

// client.on("guildMemberRemove", member => {
//   let guildConfig.config_module_log = guild_module_log.get(message.guild.id),
//       guildConfig.config_modlog = guild_modlog.get(message.guild.id);
//   if(guildConfig.config_module_log != undefined && guildConfig.config_modlog == true) {
//     lient.channels.cache.get(guildConfig.config_modlog).send(`${member.name} left the server.`);
//   }
// })

client.on("message", async message => {
  const langdata = await fetch('https://raw.githubusercontent.com/Bagley-Bot/Localization/main/' + guild_lang.get(message.guild.id) + '/Bot/index.json').then(response => response.json());
  if (message.content.toLowerCase().startsWith(config.prefix + "gbk")) {
    if (message.author.id == '495901098926669825') {
      let betakey = makekey(15);
      connection.query(`INSERT INTO beta_keys (betakey, used) VALUES ('${betakey}', 'false')`);
      message.channel.send(`Key: ${betakey}`)
    }
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "rss")) {
    if (message.author.id == '495901098926669825') {
      client.user.setPresence({ activity: { name: 'the Spider-Arena', type: 'COMPETING' }, status: 'dnd' }).catch(console.error);
      message.channel.send('Status was set.')
    }
  }

  var guildConfig = {
    config_prefix: guild_cmdprefix.get(message.guild.id),
    config_adminrole: guild_adminrole.get(message.guild.id),
    config_modlog: guild_modlog.get(message.guild.id),
    config_module_mod: guild_module_moderation.get(message.guild.id),
    config_module_fun: guild_module_fun.get(message.guild.id),
    config_module_log: guild_module_log.get(message.guild.id)
  };

  if (message.channel.type == 'dm') { return; }

  if (message.content.toLowerCase().startsWith(config.prefix.toLowerCase() + "create") && message.guild.id == '518389564340043776') {
    let member = message.author
    let teamrole = "810577364051951648";
    let text = message.content.split(" ").slice(1).join(" ")
    let channelcheck = message.guild.channels.cache.find(c => c.name.toLowerCase() === 'ticket-' + message.author.username.toLowerCase())
    let ticketname = message.author.username;

    let embedexists = new Discord.MessageEmbed()
      .setAuthor(member.tag, member.avatarURL())
      .setDescription(langdata.ticket['already_ticket_open'])
      .setColor(COLOR.bagley)

    if (!text) return message.channel.send(langdata.ticket['specify_reason']).then()

    message.guild.channels.create('ticket-' + ticketname.replace(/\s/g, '')).then(channel => {
      channel.setTopic(langdata.ticket['channel.description'].replace('{0}', member.tag).replace('{1}', text))
      channel.setParent('810577740251922573')
      channel.updateOverwrite("810577364051951648", { VIEW_CHANNEL: true, SEND_MESSAGES: true, READ_MESSAGE_HISTORY: true });
      channel.updateOverwrite(message.author.id, { VIEW_CHANNEL: true, SEND_MESSAGES: true, READ_MESSAGE_HISTORY: true });
      channel.updateOverwrite(channel.guild.roles.everyone, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false });
      channel.send(embedchannel)
      connection.query(`INSERT INTO ticket_support (user_id, channel_id, reason, closed) VALUES ('${message.author.id}', '${channel.id}', '${text}', 'false')`);
    })

    let embed = new Discord.MessageEmbed()
      .setAuthor(member.tag, member.avatarURL())
      .setDescription(langdata.ticket['success.created'].replace('{0}', text))
      .setColor(COLOR.bagley)

    let embedchannel = new Discord.MessageEmbed()
      .setAuthor('Ticket Support', member.avatarURL())
      .setDescription(langdata.ticket['channel.message.owner'] + message.author.tag + `\n ${langdata.ticket['channel.message.reason']} ` + text + `\n${langdata.ticket['channel.message.date']} ` + moment.utc(Date.now()).format('MM/DD/YYYY HH:MM') + ' UTC\n**Tip:** You can close this ticket with **b!close**\n\nPlease be patient, someone will take care of you soon.')
      .setColor(COLOR.orange)

    message.channel.send(embed)

  }

  if (message.content.toLowerCase().startsWith(config.prefix.toLowerCase() + "close") && message.guild.id == '518389564340043776') {
    let member = message.author,
      teamrole = "810577364051951648";

    let embed = new Discord.MessageEmbed()
      .setAuthor(member.tag, member.avatarURL())
      .setDescription(langdata.ticket['success.closed'])
      .setColor(COLOR.bagley)

    connection.query(`SELECT user_id, channel_id FROM ticket_support WHERE channel_id = '${message.channel.id}'`, function (error, result, fields) {
      if (result != undefined) {
        if (result[0] != undefined) {
          let user = client.users.cache.get(result[0].user_id),
            ticketname = user.username.toLowerCase();
          if (message.channel.id == result[0].channel_id || (message.member.roles.cache.has(r => r.id == teamrole) && message.channel.name.startsWith("ticket-"))) {
            message.channel.send(embed);
            message.guild.channels.cache.find(ch => ch.id === result[0].channel_id).setName("closed-" + ticketname.replace(/\s/g, '')).then(
              message.channel.updateOverwrite(teamrole, { VIEW_CHANNEL: true, SEND_MESSAGES: true, READ_MESSAGE_HISTORY: true }),
              message.channel.updateOverwrite(result[0].user_id, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false }),
              message.channel.updateOverwrite(message.guild.roles.everyone, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false })
            )
            connection.query(`UPDATE ticket_support SET closed = 'true' WHERE channel_id = '${message.channel.id}'`)
          }
        }
      }
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "clear") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "clear") && guildConfig.config_module_mod == true) {
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("MANAGE_MESSAGES") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    if (!message.guild.me.hasPermission("MANAGE_MESSAGES")) return message.channel.send(langdata.moderation.clear.failure['not_enough_permissions']);

    let args = message.content.split(" "),
        messages = args[1];

    if(!messages) return message.channel.send(langdata.moderation.clear.failure['amount']);
    if(isNaN(messages)) return message.channel.send(langdata.moderation.clear.failure['numbers']);
    if(messages <= 0) return message.channel.send(langdata.moderation.clear.failure['numbers']);
    if(messages > 100) return message.channel.send(langdata.moderation.clear.failure['100msg']);

    message.channel.bulkDelete(parseFloat(messages) + 1).then(msgs => {
      let amount = parseFloat(msgs.size) - 1;
      message.channel.send(langdata.moderation.clear['success'].replace('{0}', amount)).then(msg => { msg.delete({ timeout: 10000}) });

      let modLog = new Discord.MessageEmbed()
        .setAuthor(`[LOG] ${message.author.tag}`, message.author.avatarURL())
        .setColor(COLOR.bagley)
        .setDescription(langdata.moderation.clear['description'].replace('{0}', message.author).replace('{1}', amount))
        .setFooter(`User-ID: ${message.author.id}`)
        .setTimestamp()
    
      if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
          client.channels.cache.get(guildConfig.config_modlog).send(modLog)
      }
    }).catch(console.error);
  }

  const regex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|club)|discordapp\.com\/invite|discord\.com\/invite)\/.+[a-z]/gi;
  if (regex.exec(message.content) && message.author.id != client.user.id && guildConfig.config_module_mod == "true") {

    if ((message.member.hasPermission("ADMINISTRATOR") || message.member.hasPermission("MANAGE_GUILD") || message.member.hasPermission("MANAGE_MESSAGES")) || message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) { return; }

    let member = message.author
    let text = message.content.split(" ").slice(0).join(" ")
    let modLog = new Discord.MessageEmbed()
      .setAuthor('[WARN] ' + member.tag, '' + member.avatarURL({ dynamic: true }))
      .setColor(COLOR.bagley)
      .addField("User", `${message.author}`, true)
      .addField("Moderator", `<@${client.user.id}>`, true)
      .addField('Reason', langdata.moderation.auto['reason.invite'], true)
      .addField('Message', text, true)
      .setFooter(`User-ID: ${member.id}`)
      .setTimestamp()

    let warnMessage = new Discord.MessageEmbed()
      .setAuthor(langdata.moderation.auto['embed.received'].replace('{0}', member.tag), member.avatarURL({ dynamic: true }))
      .setColor(COLOR.bagley)
      .setDescription(`**Reason:** ${langdata.moderation.auto['reason.invite']}`)
      .setTimestamp()

    message.delete()
    message.channel.send(warnMessage)
    if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }

    connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, message, date) VALUES ('${message.guild.id}', '${message.author.id}', '${langdata.moderation.auto['reason.invite']}', '${message.content}', CURRENT_TIMESTAMP)`);

  }

  let words = ["fuck", "fick", "hure", "opfer", "bastard", "schlampe", "fotze"]
  for (let i = 0; i < words.length; i++) {
    if (message.content.toLowerCase().includes(words[i]) && message.author.id != client.user.id && guildConfig.config_module_mod == "true") {
      let member = message.author

      if (message.member.hasPermission("ADMINISTRATOR") || message.member.hasPermission("MANAGE_GUILD") || message.member.hasPermission("MANAGE_MESSAGES") || message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) { return; }

      let embed = new Discord.MessageEmbed()
        .setAuthor(langdata.moderation.auto['embed.received'].replace('{0}', member.tag), member.avatarURL({ dynamic: true }))
        .setColor(COLOR.bagley)
        .setDescription(`**Reason:** ${langdata.moderation.auto['reason.bad_words']}`)
        .setTimestamp()

      let modLog = new Discord.MessageEmbed()
        .setAuthor('[WARN] ' + member.tag, '' + member.avatarURL({ dynamic: true }))
        .setColor(COLOR.bagley)
        .addField("User", `${message.author}`, true)
        .addField("Moderator", `<@${client.user.id}>`, true)
        .addField('Reason', langdata.moderation.auto['reason.bad_words'], true)
        .addField('Message', message.content, true)
        .setFooter(`User-ID: ${member.id} `)
        .setTimestamp()

      message.channel.send(embed)
      if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
        client.channels.cache.get(guildConfig.config_modlog).send(modLog)
      }
      message.delete()

      connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, message, date) VALUES ('${message.guild.id}', '${message.author.id}', '${langdata.moderation.auto['reason.bad_words']}', '${message.content}', CURRENT_TIMESTAMP)`);
    }
  }

  const numUpper = message.content.length - message.content.replace(/[A-Z]/g, '').length;
  if((numUpper)/message.content.length*100.0 >= 70) {

    if ((message.member.hasPermission("ADMINISTRATOR") || message.member.hasPermission("MANAGE_GUILD") || message.member.hasPermission("MANAGE_MESSAGES")) || message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) { return; }
    
    let member = message.author
    let text = message.content.split(" ").slice(0).join(" ")
    let modLog = new Discord.MessageEmbed()
      .setAuthor('[WARN] ' + member.tag, '' + member.avatarURL({ dynamic: true }))
      .setColor(COLOR.bagley)
      .addField("User", `${message.author}`, true)
      .addField("Moderator", client.user, true)
      .addField('Reason', langdata.moderation.auto['reason.capital'], true)
      .addField('Message', text, true)
      .setFooter(`User-ID: ${member.id}`)
      .setTimestamp()

    let warnMessage = new Discord.MessageEmbed()
      .setAuthor(langdata.moderation.auto['embed.received'].replace('{0}', member.tag), member.avatarURL({ dynamic: true }))
      .setColor(COLOR.bagley)
      .setDescription(`**${langdata.moderation.auto['embed.reason']}:** ${langdata.moderation.auto['reason.capital']}`)
      .setTimestamp()

    message.delete()
    message.channel.send(warnMessage)
    if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }

    connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, message, date) VALUES ('${message.guild.id}', '${message.author.id}', '${langdata.moderation.auto['reason.capital']}', "${text}", CURRENT_TIMESTAMP)`);
  }

  // if (validateZalgo(message.content) && message.author.id != client.user.id && guildConfig.config_module_mod == "true") {

  //   if ((message.member.hasPermission("ADMINISTRATOR") || message.member.hasPermission("MANAGE_GUILD") || message.member.hasPermission("MANAGE_MESSAGES")) || message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) { return; }

  //   let member = message.author
  //   let text = message.content.split(" ").slice(0).join(" ")
  //   let modLog = new Discord.MessageEmbed()
  //     .setAuthor('[WARN] ' + member.tag, '' + member.avatarURL({ dynamic: true }))
  //     .setColor(COLOR.bagley)
  //     .addField("User", `${message.author}`, true)
  //     .addField("Moderator", client.user, true)
  //     .addField('Reason', langdata.moderation.auto['reason.zalgo'], true)
  //     .addField('Message', text, true)
  //     .setFooter(`User-ID: ${member.id}`)
  //     .setTimestamp()

  //   let warnMessage = new Discord.MessageEmbed()
  //     .setAuthor(langdata.moderation.auto['embed.received'].replace('{0}', member.tag), member.avatarURL({ dynamic: true }))
  //     .setColor(COLOR.bagley)
  //     .setDescription(`**${langdata.moderation.auto['embed.reason']}:** ${langdata.moderation.auto['reason.zalgo']}`)
  //     .setTimestamp()

  //   message.delete()
  //   message.channel.send(warnMessage)
  //   if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
  //     client.channels.cache.get(guildConfig.config_modlog).send(modLog)
  //   }

  //   connection.query(`INSERT INTO mod_warns (guild_id, user_id, reason, date) VALUES ('${message.guild.id}', '${message.author.id}', '${langdata.moderation.auto['reason.zalgo']}', CURRENT_TIMESTAMP)`);
  // }

  if (message.content.toLowerCase().startsWith(config.prefix + "mute") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "mute")) {
    if (guildConfig.config_module_mod == false) { return; }
    let args = message.content.split(" ");
    let muteUser = message.mentions.users.first();
    let muteMember = message.mentions.members.first();
    let muteTime = "0000-00-00 00:00:00";
    let muteRole = "";
    let muteReason = langdata.moderation.mute['no_reason'];
    if (args[3]) muteTime = Date.now() + parseInt(args[3]) * 1000;
    connection.query(`SELECT guild_muterole FROM guild_config WHERE guild_id = '${message.guild.id}'`, function (error, result, fields) {
      if (result[0] != undefined) {
        if (result[0].guild_muterole != null) muteRole = result[0].guild_muterole;
        if (args[2]) muteReason = message.content.split(" ").slice(2).join(" ");

        if (!message.guild.me.hasPermission(["MANAGE_ROLES", "ADMINISTRATOR"])) return message.channel.send(langdata.default.self['not_enough_permissions']);
        if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("MANAGE_MESSAGES") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
          message.channel.send(langdata.default.user['not_enough_permissions'])
          return;
        }
        if (message.mentions.roles.first() && !muteUser) {
          const role = message.mentions.roles.first();
          return message.channel.send(langdata.moderation.mute['set_muterole'].replace('{0}', role)),
            connection.query(`UPDATE guild_config SET guild_muterole = '${role.id}' WHERE guild_id = '${message.guild.id}'`);
        }
        if (muteRole == "") return message.channel.send(langdata.moderation.mute['no_muterole']);
        if (!muteUser) return message.channel.send(langdata.moderation.mute['provide_user']);
        if (message.mentions.members.first().roles.highest.position > message.guild.members.resolve(client.user).roles.highest.position)
          return message.channel.send(langdata.moderation.mute['lower_role']);
        connection.query(`SELECT user_id FROM mod_mutes WHERE user_id = ${muteUser.id} AND guild_id = '${message.guild.id}'`, function (error, result2, fields) {
          if (result2[0] != undefined && result2[0].user_id != undefined) return message.channel.send("This user is already muted");

          let embed = new Discord.MessageEmbed()
            .setTitle(langdata.moderation.mute['success.title'])
            .setThumbnail(muteUser.avatarURL({ dynamic: true }))
            .setTimestamp()
          if (muteTime == "0000-00-00 00:00:00") {
            embed.setDescription(langdata.moderation.mute['muted'].replace('{0}', muteUser))
          } else {
            let muteTime2 = new Date(muteTime);
            embed.setDescription(langdata.moderation.mute['muted_for'].replace('{0}', muteUser).replace('{1}', muteReason))
          }
          let modLog = new Discord.MessageEmbed()
            .setAuthor(`[LOG] ${muteUser.username}`, muteUser.avatarURL({ dynamic: false }))
            .setColor(COLOR.bagley)
            .setDescription(langdata.moderation.mute['muted'].replace('{0}', muteUser))
            .addField("Moderator", `${message.author}`, true)
            .addField("Reason", `${muteReason}`, true)
            .setFooter(`User-ID: ${muteUser.id}`)
            .setTimestamp()

          if (!message.guild.roles.cache.get(muteRole)) return message.channel.send(langdata.moderation.mute['cant_find_muterole']);

          message.channel.send(embed);
          connection.query(`INSERT INTO mod_mutes (guild_id, user_id, reason, enddate) VALUES ('${message.guild.id}', '${muteUser.id}', '${muteReason}', '${muteTime}')`);
          muteMember.roles.add(muteRole, `Muted by ${message.author.tag}`);
          if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
            client.channels.cache.get(guildConfig.config_modlog).send(modLog)
          }
        })
      }
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "unmute") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "unmute")) {
    if (guildConfig.config_module_mod == false) { return; }
    let muteUser = message.mentions.users.first();
    let muteMember = message.mentions.members.first();
    if (!message.guild.me.hasPermission(["MANAGE_ROLES", "ADMINISTRATOR"])) return message.channel.send(langdata.default.self['not_enough_permissions']);
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("MANAGE_MESSAGES") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }
    if (!muteUser) return message.channel.send(langdata.moderation.mute['provide_user']);
    if (message.mentions.members.first().roles.highest.position > message.guild.members.resolve(client.user).roles.highest.position)
      return message.channel.send(langdata.moderation.mute['lower_role']);
    connection.query(`SELECT user_id FROM mod_mutes WHERE user_id = '${muteUser.id}' AND guild_id = '${message.guild.id}'`, function (error, result, fields) {
      if (result[0] != undefined) {
        connection.query(`SELECT guild_muterole FROM guild_config WHERE guild_id = '${message.guild.id}'`, function (error, result2, fields) {
          if (result2[0] == undefined) return;
          let embed = new Discord.MessageEmbed()
            .setTitle(langdata.moderation.mute['success.title'])
            .setDescription(langdata.moderation.mute['unmuted'].replace('{0}', muteUser))
            .setThumbnail(muteUser.avatarURL({ dynamic: true }))
            .setTimestamp()
          let modLog = new Discord.MessageEmbed()
            .setAuthor(`[LOG] ${muteUser.username}`, muteUser.avatarURL({ dynamic: false }))
            .setColor(COLOR.bagley)
            .setDescription(langdata.moderation.mute['unmuted'].replace('{0}', muteUser))
            .addField("Moderator", `${message.author}`, true)
            .setFooter(`User-ID: ${muteUser.id}`)
            .setTimestamp()

          if (!message.guild.roles.cache.get(result2[0].guild_muterole)) return message.channel.send(langdata.moderation.mute['cant_find_muterole']);

          message.channel.send(embed)
          connection.query(`DELETE FROM mod_mutes WHERE user_id = '${muteUser.id}' AND guild_id = '${message.guild.id}'`);
          muteMember.roles.remove(result2[0].guild_muterole, `Unmuted by ${message.author.tag}`);
          if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
            client.channels.cache.get(guildConfig.config_modlog).send(modLog)
          }
        })
      } else {
        message.channel.send(langdata.moderation.mute['user_not_muted']);
      }
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "setupmute") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "setupmute")) {
    if (guildConfig.config_module_mod == false) { return; }
    if (!message.guild.me.hasPermission(["ADMINISTRATOR"])) return message.channel.send(langdata.default.self['not_enough_permissions']);
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("MANAGE_MESSAGES") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    message.channel.send("Working on it...");

    connection.query(`SELECT guild_muterole FROM guild_config WHERE guild_id = '${message.guild.id}'`, function (error, result, fields) {
      if (result[0] == undefined) return;
      message.guild.channels.cache.forEach((channel) => {
        channel.updateOverwrite(result[0].guild_muterole, { SEND_MESSAGES: false, ADD_REACTIONS: false });
      });
    })

    message.channel.send("Finished!");

  }

  if (message.content.toLowerCase().startsWith(config.prefix + "ban") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "ban") && guildConfig.config_module_mod == true) {
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("BAN_MEMBERS") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    let user = message.mentions.users.first(),
        banUser = message.mentions.members.first(),
        args = message.content.split(" "),
        banReason = langdata.moderation.mute['no_reason'];

    if(args[2]) banReason = message.content.split(" ").slice(2).join(" ");

    if(!user) return message.channel.send(langdata.moderation.ban.failure['user']);
    if (!message.guild.me.permissions.has("BAN_MEMBERS")) {
      let noRights = new Discord.MessageEmbed()
        .setDescription(langdata.moderation.ban.failure['rights'])
        .setColor(COLOR.bagley)
        .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag));

      message.channel.send(noRights);
      return;
    }

    let embed = new Discord.MessageEmbed()
      .setAuthor(langdata.moderation.ban.success['title'].replace('{0}', user.tag), user.avatarURL())
      .setDescription(langdata.moderation.ban.success['description'].replace('{0}', banReason))
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setColor(COLOR.bagley)
      .setTimestamp()
    let modLog = new Discord.MessageEmbed()
      .setAuthor(`[LOG] ${user.tag}`, user.avatarURL())
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.ban.log['description'].replace('{0}', user))
      .addField("Moderator", `${message.author}`, true)
      .addField("Reason", banReason, true)
      .setFooter(`User-ID: ${user.id}`)
      .setThumbnail(user.avatarURL({ dynamic: true }))
      .setTimestamp()

    banUser.ban({ reason: banReason });
    message.channel.send(embed);
    if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
        client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }
  }

  // if (message.content.toLowerCase().startsWith(config.prefix + "unban") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "unban") && guildConfig.config_module_mod == true) {
  //   if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("BAN_MEMBERS") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
  //     message.channel.send(langdata.default.user['not_enough_permissions'])
  //     return;
  //   }

  //   let args = message.content.split(" "),
  //       user = message.mentions.users.first() || client.users.resolve(args[1]),
  //       ban = await message.guild.fetchBans(),
  //       unMuteReason = langdata.moderation.mute['no_reason'];

  //   if(args[2]) muteReason = args[2];

  //   if(!user) return message.channel.send(langdata.moderation.ban.failure['user']);
  //   let member = client.user.fetch(user.id);
  //   if (!ban.get(member.id)) {
  //     let notBanned = new Discord.MessageEmbed()
  //       .setAuthor(`${member.username}`, member.avatarURL)
  //       .setDescription(langdata.moderation.ban.unban.failure['ban'])
  //       .setColor(COLOR.bagley)
  //       .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag));

  //     message.channel.send(notBanned);
  //     return;
  //   }
  //   if (!message.guild.me.permissions.has("BAN_MEMBERS")) {
  //     let noRights = new Discord.MessageEmbed()
  //       .setDescription(langdata.moderation.ban.failure['rights'])
  //       .setColor(COLOR.bagley)
  //       .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag));

  //     message.channel.send(noRights);
  //     return;
  //   }

  //   let embed = new Discord.MessageEmbed()
  //     .setAuthor(langdata.moderation.ban.unban.success['title'].replace('{0}', member.tag), member.avatarURL())
  //     .setDescription(langdata.moderation.ban.unban.success['description'].replace('{0}', member))
  //     .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
  //     .setTimestamp()
  //   let modLog = new Discord.MessageEmbed()
  //     .setAuthor(`[LOG] ${member.tag}`, member.avatarURL())
  //     .setColor(COLOR.bagley)
  //     .setDescription(langdata.moderation.ban.unban.log['description'].replace('{0}', member))
  //     .addField("Moderator", `${message.author}`, true)
  //     .setFooter(`User-ID: ${member.id}`)
  //     .setThumbnail(member.avatarURL({ dynamic: true }))
  //     .setTimestamp()

  //   message.guild.members.unban(member.id);
  //   message.channel.send(embed);
  //   if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
  //       client.channels.cache.get(guildConfig.config_modlog).send(modLog)
  //   }
  // }

  const args = message.content.split(/\s+/g);
  const command = args.shift().slice(config.prefix.length).toLowerCase();

  if (message.content.toLowerCase().startsWith(config.prefix + "addwarn") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "addwarn")) {
    if (guildConfig.config_module_mod == false) { return; }

    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole))
      return message.channel.send(langdata.default.user['not_enough_permissions']);

    let user = message.mentions.users.first(),
        member = message.mentions.members.first(),
        reason = message.content.split(" ").slice(2).join(" ");

    if(!user) return message.channel.send(langdata.moderation.addwarn.failure['user']);
    if(!reason) return message.channel.send(langdata.moderation.addwarn.failure['reason']);
    
    let embed = new Discord.MessageEmbed()
      .setTitle(langdata.moderation.addwarn.success['title'])
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.addwarn.success['description'].replace('{0}', user))
      .addField(langdata.moderation.addwarn.success['reason'], `${reason}`, true)
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setThumbnail(user.avatarURL({ dynamic: true }))
      .setTimestamp()

    let modLog = new Discord.MessageEmbed()
    .setAuthor(`[LOG] ${user.tag}`, user.avatarURL({ dynamic: false }))
    .setColor(COLOR.bagley)
    .setDescription(langdata.moderation.addwarn.modlog['description'].replace('{0}', user))
    .addField("Moderator", `${message.author}`, true)
    .addField(langdata.moderation.addwarn.success['reason'], `${reason}`, true)
    .setFooter(`User-ID: ${user.id}`)
    .setTimestamp()

    message.channel.send(embed)
    addWarn(message.guild.id, user.id, reason)
    sendModLog(message.guild.id, modLog)
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "warns") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "warns")) {
    if (guildConfig.config_module_mod == false) { return; }
    let user = message.mentions.users.first() || message.author;
    connection.query(`SELECT reason FROM mod_warns WHERE user_id = '${user.id}' AND guild_id = '${message.guild.id}'`, function (err, results, flds) {
      connection.query(`SELECT COUNT(*) as total FROM mod_warns WHERE user_id = '${user.id}' AND guild_id = '${message.guild.id}'`, function (error, result, fields) {
        if (result[0] != undefined) {
          let embed = new Discord.MessageEmbed()
            .setTitle(langdata.moderation.warns['title'])
            .setColor(COLOR.bagley)
            .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
            .setThumbnail(user.avatarURL({ dynamic: true }))
            .setTimestamp()
          if (message.mentions.users.first()) {
            embed.setDescription(
              langdata.moderation.warns['mentioned'].replace('{0}', user).replace('{1}', result[0].total)
            )
          } else {
            embed.setDescription(
              langdata.moderation.warns['self'].replace('{0}', result[0].total)
            )
          }


          message.channel.send(embed)
        } else {
          let embed = new Discord.MessageEmbed()
            .setTitle(langdata.moderation.warns['title'])
            .setColor(COLOR.bagley)
            .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
            .setThumbnail(user.avatarURL({ dynamic: true }))
            .setTimestamp()
          if (message.mentions.users.first()) {
            embed.setDescription(langdata.moderation.warns['mentioned'].replace('{0}', user).replace('{1}', '0'))
          } else {
            embed.setDescription(langdata.moderation.warns['self'].replace('{0}', '0'))
          }


          message.channel.send(embed)
        }
      })
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "remove warns") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "remove warns") && guildConfig.config_module_mod == true) {
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    let user = message.mentions.users.first() || message.author
    let embed = new Discord.MessageEmbed()
      .setTitle(langdata.moderation.warns.remove['success.title'])
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.warns.remove['success.description'].replace('{0}', user))
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setThumbnail(user.avatarURL({ dynamic: true }))
      .setTimestamp()
    let errorembed = new Discord.MessageEmbed()
      .setTitle(langdata.moderation.warns.remove['failure.title'])
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.warns.remove['failure.description'].replace('{0}', user))
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setThumbnail(user.avatarURL({ dynamic: true }))
      .setTimestamp()
    let modLog = new Discord.MessageEmbed()
      .setAuthor(`[LOG] ${user.tag}`, user.avatarURL({ dynamic: false }))
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.warns.remove['success.description'].replace('{0}', user))
      .addField("Moderator", `${message.author}`, true)
      .setFooter(`User-ID: ${user.id}`)
      .setTimestamp()

    connection.query(`SELECT COUNT(*) as total FROM mod_warns WHERE user_id = '${user.id}' AND guild_id = '${message.guild.id}'`, function (error, result, fields) {
      if (result[0].total > "0") {
        message.channel.send(embed)
        connection.query(`DELETE FROM mod_warns WHERE user_id = '${user.id}' AND guild_id = '${message.guild.id}'`);
        if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
          client.channels.cache.get(guildConfig.config_modlog).send(modLog)
        }
      } else {
        message.channel.send(errorembed)
      }
    });
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "modlog") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "modlog")) {
    if (guildConfig.config_module_mod == false) { return; }

    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole))
      return message.channel.send(langdata.default.user['not_enough_permissions']);

    const channel = message.mentions.channels.first();

    if(!channel && guildConfig.config_modlog) return message.channel.send(`Current Modlog channel: <#${guildConfig.config_modlog}>`);
    
    let embed = new Discord.MessageEmbed()
      .setTitle(langdata.moderation.config.modlog['title'])
      .setColor(COLOR.bagley)
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setTimestamp()

    let modLog = new Discord.MessageEmbed()
      .setAuthor(`[LOG] CONFIGURATION`, message.guild.iconURL({ dynamic: false }))
      .setColor(COLOR.bagley)
      .setDescription(langdata.moderation.config.modlog.modlog['description'].replace('{0}', channel))
      .addField("User", `${message.author}`, true)
      .setFooter(`User-ID: ${message.member.id}`)
      .setTimestamp()

    message.channel.send(embed)
    sendModLog(message.guild.id, modLog)
    setGuildModLog(message.guild.id, channel.id)
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "about") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "about")) {
    let embed = new Discord.MessageEmbed()
      .setTitle(langdata.about['title'])
      .setDescription(langdata.about['description'])
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setThumbnail('https://i.imgur.com/0TiNXrG.png')
      .setTimestamp()

    message.channel.send(embed)
  }

  if (message.content.toLowerCase() === config.prefix + "help" || message.content.toLowerCase() === guildConfig.config_prefix.toLowerCase() + "help") {
    let embed = new Discord.MessageEmbed()
      .setTitle('Bagley - Help')
      .addField("General", `${config.prefix}help general`, true)
      .addField("Modules", `${config.prefix}help modules`, true)
      .addField("Moderation", `${config.prefix}help mod`, true)
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setThumbnail("https://bagley.eu/assets/img/logo_trans.png")
      .setTimestamp()

    message.channel.send(embed)
  }

  if (message.content.toLowerCase() === config.prefix + "help general" || message.content.toLowerCase() === guildConfig.config_prefix.toLowerCase() + "help general") {
    let embed = new Discord.MessageEmbed()
      .setTitle('Bagley - Help - General')
      .setDescription(
        `\`${config.prefix}stats\`\nSee the bot statistics\n\n`
        + `\`${config.prefix}about\`\nAbout Bagley\n\n`
        + `\`${config.prefix}lang\`\nEdit the language\n\n`
        + `\`${config.prefix}create [REASON]\`\nCreate a support ticket (only on the Bagley discord)\n\n`
        + `\`${config.prefix}close\`\nClose your support ticket (only on the Bagley discord)\n\n`
      )
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setTimestamp()

    message.channel.send(embed)
  }

  if (message.content.toLowerCase() === config.prefix + "help modules" || message.content.toLowerCase() === guildConfig.config_prefix.toLowerCase() + "help modules") {
    let embed = new Discord.MessageEmbed()
      .setTitle('Bagley - Help - Modules')
      .setDescription(
        `\`${config.prefix}module [MODULE] (on/off)\`\nDe-/activate a module\n\n`
        + `List of modules:\n**log**\n**moderation**\n**fun**`
      )
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setTimestamp()

    message.channel.send(embed)
  }

  if (message.content.toLowerCase() === config.prefix + "help mod" || message.content.toLowerCase() === guildConfig.config_prefix.toLowerCase() + "help mod") {
    let embed = new Discord.MessageEmbed()
      .setTitle('Bagley - Help - Moderation')
      .setDescription(
        `\`${config.prefix}warns [PERSON]\`\nSee your warns\n\n`
        + `\`${config.prefix}remove-warns [PERSON]\`\nRemove warns\n\n`
        + `\`${config.prefix}addwarn [PERSON] (reason)\`\nAdd a warn to a person\n\n`
        + `\`${config.prefix}mute [PERSON] (reason)\`\nMute a user\n\n`
        + `\`${config.prefix}unmute [PERSON]\`\nUnmute a user\n\n`
        + `\`${config.prefix}ban [PERSON] (reason)\`\nBan a user\n\n`
        + `\`${config.prefix}clear [AMOUNT]\`\nClear chat messages (Max. 99 at once)\n\n`
      )
      .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
      .setTimestamp()

    message.channel.send(embed)
  }

  // if(message.content.toLowerCase().startsWith(config.prefix + "covid19")  || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "covid19")){
  //   const args = message.content.split(" "),
  //         api = new COVID19API(),
  //         Covid19Locations = api.locations;

  //   let embed = new Discord.MessageEmbed()
  //       .setTitle(langdata.covid19['title'])
  //       .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
  //       .setTimestamp()

  //   if (Covid19Locations.some(function(v) { return args[1].indexOf(v) >= 0; })) {
  //     console.log("Match using '" + args[1] + "'");
  //   } else {
  //     console.log("No match using '" + str + "'");
  //   }
  //   api.getDataByLocation(args[1]).then((data) => {
  //     console.log(data.location);
  //     embed.addField(langdata.covid19['confirmed'], data.values[0].confirmed)
  //     embed.addField(langdata.covid19['recovered'], data.values[0].recovered)
  //     embed.addField(langdata.covid19['deaths'], data.values[0].deaths)
  //   });
  //   message.channel.send(embed)
  // }

  if (message.content.toLowerCase().startsWith(config.prefix + "stats") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "stats")) {
    connection.query(`SELECT COUNT(*) as total FROM guilds`, function (error, result, fields) {
      if (result[0] != undefined) {
        const arr = [1, 2, 3, 4, 5, 6, 9, 7, 8, 9, 10];
        arr.reverse();
        const usedmemory = process.memoryUsage().heapUsed / 1024 / 1024;

        let embed = new Discord.MessageEmbed()
          .setDescription(
            '📊 **Statistics**\n' +
            `Guilds: **${result[0].total}**\n` +
            `Users: **${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}**\n` +
            `Memory usage: ${Math.round(usedmemory * 100) / 100} MB`
          )
          .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
          .setTimestamp()
          .setColor(COLOR.bagley)

        message.channel.send(embed);
      }
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "module") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "module")) {
    const args = message.content.split(" ");
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.hasPermission("MANAGE_MESSAGES") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    if (!args[1]) {
      message.channel.send(langdata.module['error.valid'])
      return;
    }

    if (!args[2]) {
      message.channel.send(langdata.module['error.value'])
      return;
    }

    connection.query(`SELECT module, status FROM modules WHERE guild_id = '${message.guild.id}' AND module = '${args[1]}'`, function (error, result, fields) {
      if (result[0] != undefined) {
        let tff = args[2];
        if (tff == "off") {
          tff = 'false'
        } else if (tff == "on") {
          tff = 'true'
        }

        if (result[0].status == tff) {
          message.channel.send(langdata.module['error.mode'])
          return;
        }

        let embed = new Discord.MessageEmbed()
          .setTitle(`${args[1]} turned ${args[2]}`)
          .setDescription(langdata.module['success.toggle'])
          .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
          .setTimestamp()
          .setColor(COLOR.bagley)

        connection.query(`UPDATE modules SET status = '${tff}' WHERE guild_id = '${message.guild.id}' AND module = '${args[1]}'`);
        message.channel.send(embed);
      } else {
        message.channel.send(langdata.module['error.exist'])
      }
    })
  }

  if (message.content.toLowerCase().startsWith(config.prefix + "lang") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "lang")) {
    const args = message.content.split(" ");
    if (!message.member.hasPermission("ADMINISTRATOR") && !message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.has(r => r.id == guildConfig.config_adminrole)) {
      message.channel.send(langdata.default.user['not_enough_permissions'])
      return;
    }

    if (!args[1]) {
      message.channel.send('Please provide an language. (**en_AE**, **de_DE**, **es_ES**)')
      return;
    }

    if (args[1] != 'en_AE' && args[1] != 'es_ES' && args[1] != 'de_DE') {
      message.channel.send('Please provide an valid language. (**en_AE**, **de_DE**, **es_ES**)')
      return;
    }

    connection.query(`SELECT guild_lang FROM guild_config WHERE guild_id = '${message.guild.id}'`, function (error, result, fields) {
      if (result[0] != undefined) {
        let language = args[1];

        let embed = new Discord.MessageEmbed()
          .setTitle(`Language edited`)
          .setDescription(`Language is now: **${language}**`)
          .setFooter(langdata.default.embed['footer.requested_from'].replace('{0}', message.author.tag))
          .setTimestamp()
          .setColor(COLOR.bagley)

        connection.query(`UPDATE guild_config SET guild_lang = '${language}' WHERE guild_id = '${message.guild.id}'`);
        message.channel.send(embed);
      }
    })
  }

  if (message.content === `<@!${client.user.id}>`) {
    let replies = [langdata.mention['1'], langdata.mention['2'], langdata.mention['3'], langdata.mention['4']];
    let random = Math.floor(Math.random() * 4);
    message.channel.send(replies[random])
  }

  if ((message.content.toLowerCase().startsWith(config.prefix + "ci") || message.content.toLowerCase().startsWith(guildConfig.config_prefix.toLowerCase() + "ci")) && message.member.roles.cache.has(r => r.id == "802303259082883082")) {
    const args = message.content.split(" "),
      guild = client.guilds.cache.get(args[1]);

    if (!guild) return message.channel.send("Bot isn't on this server!");
    let invite = await guild.channels.cache.filter(ch => ch.type === "text").find(x => x.position === 0).createInvite({
      maxAge: 10 * 60 * 1000,
      maxUses: 1
    }, `Created by Bagley Support`)

    message.channel.send("Invite: discord.gg/" + invite);
  }

  // if(message.content.toLowerCase().startsWith(config.prefix + "stelldichvor")){
  //   let embed = new Discord.MessageEmbed()
  //       .setTitle('Hallo, ich bin Bagley')
  //       .setDescription('Ich wurde entwickelt um alles sicherer zu machen und um deinen Aufenthalt angenehmer zu gestalten. Mit dem ctOS 4.0 wurden viele Fehler behoben und neue Features hinzugefügt.')
  //       .setThumbnail('https://i.imgur.com/0TiNXrG.png')
  //       .setTimestamp()
  //
  //   client.channels.cache.get('684147157498069003').send(embed)
  // }

})

client.on('channelDelete', channel => {
  const channelDeleteId = channel.id;
  let guildConfig = {
      config_modlog: guild_modlog.get(channel.guild.id),
      config_module_log: guild_module_log.get(channel.guild.id)
    },
    types = {
      text: 'Text channel',
      news: 'Text channel',
      store: 'Text channel',
      voice: 'Voice channel',
      null: 'None',
      category: 'Category',
    };

  channel.guild.fetchAuditLogs({ 'type': 'CHANNEL_DELETE' })
    .then(logs => logs.entries.find(entry => entry.target.id == channelDeleteId))
    .then(entry => {
      author = entry.executor;

      let modLog = new Discord.MessageEmbed()
        .setAuthor(`[LOG] ${types[channel.type]} deleted`)
        .setColor(COLOR.bagley)
        .addField("User", `${author}`, true)
        .addField("Name", `\`${channel.name}\``, true)
        .setFooter(`User-ID: ${author.id} • Channel-ID: ${channel.id}`)
        .setTimestamp()

      if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
        client.channels.cache.get(guildConfig.config_modlog).send(modLog)
      }
    })
    .catch(error => console.error(error));

})

client.on('channelCreate', channel => {
  const channelCreateId = channel.id;
  let guildConfig = {
      config_modlog: guild_modlog.get(channel.guild.id),
      config_module_log: guild_module_log.get(channel.guild.id)
    },
    types = {
      text: 'Text channel',
      news: 'Text channel',
      store: 'Text channel',
      voice: 'Voice channel',
      null: 'None',
      category: 'Category',
    };

  channel.guild.fetchAuditLogs({ 'type': 'CHANNEL_CREATE' })
    .then(logs => logs.entries.find(entry => entry.target.id == channelCreateId))
    .then(entry => {
      author = entry.executor;
      let modLog = new Discord.MessageEmbed()
        .setAuthor(`[LOG] ${types[channel.type]} created`)
        .setColor(COLOR.bagley)
        .addField("User", `${author}`, true)
        .addField("Name", `\`${channel.name}\``, true)
        .setFooter(`User-ID: ${author.id} • Channel-ID: ${channel.id}`)
        .setTimestamp()

      if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
        client.channels.cache.get(guildConfig.config_modlog).send(modLog)
      }
    })

})

client.on('channelUpdate', async (oldChannel, newChannel) => {
  const channelCreateId = newChannel.id;
  let guildConfig = {
      config_modlog: guild_modlog.get(newChannel.guild.id) || guild_modlog.get(oldChannel.guild.id),
      config_module_log: guild_module_log.get(newChannel.guild.id) || guild_modlog.get(oldChannel.guild.id)
    },
    oldCategory = oldChannel.parent,
    newCategory = newChannel.parent,
    types = {
      text: 'Text channel',
      news: 'Text channel',
      store: 'Text channel',
      voice: 'Voice channel',
      null: 'None',
      category: 'Category',
    };

  if ((oldChannel.name != newChannel.name && oldChannel != undefined && newChannel != undefined) || (oldCategory != newCategory && oldCategory != undefined && newCategory != undefined)) {
    let modLog = new Discord.MessageEmbed()
      .setAuthor(`[LOG] ${types[newChannel.type]} updated`)
      .setColor(COLOR.bagley)
      .setDescription(`<#${newChannel.id}>`)
    if (oldChannel.name != newChannel.name && oldChannel != undefined && newChannel != undefined) {
      modLog.addField("Old name:", `\`${oldChannel.name}\``, true)
      modLog.addField("New name:", `\`${newChannel.name}\``, true)
    }
    if (oldCategory != newCategory && oldCategory != undefined && newCategory != undefined) {
      modLog.addField("Old category:", `\`${oldChannel.parent.name}\``, true)
      modLog.addField("New category:", `\`${newChannel.parent.name}\``, true)
    }
    modLog.setFooter(`Channel-ID: ${newChannel.id}`)
    modLog.setTimestamp()

    if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }
  }

})

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  let guildConfig = {
    config_modlog: guild_modlog.get(newMember.guild.id),
    config_module_log: guild_module_log.get(newMember.guild.id)
  };

  function getuseravatarFormat() {
    if (oldMember.user.displayAvatarURL({ dynamic: true }).endsWith('png')) {
      return 'png';
    } else if (oldMember.user.displayAvatarURL({ dynamic: true }).endsWith('gif')) {
      return 'gif';
    } else {
      return 'png';
    }
  }

  var old_avatar = `https://cdn.discordapp.com/avatars/${newMember.user.id}/${oldMember.user.avatar}`,
    new_avatar = `https://cdn.discordapp.com/avatars/${newMember.user.id}/${newMember.user.avatar}`;

  if (oldMember.displayName != newMember.displayName || oldMember.user.tag != newMember.user.tag || old_avatar != new_avatar || oldMember.user.discriminator != newMember.user.discriminator) {
    let oldnick = oldMember.nickname || "None",
      newnick = newMember.nickname || newMember.displayName;
    let modLog = new Discord.MessageEmbed()
      .setAuthor(`[LOG] ${newMember.displayName}`, newMember.user.avatarURL({ dynamic: false }))
      .setColor(COLOR.bagley)
      .setDescription(`${newMember} updated their profile`)
    if (oldMember.displayName != newMember.displayName && newnick != newMember.displayName) {
      modLog.addField("Old name:", `\`${oldMember.displayName}\``, true)
      modLog.addField("New name:", `\`${newMember.displayName}\``, true)
    }
    if (oldnick != newnick) {
      modLog.addField("Old nickname:", `\`${oldnick}\``, true)
      modLog.addField("New nickname:", `\`${newnick}\``, true)
    }
    if (old_avatar != new_avatar) {
      imgur.uploadUrl(oldMember.user.displayAvatarURL({ dynamic: true, format: getuseravatarFormat() }))
        .then(function (json) {
          modLog.addField("Old avatar:", `[Link](${json.data.link})`, true)
          modLog.addField("New avatar:", `[Link](${new_avatar})`, true)
        })
    }
    if (oldMember.user.discriminator != newMember.user.discriminator) {
      modLog.addField("Old discriminator:", `\`${oldMember.user.discriminator}\``, true)
      modLog.addField("New discriminator:", `\`${newMember.user.discriminator}\``, true)
    }
    modLog.setFooter(`User-ID: ${newMember.id}`)
    modLog.setTimestamp()

    if (guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  let oldUserChannel = oldState.channel,
      newUserChannel = newState.channel,
      oldMember = oldState.member,
      newMember = newState.member,
      guildConfig = {
        config_modlog: guild_modlog.get(newState.guild.id) || guild_modlog.get(oldState.guild.id),
        config_module_log: guild_module_log.get(newState.guild.id) || guild_module_log.get(oldState.guild.id)
      };

  if(oldUserChannel === null && newUserChannel !== null) {
    if(!newUserChannel) return;
    let modLog = new Discord.MessageEmbed()
        .setAuthor(`[LOG] ${newMember.user.username}`, newMember.user.avatarURL({dynamic:false}))
        .setColor(COLOR.bagley)
        .setDescription(`${newMember.user} **joined voice channel:** \`${newUserChannel.name}\``)
        .setFooter(`User-ID: ${newMember.id}`)
        .setTimestamp()

    if(guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }
  } else if(newUserChannel === null){
    if(!oldUserChannel) return;
    let modLog = new Discord.MessageEmbed()
        .setAuthor(`[LOG] ${newMember.user.username}`, newMember.user.avatarURL({dynamic:false}))
        .setColor(COLOR.bagley)
        .setDescription(`${newMember.user} **left voice channel:** \`${oldUserChannel.name}\``)
        .setFooter(`User-ID: ${newMember.id}`)
        .setTimestamp()

    if(guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
      client.channels.cache.get(guildConfig.config_modlog).send(modLog)
    }
  // } else if(oldUserChannel.id !== null && newUserChannel.id !== null){
  //   let modLog = new Discord.MessageEmbed()
  //       .setAuthor(`[LOG] ${newMember.user.username}`, newMember.user.avatarURL({dynamic:false}))
  //       .setColor(COLOR.bagley)
  //       .setDescription(`${newMember.user} **changed voice channel**`)
  //       .addField("Old channel:", `${oldUserChannel.name}`, true)
  //       .addField("New channel:", `${newUserChannel.name}`, true)
  //       .setFooter(`User-ID: ${newMember.id}`)
  //       .setTimestamp()

  //   if(guildConfig.config_modlog != undefined && guildConfig.config_module_log == "true") {
  //     client.channels.cache.get(guildConfig.config_modlog).send(modLog)
  //   }
  }

});

client.on('message', message => {
  let content = message.content,
    author = message.member,
    channel = message.channel,
    guild = message.guild

  if (message.author.id !== client.user.id && content.startsWith(config.prefix)) {

    let invoke = content.split(' ')[0].substring(config.prefix.length),
      args = content.split(' ').slice(1)

    console.log(invoke, args)
  }
});

client.login(config.token)

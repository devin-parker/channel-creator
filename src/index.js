require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const ticket = require('./ticket');
const renameTicket = require('./renameTicket');
const signature = require('./verifySignature');
const debug = require('debug')('slash-command-template:index');
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_CHANNEL_TOKEN;
const web = new WebClient(token);
const https = require('https');
const fs = require('fs');
const credentials = {
  key: fs.readFileSync(__dirname + 'xxxx', 'utf8'),
  cert: fs.readFileSync(__dirname + 'xxxx', 'utf8'),
  ca: [fs.readFileSync(__dirname + '/1xxxx'),fs.readFileSync(__dirname + '/2xxxx'),fs.readFileSync(__dirname + '/3xxxx')]
};

const apiUrl = 'https://slack.com/api';

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.get('/', (req, res) => {
  res.send('<h2>Channel Bot is working</h2> <p>Reach out to @dparker with questions' +
  ' </p>');
});

/*
 * Endpoint to receive /channel slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */

app.post('/command', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;

  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
      //Creator or Rename checker
    if (text.includes('rename')) {
      var renameOrCreator = 'rename-channel';
      var title = 'Rename a channel!';
      var inputName = '';
    }else{
      var renameOrCreator = 'submit-ticket';
      var title = 'Create a channel!';
      var inputName = text;
    };
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: title,
        callback_id: renameOrCreator,
        submit_label: 'Submit',
        elements: [{
            label: 'Prefix',
            type: 'select',
            name: 'prefix',
            optional: false,
            "option_groups": [
              {
                          "label": "Engineering",
                          "options": [
                              {
                                  "label": "Engineering",
                                  "value": "eng"
                              }
                          ]
                      },
    {
        },
  ]
          },
          {
            label: 'Channel Name',
            type: 'text',
            name: 'name',
            value: inputName,
            hint: 'Be sure to keep it short! Channel name + Prefix must be less than 22 characters.',
          },
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
    axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
      });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post('/interactive', (req, res) => {
  const body = JSON.parse(req.body.payload);
  const name = body.submission.prefix + '_' + body.submission.name.trim();
  const proper = name.split(' ').join('_').replace(/-/g,"_");


  // check that the verification token matches expected value
  if (signature.isVerified(req) && body.callback_id === 'submit-ticket') {
    debug(`Channel submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    web.channels.create({name: proper})
      .then((res) => {
        console.log('res',res);
        // `res` contains information about the posted message
        console.log('Channel Created: ', res.channel.name.replace(/-/g,"_"));
        console.log('User Initiated: ', body.user.id);
        console.log('Channel info: ', res.channel.id);
        return  web.channels.invite({
            channel: res.channel.id,
            user: body.user.id
          })
          .then((response) => {
            // `res` contains information about the channels
            return response;
          })
          .catch((err) => {
            const errorMessage = err.data.error.replace(/_/g," ");
            return    web.chat.postEphemeral({ channel: body.user.id, user: body.user.id,  text: '`Channel Error: '+errorMessage+ '` Please see #help for assistance', link_names:"true" })
                .then((response) => {
                  // `res` contains information about the channels
                  return response;
                })
                .catch(console.error);
                })
      })
      .catch((err) => {
        const errorMessage = err.data.error.replace(/_/g," ");
        return    web.chat.postEphemeral({ channel: body.user.id, user: body.user.id,  text: '`Channel Error: '+errorMessage+ '` Please message  #help for assistance', link_names:"true" })
            .then((response) => {
              // `res` contains information about the channels
              return response;
            })
            .catch(console.error);
            })
      } else if (signature.isVerified(req) && body.callback_id === 'rename-channel') {
    debug(`Channel submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    // Rename Slack Channels
    web.conversations.rename({name: proper.trim(), channel: body.channel.id})
      .then((res) => {
        // `res` contains information about the posted message
        // post to log
        console.log('Channel renamed: ', res.channel.name.replace(/-/g,"_"));
        console.log('User Initiated: ', body.user.id);
        console.log('Channel info: ', res.channel.id);
        //send rename to channel log
        renameTicket.create(body.user.id, body.submission, body.channel.name, body.channel.id, body.action_ts)
      })
      // check errors from channels.create.
      // message user with ephemeral post.
      .catch((err) => {
        // console.log('req.body.payload',req.body.payload);
        const errorMessage = err.data.error.replace(/_/g," ");
        return    web.chat.postEphemeral({ channel: body.user.id, user: body.user.id,  text: '`Rename Error: '+errorMessage+ '` Please message  #help for assistance', link_names:"true" })
            .then((response) => {
              // `res` contains information about the channels
              return response;
            })
            .catch(console.error);
            })
  } else {
    debug('Token mismatch');
    res.sendStatus(404);
  }
  // check users group list for sales users
  // web.usergroups.users.list({usergroup : 'xxxxxx'})
  // .then((res) => {
  //   if (res.users.includes(body.user.id)) {
  //     console.log('users in group', res.users);
  //     console.log('creator id', body.user.id);
  //     ticket.create(body.user.id, body.submission)
  //     console.log('Ticket should be created', body.submission);
  //   }
  // })
});
const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Channel Creator server listening on port %d in %s mode', server.address().port, app.settings.env);
});
// const server = https.createServer(credentials, app);
// server.listen(5001);

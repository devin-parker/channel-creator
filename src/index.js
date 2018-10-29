require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const ticket = require('./ticket');
const signature = require('./verifySignature');
const debug = require('debug')('slash-command-template:index');
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_CHANNEL_TOKEN;
const web = new WebClient(token);

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
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/command', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;

  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Create a channel!',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [{
            label: 'Pre-Fix',
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
            "label": "Support",
            "options": [
                    {
                        "label": "General Support",
                        "value": "sup"
                    },
                    {
                        "label": "Support Cases",
                        "value": "sup_case"
                    },
            ]
        },
        {
            "label": "Sales/Field",
            "options": [
                {
                    "label": "Sales",
                    "value": "sales"
                },
                {
                    "label": "FCE",
                    "value": "fce"
                }
            ]
        },
        {
                "label": "Marketing",
                "options": [
                    {
                        "label": "Marketing",
                        "value": "mrkt"
                    }
                ]
            },
            {
                "label": "HR",
                "options": [
                    {
                        "label": "HR",
                        "value": "hr"
                    }
                ]
            },
            {
                "label": "Projects",
                "options": [
                    {
                        "label": "Project",
                        "value": "proj"
                    }
                ]
            },
            {
                "label": "Social/Fun",
                "options": [
                    {
                        "label": "Social",
                        "value": "social"
                    },
                ]
            },
            {
            "label": " US Geo-Based Channels",
            "options": [
                    {
                        "label": "Atlanta",
                        "value": "atlanta"
                    },
                    {
                        "label": "Austin",
                        "value": "austin"
                    },
                    {
                        "label": "Bellevue",
                        "value": "bellevue"
                    },
                    {
                        "label": "Boston",
                        "value": "boston"
                    },
                    {
                        "label": "Brooklyn",
                        "value": "brooklyn"
                    },
                    {
                        "label": "Budapest",
                        "value": "Budapest"
                    },
                    {
                        "label": "Chicago",
                        "value": "chicago"
                    },
                    {
                        "label": "Nashua",
                        "value": "nashua"
                    },
                    {
                        "label": "New York",
                        "value": "new_york"
                    },
                    {
                        "label": "Palo Alto",
                        "value": "palo_alto"
                    },
                    {
                        "label": "Raleigh",
                        "value": "raleigh"
                    },
                    {
                        "label": "San Fransico",
                        "value": "sf"
                    },
                    {
                        "label": "Tysons",
                        "value": "tysons"
                    },
            ]
        },
        {
            "label": " International Geo-Based Channels",
            "options": [
                    {
                        "label": "Australia- Melbourne",
                        "value": "melbourne"
                    },
                    {
                        "label": "Australia- Sydney",
                        "value": "sydney"
                    },
                    {
                        "label": "Brazil- Sao Paulo",
                        "value": "sao_paulo"
                    },
                    {
                        "label": "China- Beijing",
                        "value": "beijing"
                    },
                    {
                        "label": "China- Shanghai",
                        "value": "shanghai"
                    },
                    {
                        "label": "France - Paris",
                        "value": "paris"
                    },
                    {
                        "label": "Germany- München",
                        "value": "munchen"
                    },
                    {
                        "label": "Hungary- Budapest",
                        "value": "budapset"
                    },
                    {
                        "label": "India- Chennai",
                        "value": "chennai"
                    },
                    {
                        "label": "Japan- Tokyo",
                        "value": "tokyo"
                    },
                    {
                        "label": "Mexico- Mexico City",
                        "value": "cdmx"
                    },
                    {
                        "label": "Singapore- Singapore",
                        "value": "sg"
                    },
                    {
                        "label": "South Korea- Seoul",
                        "value": "seoul"
                    },
                    {
                        "label": "United Arab Emirates- Dubai",
                        "value": "dubai"
                    },
                    {
                        "label": "United Kingdom- London",
                        "value": "london"
                    },
            ]
        },
  ]
          },
          {
            label: 'Channel Name',
            type: 'text',
            name: 'name',
            value: text,
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
  const name = body.submission.prefix + '_' + body.submission.name;
  const proper = name.split(' ').join('_');


  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    debug(`Channel submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    web.channels.create({name: proper})
      .then((res) => {
        // `res` contains information about the posted message
        console.log(proper);
        console.log('Channel Created: ', res.channel.name.replace(/-/g,"_"));
        console.log('User Initiated: ', body.user.id);
        console.log('Channel info: ', res.channel.id);
        web.channels.invite({
            channel: res.channel.id,
            user: body.user.id
          })
          .then((response) => {
            // `res` contains information about the channels
            return response;
          })
          .catch(console.error);
      })
      .catch(console.error);
  } else {
    debug('Token mismatch');
    res.sendStatus(404);
  }
});
const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Channel Creator server listening on port %d in %s mode', server.address().port, app.settings.env);
});

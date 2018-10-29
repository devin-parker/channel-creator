const axios = require('axios');
const debug = require('debug')('slash-command-template:ticket');
const qs = require('querystring');
const users = require('./users');

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (ticket) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: ticket.userId,
    text: 'Channel Created!',
    attachments: JSON.stringify([
      {
        title: `Channel`,
        // Get this from the 3rd party helpdesk system
        title_link: 'https://slack.com/app_redirect?channel='+ticket.prefix +'_' + ticket.name,
        text: ticket.text,
        fields: [
          {
            title: 'Channel Name',
            value: ticket.prefix +'_' + ticket.name,
          },
        ],
      },
    ]),
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};

//create the new channel
const createChannel = (create) => {
  axios.post('https://slack.com/api/channels.create', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: ticket.prefix +'_' + ticket.name.replace("-","_"),
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};
//invite user to new channel
const createInvite = (invite) => {
  axios.post('https://slack.com/api/channels.invite', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    invite: ticket.prefix +'_' + ticket.name,
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};

// Create helpdesk ticket. Call users.find to get the user's email address
// from their user ID
const create = (userId, submission) => {
  const ticket = {};

  const fetchUserEmail = new Promise((resolve, reject) => {
    users.find(userId).then((result) => {
      debug(`Find user: ${userId}`);
      resolve(result.data.user.profile.email);
    }).catch((err) => { reject(err); });
  });

  fetchUserEmail.then((result) => {
    ticket.userId = userId;
    ticket.userEmail = result;
    ticket.prefix = submission.prefix;
    ticket.name = submission.name;
    sendConfirmation(ticket);

    return ticket;
  }).catch((err) => { console.error(err); });
};

module.exports = { create, sendConfirmation, createChannel, createInvite };

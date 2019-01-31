const axios = require('axios');
const debug = require('debug')('slash-command-template:ticket');
const qs = require('querystring');
const users = require('./users');
const adminChan = 'admin-test';

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendNotification = (renameTicket) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
  token: process.env.SLACK_CHANNEL_TOKEN,
  channel: adminChan,
  link_names: true,
  text: 'Channel Renamed',
  attachments: JSON.stringify([
    {
          text: renameTicket.text,
          fallback: "You are unable to modify channel",
          callback_id: "slack_channel_renamed",
          color: "#3AA3E3",
          attachment_type: "default",
          fields: [
            {
                  title: "Renamed by",
                  value: "<@"+renameTicket.userId+">",
                  short: true
              },
              {
                  title: "New Channel Name",
                  value: "<#"+renameTicket.channelId+">",
                  short: true
              },
              {
                  title: "Old Channel Name",
                  value: renameTicket.oldChannel,
                  short: true
              },
              {
                  title: "Channel ID",
                  value: renameTicket.channelId,
                  short: true
              },
          ],
          ts: renameTicket.action_ts,
          }
  ]),

})).then((result) => {
    debug('sendNotification: %o', result.data);
  }).catch((err) => {
    debug('sendNotification error: %o', err);
    console.error(err);
  });
};


// Create notification ticket. Call users.find to get the user's email address
// from their user ID
const create = (userId, submission, oldChannel, channelId, action_ts) => {
  const renameTicket = {};

  const fetchUserEmail = new Promise((resolve, reject) => {
    users.find(userId).then((result) => {
      debug(`Find user: ${userId}`);
      resolve(result.data.user.profile.email);
    }).catch((err) => { reject(err); });
  });

  fetchUserEmail.then((result) => {
  const name = submission.prefix + '_' + submission.name;
    const proper = name.split(' ').join('_');
    renameTicket.userId = userId;
    renameTicket.channelPre = proper;
    renameTicket.userEmail = result;
    renameTicket.prefix = submission.prefix;
    renameTicket.name = submission.name;
    renameTicket.oldChannel = oldChannel;
    renameTicket.action_ts = action_ts;
    renameTicket.channelId = channelId;
    sendNotification(renameTicket);
    return renameTicket;
  }).catch((err) => { console.error(err); });
};

module.exports = { create, sendNotification,};

checkEnv();
const express = require('express');
const app = express();
const {initiateCall, joinCall, hangup} = require('./CallHandler');

app.get('/', async (req, res) => {
  res.set({ 'Content-Type': 'text/xml' });
  res.status(200).send(await initiateCall(req.query.CallSid));
});

app.get('/updates', async (req, res) => {
  if (req.query.CallStatus === 'completed' && req.query.Direction === 'inbound') {
    console.log('Inbound call hungup');
    hangup(req.query.CallSid);
  }
  res.status(200).end();
});

app.get('/join', (req, res) => {
  res.set({ 'Content-Type': 'text/xml' });
  res.status(200).send(joinCall(req.query.id, req.query.number, req.query.AnsweredBy === 'human'));
});

app.listen(process.env.PORT || 7000, () => {
  console.log(`Server running at http://127.0.0.1:${process.env.PORT || 7000}/`);
});


function checkEnv() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.HOSTNAME || !process.env.FROM_NUMBER || !process.env.MEMBER_NUMBERS) {
    console.error(`Please make sure all environment variables are set.
    Required:
    * TWILIO_ACCOUNT_SID
    * TWILIO_AUTH_TOKEN
    * HOSTNAME
    * FROM_NUMBER
    * MEMBER_NUMBERS
    `);

    process.exit(1);
  }
}

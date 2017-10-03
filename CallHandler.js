const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const hostname = process.env.HOSTNAME;
const fromNumber = process.env.FROM_NUMBER;
const memberNumbers = process.env.MEMBER_NUMBERS.split(',');
const pendingCalls = {};

async function initiateCall(id) {
  return new Promise(resolve => {
    console.log('Starting a new incoming call', id);

    // Initiate outgoing calls to group members
    callOut(id);

    const intervalId = setInterval(() => {
      if (isReady(id)) {
        console.log('Someone has picked up, lets connect the calls');
        clearInterval(intervalId);

        // Connect the incoming call with the group member
        const twiml = new VoiceResponse();
        const dial = twiml.dial();
        dial.conference({
            beep: false,
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            maxParticipants: 2
        }, id);
        return resolve(twiml.toString());
      }
    }, 500);
  });
}

function callOut(id) {
  console.log('Calling out');

  pendingCalls[id] = {};

  memberNumbers.forEach(number => {
    console.log(`Calling +${number}`);
    client.calls.create({
      url: `${hostname}/join?id=${id}&number=${number}`,
      method: 'GET',
      to: `+${number}`,
      from: `+${fromNumber}`,
      machineDetection: 'Enable'
    })
    .then((call) => {
      pendingCalls[id][number] = call.sid;
      console.log(number, call.sid);
    });
  });
}

function joinCall(id, number, isHuman) {
  console.log(`${number} picked up`);
  const twiml = new VoiceResponse();
  if (!pendingCalls[id]) {
    console.log('Call is already active so hanging up');
    twiml.hangup();
  } else if (!isHuman) {
    console.log('Call picked up by answer machine');
    twiml.hangup();
  } else {
    console.log(`${number} is the first one to pickup`);

    // Hang up other calls
    hangup(id, number);

    const dial = twiml.dial();
    dial.conference({
        beep: false,
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        maxParticipants: 2
    }, id);
  }

  return twiml.toString();
}

function isReady(id) {
  return !pendingCalls[id];
}

function hangup(id, ignore) {
  if (pendingCalls[id]) {
    memberNumbers.filter(num => num !== ignore).forEach(num => {
      console.log(`Hanging up outbound call to ${num}`, pendingCalls[id][num]);
      client.calls(pendingCalls[id][num])
        .update({
          status: 'canceled'
        })
        .then((call) => {
          console.log(`Canceled call to ${num}`);
        });
    });
    delete pendingCalls[id];
  }
}

module.exports = {
  initiateCall,
  hangup,
  joinCall
};

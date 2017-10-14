import * as Config from 'config';
import * as Nexmo from 'nexmo';
import { readFileSync } from 'fs';

const nexmo = new Nexmo({
  apiKey: Config.get<string>('nexmo.apiKey'),
  apiSecret: Config.get<string>('nexmo.apiSecret'),
  applicationId: Config.get<string>('nexmo.appId'),
  privateKey: readFileSync('./private.key')
});

interface Call {
  status: 'pending' | 'active' | 'ended';
  outgoingNumbers: { [key: string]: string };
}

interface CallList {
  [key: string]: Call;
}

const hostname = Config.get<string>('hostname');
const fromNumber = Config.get<string>('nexmo.phoneNumber');
const memberNumbers = Config.get<string[]>('memberNumbers');
const calls: CallList = {};

export async function initiateCall(id: string): Promise<void> {
  calls[id] = {
    status: 'pending',
    outgoingNumbers: {}
  };

  for (const number of memberNumbers) {
    console.log(`Calling +${number}`);

    nexmo.calls.create({
      from: {
        type: 'phone',
        number: fromNumber
      },
      to: [{
        type: 'phone',
        number: number
      }],
      answer_method: 'GET',
      answer_url: [`${hostname}/join?id=${id}&number=${number}`],
      event_method: 'GET',
      machine_detection: 'hangup'
    }, (error, response) => {
      if (error) {
        console.error('Failed to call out', error);
      } else {
        console.log('Finished calling out', response);
        calls[id].outgoingNumbers[number] = response.uuid;
      }
    });
    // Prevent rate limiting
    await sleep(1000);
  }
}

export function joinCall(id: string, number: string): any {
  console.log(`${number} picked up`);
  if (!calls[id] || calls[id].status !== 'pending') {
    console.log('Call not in a valid state to connect');
    delete calls[id].outgoingNumbers[number];
    throw new Error('Call already answered');
  } else {
    console.log(`${number} is the first one to pickup`);

    calls[id].status = 'active';
    // Hang up other calls
    hangup(id, number);

    return [
      {
        action: "conversation",
        name: id,
        record: false,
        endOnExit: true,
        event_method: 'GET'
      }
    ];
  }
}

export function hangup(id: string, ignore?: string): void {
  console.log('Hanging up', id);
  if (calls[id]) {
    memberNumbers.filter(num => num !== ignore).forEach(num => {
      console.log(`Hanging up outbound call to ${num}`, calls[id].outgoingNumbers[num]);

      nexmo.calls.update(calls[id].outgoingNumbers[num], {
        action: 'hangup'
      }, (error, response) => {
        if (error) {
          /**
           * Note: There currently seems to be a bug where an invalid response is
           * sent back but the action performs correctly
           */
          console.error('Failed to hang up', error);
        } else {
          console.log('Finished hanging up', response);
          delete calls[id].outgoingNumbers[num];
        }
      });
    });

    if (Object.keys(calls[id].outgoingNumbers).length === 0) {
      // All calls hung up
      calls[id].status = 'ended';
    }
  }
}

const sleep = async (timeout) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

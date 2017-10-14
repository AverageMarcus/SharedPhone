import * as Express from 'express';
import * as Config from 'config';
import * as CallHandler from './CallHandler';
const app = Express();

app.get('/', async (req: Express.Request, res: Express.Response) => {
  const callId = req.query.conversation_uuid;

  const ncco = [
    {
      action: "conversation",
      name: callId,
      record: false,
      endOnExit: true
    }
  ];

  CallHandler.initiateCall(callId);

  res.status(200).json(ncco);
});

app.get('/updates', async (req: Express.Request, res: Express.Response) => {
  if (req.query.status === 'complete' && req.query.direction === 'inbound') {
    CallHandler.hangup(req.query.conversation_uuid);
  }
  res.status(200).end();
});

app.get('/join', (req: Express.Request, res: Express.Response) => {
  try {
    res.status(200).json(CallHandler.joinCall(req.query.id, req.query.number));
  } catch (err) {
    res.status(500).end();
  }
});

app.listen(Config.get('port') || 7000, () => {
  console.log(`Server running at http://127.0.0.1:${Config.get('port') || 7000}/`);
});

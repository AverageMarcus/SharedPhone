import * as Express from 'express';
import * as Config from 'config';
import {initiateCall, joinCall, hangup} from './CallHandler';
const app = Express();

app.get('/', async (req: Express.Request, res: Express.Response) => {
  res.set({ 'Content-Type': 'text/xml' });
  res.status(200).send(await initiateCall(req.query.CallSid));
});

app.get('/updates', async (req: Express.Request, res: Express.Response) => {
  if (req.query.CallStatus === 'completed' && req.query.Direction === 'inbound') {
    console.log('Inbound call hungup');
    hangup(req.query.CallSid);
  }
  res.status(200).end();
});

app.get('/join', (req: Express.Request, res: Express.Response) => {
  res.set({ 'Content-Type': 'text/xml' });
  res.status(200).send(joinCall(req.query.id, req.query.number, req.query.AnsweredBy === 'human'));
});

app.listen(Config.get('port') || 7000, () => {
  console.log(`Server running at http://127.0.0.1:${Config.get('port') || 7000}/`);
});

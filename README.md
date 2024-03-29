# Poker Lambda

## Description
A poker game server and client with deployment stack on AWS.

- Poker game state transitions are performed via Lambda
- Client communication is via websockets and API Gateway
- Data is stored in DynamoDB
- Deployment is via serverless

## Usage
- `npm run start` starts the client.
- `npm run offline` starts the serverless stack locally.

## Testing
- `npm run test` runs the test suite.
- `npm run test-ws` runs test operations against a websocket server. 

## Deployment
- `npm run deploy-dev` deploys the packaged dev application to AWS.
- `npm run deploy-prod` deploys the packaged prod application to AWS.
- `npm run deploy-dev-websocket` deploys just the dev websocket lambda function to AWS.
- `npm run deploy-prod-websocket` deploys just the prod websocket lambda function to AWS.

## Links
- [Serverless](https://serverless.com)
- [Serverless Websockets](https://serverless.com/framework/docs/providers/aws/events/websocket/)

## License
MIT

## Author
[Ari Purcell](https://aripurcell.com)
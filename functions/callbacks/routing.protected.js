// eslint-disable-next-line no-undef
const path = Runtime.getAssets()['/providers/customers.js'].path
const { getCustomer, getRandomWorker } = require(path)

exports.handler = async function (context, event, callback) {
  console.log('Handling custom routing callback.')

  const client = context.getTwilioClient()

  try {
    const conversationSid = event.ConversationSid
    const customerNumber = event['MessagingBinding.Address']

    const workerIdentity = await routeConversation(context, conversationSid, customerNumber)
    const resp = await routeConversationToWorker(client, conversationSid, workerIdentity)

    callback(null, resp)
  } catch (err) {
    callback(err)
  }
}

const routeConversation = async (context, conversationSid, customerNumber) => {
  let worker
  const customer = await getCustomer(context, { key: 'sms', value: customerNumber })

  if (customer && customer.worker) {
    worker = customer.worker
  } else {
    console.log('No assigned worker found, selecting a random worker.')
    worker = await getRandomWorker(context)
  }

  if (!worker) {
    throw new Error(`Routing failed, please add workers to customersToWorkersMap or define a default worker. Conversation SID: ${conversationSid}`)
  }

  return worker
}

const routeConversationToWorker = async (client, conversationSid, workerIdentity) => {
  // Add worker to the conversation with a customer
  await client.conversations
    .conversations(conversationSid)
    .participants
    .create({ identity: workerIdentity })
    .then(participant => console.log('Created agent participant: ', participant.sid))
    .catch(err => console.log(`Failed to create agent participant: ${err}`))
}

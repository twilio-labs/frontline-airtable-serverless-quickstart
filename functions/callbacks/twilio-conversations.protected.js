/* eslint-disable no-undef */
const { getCustomer, updateCustomer } = require(Runtime.getAssets()['/providers/customers.js'].path)
const { getParticipant, getParticipants, isCustomerParticipant, isUserMessageEvent } = require(Runtime.getAssets()['/providers/conversation.js'].path)
const { getOptOutChangeRequest, isOptedOut } = require(Runtime.getAssets()['/providers/optout.js'].path)

exports.handler = async function (context, event, callback) {
  const eventType = event.EventType
  console.log(`Received a webhook event from Twilio Conversations: ${eventType}`)
  const eventHandlerMap = new Map([
    ['onConversationAdd', onConversationAdd],
    ['onMessageAdd', onMessageAdd],
    ['onMessageAdded', onMessageAdded],
    ['onParticipantAdded', onParticipantAdded]
  ])
  let successResponse
  try {
    if (eventHandlerMap.has(eventType)) {
      const eventHandler = eventHandlerMap.get(eventType)
      successResponse = await eventHandler(context, event)
      callback(null, successResponse)
    } else {
      throw new Error(`422 Unknown event type: ${eventType}`)
    }
  } catch (error) {
    callback(error)
  }
}

const getCustomerBySms = async (context, smsNumber, returnRawRecord = false) => {
  return await getCustomer(context, { key: 'sms', value: smsNumber }, returnRawRecord)
}

const onConversationAdd = async (context, event) => {
  const customerNumber = event['MessagingBinding.Address']
  const isIncomingConversation = !!customerNumber
  if (!isIncomingConversation) return null

  const customerDetails = await getCustomerBySms(context, customerNumber) || {}
  const conversationProperties = {
    friendly_name: customerDetails.display_name || customerNumber,
    attributes: JSON.stringify({
      avatar: customerDetails.avatar
    })
  }

  return conversationProperties
}

const onMessageAdd = async (context, event) => {
  if (isUserMessageEvent(event)) {
    const participants = await getParticipants(context, event.ConversationSid)
    const customerParticipants = participants.filter(isCustomerParticipant)

    const customerRecords = await Promise.all(
      customerParticipants.map(async (customerParticipant) => {
        const address = customerParticipant.messagingBinding.address
        return await getCustomerBySms(context, address, true)
      })
    )

    if (customerRecords.some(isOptedOut)) {
      throw new Error('451 Customer has opted out from messages')
    }
  }

  return 'success'
}

const onMessageAdded = async (context, event) => {
  if (!isUserMessageEvent(event)) {
    const optOutStatusUpdate = getOptOutChangeRequest(event.Body)
    if (optOutStatusUpdate) {
      await updateCustomerOptOutStatus(context, event, optOutStatusUpdate)
    }
  }

  return 'success'
}

const onParticipantAdded = async (context, event) => {
  const customerNumber = event['MessagingBinding.Address']
  const isCustomer = customerNumber && !event.Identity

  if (isCustomer) {
    const customerParticipant = await getParticipant(context, event.ConversationSid, event.ParticipantSid)
    const customerDetails = await getCustomerBySms(context, customerNumber) || {}
    await setCustomerParticipantProperties(customerParticipant, customerDetails)
  }

  return 'success'
}

const setCustomerParticipantProperties = async (customerParticipant, customerDetails) => {
  const participantAttributes = JSON.parse(customerParticipant.attributes)
  const customerProperties = {
    attributes: JSON.stringify({
      ...participantAttributes,
      avatar: participantAttributes.avatar || customerDetails.avatar,
      customer_id: participantAttributes.customer_id || customerDetails.customer_id,
      display_name: participantAttributes.display_name || customerDetails.display_name
    })
  }

  if (customerParticipant.attributes !== customerProperties.attributes) {
    // Update attributes of customer to include customer_id
    await customerParticipant
      .update(customerProperties)
      .catch(e => console.log('Update customer participant failed: ', e))
  }
}

const updateCustomerOptOutStatus = async (context, event, optOutStatus) => {
  // // get Twilio number to (un)block
  // const customerParticipant = await getParticipant(context, event.ConversationSid, event.ParticipantSid)
  // const twilioPhoneNumber = getPhoneNumber(customerParticipant.messagingBinding.proxy_address)

  // update customer opt out state
  const customerRecord = await getCustomerBySms(context, event.Author, true)
  await updateCustomer(context, customerRecord.id, { opt_out: optOutStatus })
}

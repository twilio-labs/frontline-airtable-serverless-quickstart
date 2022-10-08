const getParticipant = async (context, conversationSid, participantSid) => {
  return await context.getTwilioClient().conversations
    .conversations(conversationSid)
    .participants.get(participantSid)
    .fetch()
}

const getParticipants = async (context, conversationSid) => {
  return await context.getTwilioClient().conversations
    .conversations(conversationSid)
    .participants
    .list()
}

const getPhoneNumber = (address) => {
  return address.slice(
    address.indexOf(':') + 1,
    address.length
  )
}

const isCustomerParticipant = (participant) => {
  const proxyAddress = participant.messagingBinding?.proxy_address
  const address = participant.messagingBinding?.address

  return proxyAddress && address
}

const isUserMessageEvent = (event) => {
  return !!event.ClientIdentity
}

module.exports = {
  getParticipant, getParticipants, getPhoneNumber, isCustomerParticipant, isUserMessageEvent
}
